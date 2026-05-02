import { z } from "zod";

const NavLayoutSchema = z.enum(["sidebar", "topbar"]);

const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url("VITE_API_BASE_URL must be a valid URL"),
  VITE_DEFAULT_NAV_LAYOUT: NavLayoutSchema.default("sidebar"),
  VITE_APP_NAME: z.string().min(1).default("ZarnTaxSync"),
});

const parsed = EnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // Fail loudly during boot rather than producing confusing 401s later.
  console.error("[env] invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error(
    "Invalid environment configuration. Check your .env file against .env.example.",
  );
}

export const env = parsed.data;
export type NavLayout = z.infer<typeof NavLayoutSchema>;
