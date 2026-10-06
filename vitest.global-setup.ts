import { execSync } from "node:child_process";

// 이전 실행이 남긴 데이터를 지운다. 행이 남아 있으면 필수 컬럼을 추가하는 마이그레이션이 실패한다.
// 테이블 목록을 DB에서 읽으므로 테이블이 늘어나도 고칠 필요가 없고, 테이블이 아직 없어도 동작한다.
const truncateAllTables = `
DO $$
DECLARE
  table_names text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO table_names
    FROM pg_tables
   WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';

  IF table_names IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_names || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;
`;

// 테스트 실행 전에 한 번, 테스트 DB를 비우고 최신 마이그레이션 상태로 맞춘다.
// prisma7.config.ts가 DATABASE_URL을 읽으므로 그 값을 테스트 DB로 바꿔서 실행한다.
export default function setup() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl || !new URL(testDatabaseUrl).pathname.endsWith("_test")) {
    throw new Error(
      "TEST_DATABASE_URL의 DB 이름은 _test로 끝나야 합니다. 테스트는 이 DB의 모든 데이터를 지웁니다.",
    );
  }

  const env = { ...process.env, DATABASE_URL: testDatabaseUrl };

  execSync("pnpm exec prisma db execute --stdin", { env, input: truncateAllTables, stdio: "pipe" });
  execSync("pnpm exec prisma migrate deploy", { env, stdio: "pipe" });
}
