import { execSync } from "node:child_process";

// 테스트 실행 전에 한 번, 테스트 DB를 최신 마이그레이션 상태로 맞춘다.
// prisma7.config.ts가 DATABASE_URL을 읽으므로 그 값을 테스트 DB로 바꿔서 실행한다.
export default function setup() {
  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: "pipe",
  });
}
