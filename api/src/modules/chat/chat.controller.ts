import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Req,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';
import { ChatService } from './chat.service';
import { RateLimitService } from './rate-limit.service';
import { SettingsService } from '../settings/settings.service';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/** Portfolio de un solo dueño: todo el contenido cuelga del usuario 1. */
const OWNER_USER_ID = 1;

class ChatDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  mode?: string; // 'arquitecto' o 'asistente'

  @IsString()
  @IsOptional()
  locale?: string; // idioma de la interfaz del visitante ('es', 'en')
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private chatService: ChatService,
    private rateLimitService: RateLimitService,
    private settingsService: SettingsService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @ApiOperation({ summary: 'Enviar mensaje al AI (streaming)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', example: '¿Cuál es la arquitectura de este proyecto?' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Respuesta en streaming' })
  @ApiResponse({ status: 403, description: 'Free tier agotado' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async chat(@Body() dto: ChatDto, @Res() res: Response, @Req() req: Request) {
    const clientIp = getClientIp(req);
    const isOwner = await this.isOwner(req);
    const limit = this.rateLimitService.FREE_TIER_LIMIT;

    // El dueño consulta su propio portfolio sin límite; el resto tiene free tier.
    if (!isOwner) {
      const freeTierStatus = await this.rateLimitService.checkLimit(clientIp);

      if (!freeTierStatus.allowed) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(HttpStatus.FORBIDDEN);
        res.write(await this.buildLimitReachedMessage(limit, freeTierStatus.resetIn));
        res.end();
        return;
      }
    }

    // Configurar headers para streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(HttpStatus.OK);

    let remaining: number | null = null;

    try {
      if (!isOwner) {
        await this.rateLimitService.incrementUsage(clientIp);
        const status = await this.rateLimitService.checkLimit(clientIp);
        remaining = status.remaining;
      }

      for await (const chunk of this.chatService.chat(
        dto.prompt,
        dto.mode,
        OWNER_USER_ID,
        dto.locale,
      )) {
        res.write(chunk);
      }

      if (remaining !== null && remaining > 0) {
        res.write(`\n\n---\n💡 _Consultas restantes hoy: ${remaining}/${limit}_`);
      }
    } catch (error) {
      res.write(`Error: ${error.message}`);
    } finally {
      res.end();
    }
  }

  @Post('summary')
  @ApiOperation({ summary: 'Generar resumen de contenido' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Contenido a resumir' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Resumen generado' })
  async generateSummary(@Body() dto: { content: string }) {
    const summary = await this.chatService.generateSummary(dto.content);
    return { summary };
  }

  /**
   * ¿La request viene del dueño logueado?
   *
   * El cliente SvelteKit inyecta `Authorization: Bearer <accessToken>` en todo
   * `/api/*` cuando hay sesión (ver `hooks.server.ts`), así que alcanza con
   * validar el JWT. Cualquier token inválido o vencido cae al free tier.
   */
  private async isOwner(req: Request): Promise<boolean> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return false;

    try {
      const payload = await this.jwtService.verifyAsync(header.slice(7), {
        secret: this.configService.get('JWT_SECRET'),
      });
      return payload?.role === 'admin';
    } catch {
      return false;
    }
  }

  /**
   * Mensaje de free tier agotado. En vez de pedirle una API key al visitante,
   * le damos los datos de contacto reales, leídos de la parametría.
   */
  private async buildLimitReachedMessage(limit: number, resetIn?: number): Promise<string> {
    const lines = [`🚫 Llegaste al límite de ${limit} consultas diarias.`];

    if (resetIn) {
      const hours = Math.floor(resetIn / 3600);
      const minutes = Math.floor((resetIn % 3600) / 60);
      lines.push(`⏰ Se reinicia en: ${hours}h ${minutes}m`);
    }

    try {
      const settings = await this.settingsService.getAsMap(OWNER_USER_ID);
      const contacts: Array<[string, string | undefined]> = [
        ['📧', settings.get('contact_email_primary') || settings.get('owner_email')],
        ['🐙', settings.get('social_github')],
        ['💼', settings.get('social_linkedin')],
        ['🌐', settings.get('social_website')],
      ];
      const contactLines = contacts
        .filter(([, value]) => Boolean(value?.trim()))
        .map(([icon, value]) => `  ${icon} ${value!.trim()}`);

      if (contactLines.length > 0) {
        lines.push('', '¿Querés seguir la charla directamente?', ...contactLines);
      }

      const cta = settings.get('contact_cta')?.trim();
      if (cta) lines.push('', cta);
    } catch (error) {
      // Sin datos de contacto el mensaje sigue siendo válido: no rompemos por esto.
      this.logger.warn(`No se pudo leer la parametría de contacto: ${error.message}`);
    }

    return lines.join('\n');
  }
}
