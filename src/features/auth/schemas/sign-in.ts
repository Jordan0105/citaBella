import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Correo inválido")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type SignInInput = z.infer<typeof signInSchema>;
