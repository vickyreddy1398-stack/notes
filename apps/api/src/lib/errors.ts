/**
 * Typed business errors — what a SERVICE throws for every outcome that is not success.
 * The one translator in trpc/trpc.ts turns them into tRPC errors with the same code and
 * message; routers never build TRPCErrors for business outcomes and never interpret a
 * "no row" sentinel (AGENTS.md §2).
 */
export type AppErrorCode = "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

/** Missing AND not-yours are the same answer — never reveal that another user's row exists. */
export const notFound = (what: string) => new AppError("NOT_FOUND", `${what} not found`);

export const conflict = (message: string) => new AppError("CONFLICT", message);

export const badRequest = (message: string) => new AppError("BAD_REQUEST", message);

export const unauthorized = (message = "invalid email or password") =>
  new AppError("UNAUTHORIZED", message);
