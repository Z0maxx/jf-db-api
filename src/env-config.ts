import z from "zod";

const EnvConfigSchema = z.object({
  IS_DEV: z.coerce.boolean(),
  PORT: z.coerce.number(),
  DB_URL: z.string(),
  DB_USER: z.string(),
  API_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string(),
  STEAM_API_KEY: z.string(),
});

export const envConfig = EnvConfigSchema.parse(process.env);
