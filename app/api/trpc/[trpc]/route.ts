import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createTRPCContext } from '@/server/trpc';

const handler = (req: Request) => {
  try {
    return fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: createTRPCContext,
      onError:
        process.env.NODE_ENV === 'development'
          ? ({ path, error }) => {
              console.error(
                `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`,
              );
              console.error("Error stack:", error.stack);
            }
          : undefined,
    });
  } catch (error) {
    console.error("tRPC handler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export { handler as GET, handler as POST };

