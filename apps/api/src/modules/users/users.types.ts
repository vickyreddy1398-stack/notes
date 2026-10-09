import { z } from "zod";

export const signUpInput = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type SignUpInput = z.infer<typeof signUpInput>;
