import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser } from "../application/ports/auth-provider.interface";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
