import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Throttle específico para el login, que NO tiene lockout ni límite propio:
 * sin esto, el endpoint acepta fuerza bruta ilimitada contra el único usuario
 * dueño. Se aplica sólo a `POST /auth/login` (ver AuthController).
 *
 * La app corre detrás de nginx, así que `req.ip` es la IP del proxy y throttlear
 * por ahí limitaría a todos los visitantes juntos. Igual que `getClientIp` del
 * chat, tomamos la primera IP de `x-forwarded-for` para trackear por cliente real.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
