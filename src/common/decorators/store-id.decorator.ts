import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const StoreId = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.storeId as string | undefined;
});
