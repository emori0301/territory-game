import { createTRPCRouter } from '../trpc';

export const appRouter = createTRPCRouter({
  // ルーターをここに追加
});

export type AppRouter = typeof appRouter;

