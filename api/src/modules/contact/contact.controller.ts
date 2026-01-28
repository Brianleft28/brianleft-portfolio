import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SettingsService } from '../settings/settings.service';

interface ContactDto {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private configService: ConfigService,
    private settingsService: SettingsService,
  ) {
    // Configurar transporter de nodemailer si hay credenciales SMTP
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPass = this.configService.get('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(this.configService.get('SMTP_PORT') || '587'),
        secure: this.configService.get('SMTP_SECURE') === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensaje de contacto al owner' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'message'],
      properties: {
        name: { type: 'string', example: 'Juan Pérez' },
        email: { type: 'string', example: 'juan@example.com' },
        subject: { type: 'string', example: 'Consulta sobre proyecto' },
        message: { type: 'string', example: 'Hola, me interesa tu trabajo...' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Mensaje enviado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async sendContact(@Body() dto: ContactDto) {
    // Validaciones básicas
    if (!dto.name?.trim()) {
      throw new BadRequestException('El nombre es requerido');
    }
    if (!dto.email?.trim() || !dto.email.includes('@')) {
      throw new BadRequestException('Email inválido');
    }
    if (!dto.message?.trim()) {
      throw new BadRequestException('El mensaje es requerido');
    }

    // Obtener email del owner desde settings (usuario 1 por defecto)
    // TODO: Soportar multi-tenant
    const ownerEmailSetting = await this.settingsService.findByKey('owner_email', 1)
      || await this.settingsService.findByKey('contact_email_primary', 1);
    const ownerNameSetting = await this.settingsService.findByKey('owner_name', 1);
    
    const ownerEmail = ownerEmailSetting?.value || this.configService.get('CONTACT_EMAIL');
    const ownerName = ownerNameSetting?.value || 'Portfolio Owner';

    if (!ownerEmail) {
      console.error('[Contact] No hay email de destino configurado');
      throw new BadRequestException('El formulario de contacto no está configurado');
    }

    const subject = dto.subject?.trim() || `Nuevo mensaje de ${dto.name}`;

    // Si no hay transporter, loguear el mensaje (modo desarrollo)
    if (!this.transporter) {
      console.log('═'.repeat(60));
      console.log('[DEV] Mensaje de contacto recibido:');
      console.log(`  De: ${dto.name} <${dto.email}>`);
      console.log(`  Para: ${ownerName} <${ownerEmail}>`);
      console.log(`  Asunto: ${subject}`);
      console.log(`  Mensaje: ${dto.message}`);
      console.log('═'.repeat(60));
      
      return { 
        success: true, 
        message: 'Mensaje recibido (modo desarrollo - no se envió email)',
        dev: true 
      };
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM') || '"Portfolio Contact" <noreply@portfolio.dev>',
        replyTo: `"${dto.name}" <${dto.email}>`,
        to: ownerEmail,
        subject: `📬 ${subject}`,
        html: this.buildEmailTemplate(dto, ownerName),
        text: this.buildPlainText(dto),
      });

      console.log(`[Contact] Email enviado a ${ownerEmail} desde ${dto.email}`);

      return { success: true, message: 'Mensaje enviado correctamente' };
    } catch (error) {
      console.error('[Contact] Error enviando email:', error);
      throw new BadRequestException('Error al enviar el mensaje. Intenta de nuevo.');
    }
  }

  private buildEmailTemplate(dto: ContactDto, ownerName: string): string {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0d1a; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%); padding: 30px; text-align: center; border-bottom: 2px solid #00ff00;">
          <h1 style="color: #00ff00; margin: 0; font-size: 24px;">📬 Nuevo mensaje</h1>
          <p style="color: #888; margin: 10px 0 0;">desde tu portfolio</p>
        </div>
        
        <div style="padding: 30px;">
          <div style="background: #1a1a2e; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #888; padding: 8px 0; width: 80px;">De:</td>
                <td style="color: #00ff00; padding: 8px 0; font-weight: bold;">${dto.name}</td>
              </tr>
              <tr>
                <td style="color: #888; padding: 8px 0;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${dto.email}" style="color: #4da6ff;">${dto.email}</a></td>
              </tr>
              <tr>
                <td style="color: #888; padding: 8px 0;">Asunto:</td>
                <td style="color: #e0e0e0; padding: 8px 0;">${dto.subject || 'Sin asunto'}</td>
              </tr>
            </table>
          </div>

          <div style="background: #1a1a2e; border-radius: 8px; padding: 20px; border-left: 3px solid #00ff00;">
            <p style="color: #888; margin: 0 0 10px; font-size: 12px; text-transform: uppercase;">Mensaje:</p>
            <p style="color: #e0e0e0; margin: 0; line-height: 1.6; white-space: pre-wrap;">${dto.message}</p>
          </div>

          <div style="margin-top: 30px; text-align: center;">
            <a href="mailto:${dto.email}?subject=Re: ${dto.subject || 'Tu mensaje'}" 
               style="display: inline-block; background: #00ff00; color: #0d0d1a; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Responder
            </a>
          </div>
        </div>

        <div style="background: #0a0a14; padding: 20px; text-align: center; border-top: 1px solid #1a1a2e;">
          <p style="color: #666; margin: 0; font-size: 12px;">
            Este mensaje fue enviado desde el formulario de contacto de tu portfolio.
          </p>
        </div>
      </div>
    `;
  }

  private buildPlainText(dto: ContactDto): string {
    return `
Nuevo mensaje de contacto
========================

De: ${dto.name}
Email: ${dto.email}
Asunto: ${dto.subject || 'Sin asunto'}

Mensaje:
${dto.message}

---
Enviado desde tu portfolio
    `.trim();
  }
}
