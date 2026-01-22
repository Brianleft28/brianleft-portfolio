import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Headers,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ChatService } from './chat.service';
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

// Free tier: 5 intentos por IP usando la key del servidor
const FREE_TIER_LIMIT = 5;
const FREE_TIER_RESET_MS = 24 * 60 * 60 * 1000; // 24 horas

// Almacenamiento de intentos por IP (en producción usar Redis)
const ipUsageMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkFreeTier(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const usage = ipUsageMap.get(ip);

  // Si no hay registro o expiró, crear uno nuevo
  if (!usage || now > usage.resetAt) {
    ipUsageMap.set(ip, { count: 0, resetAt: now + FREE_TIER_RESET_MS });
    return { allowed: true, remaining: FREE_TIER_LIMIT };
  }

  // Verificar límite
  if (usage.count >= FREE_TIER_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: FREE_TIER_LIMIT - usage.count };
}

function incrementUsage(ip: string): void {
  const usage = ipUsageMap.get(ip);
  if (usage) {
    usage.count++;
  }
}

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @ApiOperation({ summary: 'Enviar mensaje al AI (streaming)' })
  @ApiHeader({
    name: 'X-Gemini-Api-Key',
    description:
      'API key de Gemini del usuario (opcional). Si no se provee, usa la del servidor con límite de 5 intentos.',
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

    // Si no tiene key propia, verificar free tier
    if (!hasOwnKey) {
      const freeTierStatus = checkFreeTier(clientIp);

      if (!freeTierStatus.allowed) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(HttpStatus.FORBIDDEN);
        res.write(`🚫 Has agotado tus ${FREE_TIER_LIMIT} intentos gratuitos del día.\n\n`);
        res.write(`Para seguir usando el asistente AI, configura tu propia API key de Gemini:\n\n`);
        res.write(`  apikey set TU_API_KEY\n\n`);
        res.write(`Obtené una key gratis en: https://aistudio.google.com/apikey\n\n`);
        res.write(`Tip: Usá "apikey -h" para más información.`);
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
        incrementUsage(clientIp);
        const remaining = checkFreeTier(clientIp).remaining;
        // Agregar info de intentos restantes al final
        showRemaining = remaining > 0;
      }

      // Generar respuesta con streaming (usa la key del usuario si está disponible)
      const userId = dto.userId || 1; // Default to admin user for public endpoints
      for await (const chunk of this.chatService.chat(dto.prompt, userApiKey, dto.mode, userId)) {
        res.write(chunk);
      }

      // Mostrar intentos restantes si usa free tier
      if (!hasOwnKey && showRemaining) {
        const remaining = checkFreeTier(clientIp).remaining;
        res.write(`\n\n---\n💡 _Intentos gratuitos restantes: ${remaining}/${FREE_TIER_LIMIT}_`);
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
