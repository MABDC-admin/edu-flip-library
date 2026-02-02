import { z } from "zod";

const envSchema = z.object({
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    // Add other environment variables here as needed
});

const _env = envSchema.safeParse(import.meta.env);

if (!_env.success) {
    
    throw new Error("Invalid environment variables");
}

export const env = _env.data;
