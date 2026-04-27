import { z } from "zod";

export const validationSchema = z.object({
  opId: z
    .string()
    .min(1, "Informe o ID da OP")
    .regex(/^\d+$/, "OP deve ser numérica"),
  itemId: z.string(),
  count: z.string(),
  code: z.string().optional(),
});


export type ValidationFormType = z.infer<typeof validationSchema>;
