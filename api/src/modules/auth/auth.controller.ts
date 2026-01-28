import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService, RegisterDto } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TokensDto } from './dto/tokens.dto';
import { JwtRefreshGuard } from '../../guards/jwt-refresh.guard';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso', type: TokensDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto): Promise<TokensDto> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario (crear portfolio)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'email'],
      properties: {
        username: { type: 'string', example: 'johndoe', description: 'Username único' },
        email: { type: 'string', example: 'john@example.com', description: 'Email único' },
        password: { type: 'string', description: 'Contraseña (opcional, se genera automáticamente)' },
        firstName: { type: 'string', example: 'John', description: 'Nombre' },
        lastName: { type: 'string', example: 'Doe', description: 'Apellido' },
        role: { type: 'string', example: 'Full Stack Developer', description: 'Rol/Título profesional' },
      },
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuario registrado exitosamente',
    schema: {
      type: 'object',
      properties: {
        user: { type: 'object' },
        password: { type: 'string', description: 'Contraseña generada (guardar de forma segura)' },
        subdomain: { type: 'string', description: 'Subdomain del portfolio' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Username o email ya existe' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renovar access token' })
  @ApiResponse({ status: 200, description: 'Tokens renovados', type: TokensDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(@Req() req: any): Promise<TokensDto> {
    const { sub: userId, refreshToken } = req.user;
    return this.authService.refresh(userId, refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada' })
  async logout(@Req() req: any): Promise<{ message: string }> {
    await this.authService.logout(req.user.sub);
    return { message: 'Sesión cerrada correctamente' };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar email con código' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'code'],
      properties: {
        email: { type: 'string', example: 'john@example.com' },
        code: { type: 'string', example: '123456', description: 'Código de 6 dígitos' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Email verificado' })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado' })
  async verifyEmail(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmail(body.email, body.code);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar código de verificación' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'john@example.com' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Código reenviado' })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationCode(body.email);
  }
}
