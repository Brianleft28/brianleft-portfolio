import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Headers,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ChatService } from './chat.service';
import { RateLimitService } from './rate-limit.service';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class ChatDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  mode?: string; // 'arquitecto' o 'asistente'

  @IsOptional()
  userId?: number; // ID del usuario (default: 1 para endpoints públicos)
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
  constructor(
    private chatService: ChatService,
    private rateLimitService: RateLimitService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @ApiOperation({ summary: 'Enviar mensaje al AI (streaming)' })
  @ApiHeader({
    name: 'X-Gemini-Api-Key',
    description:
      'API key de Gemini del usuario (opcional). Si no se provee, usa la del servidor con límite de 15 intentos/día.',
    required: false,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', example: '¿Cuál es la arquitectura de este proyecto?' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Respuesta en streaming' })
  @ApiResponse({ status: 403, description: 'Free tier agotado - requiere API key propia' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async chat(
    @Body() dto: ChatDto,
    @Res() res: Response,
    @Req() req: Request,
    @Headers('X-Gemini-Api-Key') userApiKey?: string,
  ) {
    const clientIp = getClientIp(req);
    const hasOwnKey = userApiKey && userApiKey.length > 20;
    const FREE_TIER_LIMIT = this.rateLimitService.FREE_TIER_LIMIT;

    // Si no tiene key propia, verificar free tier
    if (!hasOwnKey) {
      const freeTierStatus = await this.rateLimitService.checkLimit(clientIp);

      if (!freeTierStatus.allowed) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(HttpStatus.FORBIDDEN);
        res.write(`🚫 Has agotado tus ${FREE_TIER_LIMIT} intentos gratuitos del día.\n\n`);
        res.write(`Para seguir usando el asistente AI, configura tu propia API key de Gemini:\n\n`);
        res.write(`  apikey set TU_API_KEY\n\n`);
        res.write(`Obtené una key gratis en: https://aistudio.google.com/apikey\n\n`);
        res.write(`Tip: Usá "apikey -h" para más información.`);
        if (freeTierStatus.resetIn) {
          const hours = Math.floor(freeTierStatus.resetIn / 3600);
          const minutes = Math.floor((freeTierStatus.resetIn % 3600) / 60);
          res.write(`\n\n⏰ Se reinicia en: ${hours}h ${minutes}m`);
        }
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

    let showRemaining = false;

    try {
      // Incrementar contador si usa free tier (antes de procesar)
      if (!hasOwnKey) {
        await this.rateLimitService.incrementUsage(clientIp);
        const status = await this.rateLimitService.checkLimit(clientIp);
        // Agregar info de intentos restantes al final
        showRemaining = status.remaining > 0;
      }

      // Generar respuesta con streaming (usa la key del usuario si está disponible)
      const userId = dto.userId || 1; // Default to admin user for public endpoints
      for await (const chunk of this.chatService.chat(dto.prompt, userApiKey, dto.mode, userId)) {
        res.write(chunk);
      }

      // Mostrar intentos restantes si usa free tier
      if (!hasOwnKey && showRemaining) {
        const status = await this.rateLimitService.checkLimit(clientIp);
        res.write(`\n\n---\n💡 _Intentos gratuitos restantes: ${status.remaining}/${FREE_TIER_LIMIT}_`);
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
}
