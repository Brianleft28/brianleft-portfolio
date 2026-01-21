import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { Throttle } from '@nestjs/throttler';

class ChatDto {
  prompt: string;
}

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @ApiOperation({ summary: 'Enviar mensaje a TorvaldsAi (streaming)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', example: '¿Cuál es la arquitectura de este proyecto?' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Respuesta en streaming' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async chat(@Body() dto: ChatDto, @Res() res: Response) {
    // Configurar headers para streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(HttpStatus.OK);

    try {
      // Generar respuesta con streaming
      for await (const chunk of this.chatService.chat(dto.prompt)) {
        res.write(chunk);
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
