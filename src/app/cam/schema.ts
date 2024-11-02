import { z } from "zod";

export const validationSchema = z.object({
  itemId: z.string(),
  count: z.string()
});


export type ValidationFormType = z.infer<typeof validationSchema>;
