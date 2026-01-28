import { ApiProperty } from '@nestjs/swagger';

export class TokensDto {
  @ApiProperty({ description: 'JWT access token (15 min)' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token (7 días)' })
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Tiempo de expiración en segundos' })
  expiresIn: number;
}
