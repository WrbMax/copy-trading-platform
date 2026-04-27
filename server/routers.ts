import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { exchangeRouter } from "./routers/exchange";
import { strategyRouter } from "./routers/strategy";
import { userRouter } from "./routers/user";


export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  exchange: exchangeRouter,
  strategy: strategyRouter,
  user: userRouter,

});

export type AppRouter = typeof appRouter;
