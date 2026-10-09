import { TRPCError } from "@trpc/server";
import { env } from "../../env";
import { publicProcedure, router } from "../../trpc/trpc";
import { createUsersService, sessionMaxAge } from "./users.service";
import { signInInput, signUpInput } from "./users.types";

export const usersRouter = router({
  signIn: publicProcedure.input(signInInput).mutation(async ({ input, ctx }) => {
    if (!ctx.db || !ctx.res) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { user, session } = await createUsersService(ctx.db).signIn(input);
    ctx.res.cookie("session", session.token, {
      maxAge: sessionMaxAge * 1000,
      expires: session.expiresAt,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
    });
    return { id: user.id, email: user.email };
  }),
  signUp: publicProcedure.input(signUpInput).mutation(async ({ input, ctx }) => {
    if (!ctx.db || !ctx.res) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { user, session } = await createUsersService(ctx.db).signUp(input);
    ctx.res.cookie("session", session.token, {
      maxAge: sessionMaxAge * 1000,
      expires: session.expiresAt,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
    });
    return { id: user.id, email: user.email };
  }),
  currentUser: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.db || !ctx.req) throw new TRPCError({ code: "UNAUTHORIZED" });
    const token = ctx.req.cookies?.session;
    if (!token) throw new TRPCError({ code: "UNAUTHORIZED" });
    const user = await createUsersService(ctx.db).findUserBySession(token);
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    return { id: user.id, email: user.email };
  }),
});
