import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { UsersService, CreateUserDto } from '../users/users.service';
import { SettingsService } from '../settings/settings.service';
import { FilesystemService } from '../filesystem/filesystem.service';
import { LoginDto } from './dto/login.dto';
import { TokensDto } from './dto/tokens.dto';
import { User } from '../../entities/user.entity';

export interface RegisterDto {
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface RegisterResult {
  user: User;
  password: string; // Contraseña en texto plano para mostrar al usuario
  subdomain: string;
  message: string;
  requiresVerification: boolean;
}

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private usersService: UsersService,
    private settingsService: SettingsService,
    private filesystemService: FilesystemService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Configurar transporter de email si hay credenciales
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPass = this.configService.get('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.configService.get('SMTP_PORT') || 587,
        secure: this.configService.get('SMTP_SECURE') === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }
  }

  async login(loginDto: LoginDto): Promise<TokensDto> {
    const { username, password } = loginDto;

    // Buscar usuario
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar tokens
    const tokens = await this.generateTokens(user.id, user.username, user.role);

    // Guardar refresh token hasheado
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refresh(userId: number, refreshToken: string): Promise<TokensDto> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Acceso denegado');
    }

    // Verificar refresh token
    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Acceso denegado');
    }

    // Generar nuevos tokens
    const tokens = await this.generateTokens(user.id, user.username, user.role);

    // Actualizar refresh token
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: number): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  /**
   * Registra un nuevo usuario con todo el setup inicial
   * - Crea el usuario en la DB
   * - Inicializa el filesystem (C:, proyectos, apps)
   * - Crea los settings por defecto
   * - Envía email de verificación
   */
  async register(dto: RegisterDto): Promise<RegisterResult> {
    const firstName = dto.firstName || dto.username;
    const lastName = dto.lastName || '';
    const displayName = `${firstName} ${lastName}`.trim();
    const role = dto.role || 'Developer';

    // 1. Crear usuario
    const { user, plainPassword } = await this.usersService.createUser({
      username: dto.username,
      email: dto.email,
      password: dto.password,
      displayName,
    });

    // 2. Inicializar filesystem
    await this.filesystemService.initializeForUser(user.id);

    // 3. Crear settings por defecto
    await this.settingsService.initializeForUser(user.id, {
      ownerName: displayName,
      ownerFirstName: firstName,
      ownerLastName: lastName,
      ownerRole: role,
      email: dto.email,
    });

    // 4. Generar código de verificación y enviar email
    const verificationCode = await this.usersService.setVerificationCode(user.id);
    const emailSent = await this.sendVerificationEmail(dto.email, verificationCode, firstName);

    return {
      user,
      password: plainPassword,
      subdomain: user.subdomain || user.username,
      message: emailSent 
        ? `Usuario creado. Se envió un código de verificación a ${dto.email}`
        : `Usuario creado. Tu portfolio estará disponible en: ${user.subdomain}.tudominio.com`,
      requiresVerification: true,
    };
  }

  /**
   * Envía email con código de verificación
   */
  async sendVerificationEmail(email: string, code: string, name: string): Promise<boolean> {
    if (!this.transporter) {
      console.log(`[DEV] Código de verificación para ${email}: ${code}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM') || '"Portfolio Dev" <noreply@portfolio.dev>',
        to: email,
        subject: '🔐 Verifica tu cuenta - Portfolio Dev',
        html: `
          <div style="font-family: 'Courier New', monospace; background: #0d0d1a; color: #00ff00; padding: 30px; max-width: 500px; margin: 0 auto;">
            <h1 style="color: #00ff00; border-bottom: 1px solid #00ff00; padding-bottom: 10px;">
              Bienvenido, ${name}! 👋
            </h1>
            <p style="color: #e0e0e0; font-size: 16px;">
              Tu código de verificación es:
            </p>
            <div style="background: #1a1a2e; border: 2px solid #00ff00; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 32px; letter-spacing: 8px; color: #00ff00; font-weight: bold;">
                ${code}
              </span>
            </div>
            <p style="color: #888; font-size: 14px;">
              Este código expira en 15 minutos.
            </p>
            <p style="color: #888; font-size: 14px;">
              Ingresa el código en la terminal con:<br>
              <code style="background: #1a1a2e; padding: 4px 8px; border-radius: 4px; color: #00ff00;">
                verify ${code}
              </code>
            </p>
            <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Si no solicitaste esta cuenta, ignora este email.
            </p>
          </div>
        `,
      });
      return true;
    } catch (error) {
      console.error('Error enviando email:', error);
      return false;
    }
  }

  /**
   * Verifica el código de email
   */
  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new BadRequestException('Email no encontrado');
    }

    if (user.emailVerified) {
      return { success: true, message: 'Email ya verificado' };
    }

    const verified = await this.usersService.verifyEmail(user.id, code);

    if (!verified) {
      throw new BadRequestException('Código inválido o expirado');
    }

    return { success: true, message: 'Email verificado exitosamente' };
  }

  /**
   * Reenvía el código de verificación
   */
  async resendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new BadRequestException('Email no encontrado');
    }

    if (user.emailVerified) {
      return { success: false, message: 'Email ya verificado' };
    }

    const code = await this.usersService.setVerificationCode(user.id);
    await this.sendVerificationEmail(email, code, user.displayName || user.username);

    return { success: true, message: 'Código reenviado' };
  }

  private async generateTokens(
    userId: number,
    username: string,
    role: string,
  ): Promise<TokensDto> {
    const payload = { sub: userId, username, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutos en segundos
    };
  }
}
