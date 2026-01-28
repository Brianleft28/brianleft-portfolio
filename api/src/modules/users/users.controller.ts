import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario actual' })
  @ApiResponse({ status: 200, description: 'Datos del usuario' })
  async getMe(@Req() req: any) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      return null;
    }

    // No devolver datos sensibles
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      subdomain: user.subdomain,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil del usuario actual' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'nuevo@email.com' },
        displayName: { type: 'string', example: 'Mi Nombre' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  @ApiResponse({ status: 409, description: 'Email ya en uso' })
  async updateMe(
    @Req() req: any,
    @Body() body: { email?: string; displayName?: string },
  ) {
    const updatedUser = await this.usersService.updateProfile(req.user.sub, body);
    
    if (!updatedUser) {
      return null;
    }

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      emailVerified: updatedUser.emailVerified,
      displayName: updatedUser.displayName,
      subdomain: updatedUser.subdomain,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      message: body.email ? 'Email actualizado. Requiere verificación.' : 'Perfil actualizado.',
    };
  }
}
