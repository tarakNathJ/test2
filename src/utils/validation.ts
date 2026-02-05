import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(6),
  role: z.enum(["USER", "SERVICE_PROVIDER"]),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});