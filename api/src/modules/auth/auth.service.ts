import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private settingsService: SettingsService,
    private filesystemService: FilesystemService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

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

    return {
      user,
      password: plainPassword,
      subdomain: user.subdomain || user.username,
      message: `Usuario creado exitosamente. Tu portfolio estará disponible en: ${user.subdomain}.tudominio.com`,
    };
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
