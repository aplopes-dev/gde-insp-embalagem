import { z } from "zod";

export const opBreakAuthorizationSchema = z.object({
  quantity: z.number().min(1),
  code: z.string().min(1),
  password: z.string().min(3),
});

export type OpBreakAuthorizationType = z.infer<
  typeof opBreakAuthorizationSchema
>;
