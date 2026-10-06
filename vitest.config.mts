import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
    include: ["src/**/*.test.ts"],
    // 테스트가 개발 DB를 건드리지 않도록 DATABASE_URL을 테스트 DB로 바꿔 넣는다.
    env: {
      DATABASE_URL: testDatabaseUrl,
    },
  },
});
