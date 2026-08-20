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
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TokensDto } from './dto/tokens.dto';
import { JwtRefreshGuard } from '../../guards/jwt-refresh.guard';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { LoginThrottlerGuard } from '../../guards/login-throttler.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Freno anti-fuerza-bruta: máx ~6 intentos/min por IP. El login no tiene lockout
  // propio, así que este throttle es la única barrera. Endurece los tres límites
  // nombrados del ThrottlerModule sólo para esta ruta.
  @UseGuards(LoginThrottlerGuard)
  @Throttle({
    short: { limit: 2, ttl: 1000 },
    medium: { limit: 4, ttl: 10000 },
    long: { limit: 6, ttl: 60000 },
  })
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso', type: TokensDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos, reintentá más tarde' })
  async login(@Body() loginDto: LoginDto): Promise<TokensDto> {
    return this.authService.login(loginDto);
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

}
