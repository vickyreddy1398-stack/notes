import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { publicProcedure, router } from "../../trpc/trpc";
import { createUsersService } from "./users.service";
import { signUpInput } from "./users.types";

const service = createUsersService(db);
export const usersRouter = router({
  signUp: publicProcedure.input(signUpInput).mutation(async ({ input, ctx }) => {
    try {
      const result = await service.signUp(input);
      ctx.setSession?.(result.session.token);
      return {
        user: result.user,
        session: {
          id: result.session.id,
          expiresAt: result.session.expiresAt,
          createdAt: result.session.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("unique"))
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account already exists for this email",
        });
      throw error;
    }
  }),
  me: publicProcedure.query(({ ctx }) => (ctx.userId ? { id: ctx.userId } : null)),
});
