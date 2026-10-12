import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 성능 측정 스크립트(scripts/*.measure.ts) 전용 설정. `pnpm test`에는 포함되지 않는다.
// 테스트 설정과 같은 globalSetup을 써서 테스트 DB에서만, 최신 마이그레이션 상태로 실행한다.

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL이 없습니다. .env.example을 참고해 .env를 만들어 주세요.");
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["scripts/**/*.measure.ts"],
    globalSetup: ["./vitest.global-setup.ts"],
    fileParallelism: false,
    testTimeout: 600_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
    },
  },
});
