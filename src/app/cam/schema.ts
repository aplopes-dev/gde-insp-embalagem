import { z } from "zod";

export const validationSchema = z.object({
  type: z.string(),
  code: z.string(),
  name: z.string(),
});


export type ValidationFormType = z.infer<typeof validationSchema>;
