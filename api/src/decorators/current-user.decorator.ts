import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  sub: number;
  username: string;
  role: string;
}

/**
 * Decorator para extraer el usuario del JWT
 * Uso: @CurrentUser() user: AuthUser
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    return data ? user?.[data] : user;
  },
);

/**
 * Shorthand para obtener solo el userId
 * Uso: @UserId() userId: number
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.sub;
  },
);
