import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtUser = {
  sub: number;
  email: string;
  role: 'ADMIN' | 'EDITOR';
};

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): JwtUser => {
  return context.switchToHttp().getRequest().user;
});
