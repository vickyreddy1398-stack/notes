import { z } from "zod";

export const signUpInput = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type SignUpInput = z.infer<typeof signUpInput>;

export const signInInput = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type SignInInput = z.infer<typeof signInInput>;
