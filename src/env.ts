import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: "postgresql:// 로 시작하는 접속 URL이어야 합니다.",
  }),
  // Auth.js가 세션 JWT를 서명·암호화할 때 쓰는 키.
  AUTH_SECRET: z.string({ error: "필수 값입니다." }).min(32, "32자 이상이어야 합니다."),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`환경변수가 올바르지 않습니다.\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
