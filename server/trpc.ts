import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';

export const createTRPCContext = async () => {
  return {};
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  // transformer: superjson, // 一時的に無効化（2次元配列の問題を回避）
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

