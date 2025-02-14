import { z } from "zod";

export const validationSchema = z.object({
  itemId: z.string(),
  count: z.string(),
  code: z.string().optional(),
});


export type ValidationFormType = z.infer<typeof validationSchema>;
