import { z } from "zod";

export const signUpInput = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type SignUpInput = z.infer<typeof signUpInput>;
