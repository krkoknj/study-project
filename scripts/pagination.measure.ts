// 오프셋 방식과 커서 방식의 목록 조회 비용을 비교한다.
// 실행: pnpm measure:pagination  (테스트 DB를 비우고 10만 건을 채운 뒤 측정한다)
// 결과 해석은 docs/pagination.md 참고.

import { afterAll, beforeAll, it } from "vitest";

import { prisma } from "@/server/db";

const ROWS = 100_000;
const PAGE_SIZE = 20;
// 몇 번째 글부터 20건을 읽는가. 0은 첫 페이지다.
const DEPTHS = [0, 1_000, 10_000, 50_000, 90_000];
const SQL_RUNS = 5;
const PRISMA_RUNS = 7;

// prisma/schema.prisma의 @@index([createdAt(sort: Desc), id(sort: Desc)])가 만드는 이름과 같아야 한다.
const INDEX_NAME = "recruitments_created_at_id_idx";

const AUTHOR_ID = "cmeasureauthor00000000000";
const COLUMNS = "id, author_id, title, type, capacity, mode, region, deadline, status, created_at";

type Cursor = { createdAt: Date; id: string };

type Plan = {
  "Node Type": string;
  Plans?: Plan[];
  "Shared Hit Blocks"?: number;
  "Shared Read Blocks"?: number;
};
type Explain = { Plan: Plan; "Execution Time": number };

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
}

// 실행 계획의 노드를 위에서 아래로 나열한다. 예: "Limit > Index Scan"
function nodeChain(plan: Plan): string {
  const child = plan.Plans?.[0];
  return child ? `${plan["Node Type"]} > ${nodeChain(child)}` : plan["Node Type"];
}

async function explain(sql: string) {
  const runs: Explain[] = [];
  for (let run = 0; run < SQL_RUNS; run++) {
    const rows = await prisma.$queryRawUnsafe<{ "QUERY PLAN": Explain[] }[]>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
    );
    const result = rows[0]?.["QUERY PLAN"][0];
    if (!result) throw new Error("실행 계획을 읽지 못했습니다.");
    runs.push(result);
  }
  const last = runs[runs.length - 1] as Explain;
  return {
    ms: median(runs.map((run) => run["Execution Time"])),
    // 읽은 8KB 블록 수. 실행 시간보다 덜 흔들리는 비용 지표다.
    buffers: (last.Plan["Shared Hit Blocks"] ?? 0) + (last.Plan["Shared Read Blocks"] ?? 0),
    plan: nodeChain(last.Plan),
  };
}

async function time(run: () => Promise<unknown>): Promise<number> {
  const samples: number[] = [];
  for (let index = 0; index < PRISMA_RUNS; index++) {
    const start = performance.now();
    await run();
    samples.push(performance.now() - start);
  }
  return median(samples);
}

// depth번째 글 바로 앞 글(= 이전 페이지의 마지막 글)을 커서로 쓴다.
async function cursorAt(depth: number): Promise<Cursor | null> {
  if (depth === 0) return null;
  const rows = await prisma.$queryRawUnsafe<{ created_at: Date; id: string }[]>(
    `SELECT created_at, id FROM recruitments WHERE deleted_at IS NULL
     ORDER BY created_at DESC, id DESC LIMIT 1 OFFSET ${depth - 1}`,
  );
  const row = rows[0];
  if (!row) throw new Error(`깊이 ${depth}에 글이 없습니다.`);
  return { createdAt: row.created_at, id: row.id };
}

const ORDER = "ORDER BY created_at DESC, id DESC";

function offsetSql(depth: number) {
  return `SELECT ${COLUMNS} FROM recruitments WHERE deleted_at IS NULL ${ORDER} LIMIT ${PAGE_SIZE} OFFSET ${depth}`;
}

// 같은 "커서 이후"를 SQL로 쓰는 세 가지 방법
const keysetForms = {
  // (a) 교과서적인 형태
  OR: (c: string, i: string) => `(created_at < ${c} OR (created_at = ${c} AND id < ${i}))`,
  // (b) 인덱스가 시작 지점을 찾을 수 있도록 범위 조건을 앞에 둔 형태
  "범위 + OR": (c: string, i: string) => `created_at <= ${c} AND (created_at < ${c} OR id < ${i})`,
  // (c) 행 비교
  "행 비교": (c: string, i: string) => `(created_at, id) < (${c}, ${i})`,
} as const;

function keysetSql(form: keyof typeof keysetForms, cursor: Cursor | null) {
  const condition = cursor
    ? `AND ${keysetForms[form](`'${cursor.createdAt.toISOString()}'::timestamptz`, `'${cursor.id}'`)}`
    : "";
  return `SELECT ${COLUMNS} FROM recruitments WHERE deleted_at IS NULL ${condition} ${ORDER} LIMIT ${PAGE_SIZE}`;
}

const scalarSelect = {
  id: true,
  title: true,
  type: true,
  capacity: true,
  mode: true,
  region: true,
  deadline: true,
  status: true,
  createdAt: true,
} as const;

const prismaOrder = [{ createdAt: "desc" }, { id: "desc" }] as const;

function prismaOffset(depth: number) {
  return prisma.recruitment.findMany({
    where: { deletedAt: null },
    orderBy: [...prismaOrder],
    skip: depth,
    take: PAGE_SIZE,
    select: scalarSelect,
  });
}

function prismaKeyset(cursor: Cursor | null) {
  return prisma.recruitment.findMany({
    where: {
      deletedAt: null,
      ...(cursor
        ? {
            createdAt: { lte: cursor.createdAt },
            OR: [{ createdAt: { lt: cursor.createdAt } }, { id: { lt: cursor.id } }],
          }
        : {}),
    },
    orderBy: [...prismaOrder],
    take: PAGE_SIZE,
    select: scalarSelect,
  });
}

const fmt = (value: number) => value.toFixed(2);

async function measurePhase(title: string) {
  const lines: string[] = [`\n### ${title}\n`];

  lines.push("**SQL 실행 시간(ms, 중앙값)과 읽은 블록 수**\n");
  lines.push("| 깊이 | 오프셋 | 커서: OR | 커서: 범위 + OR | 커서: 행 비교 |");
  lines.push("| ---: | ---: | ---: | ---: | ---: |");
  const plans: string[] = [];
  for (const depth of DEPTHS) {
    const cursor = await cursorAt(depth);
    const offset = await explain(offsetSql(depth));
    const cells = [`${fmt(offset.ms)} (${offset.buffers})`];
    if (depth === 50_000) plans.push(`- 오프셋: \`${offset.plan}\``);
    for (const form of Object.keys(keysetForms) as (keyof typeof keysetForms)[]) {
      const result = await explain(keysetSql(form, cursor));
      cells.push(`${fmt(result.ms)} (${result.buffers})`);
      if (depth === 50_000) plans.push(`- 커서(${form}): \`${result.plan}\``);
    }
    lines.push(`| ${depth.toLocaleString("en-US")} | ${cells.join(" | ")} |`);
  }
  lines.push("\n**깊이 50,000에서의 실행 계획**\n", ...plans);

  lines.push("\n**Prisma 호출 시간(ms, 중앙값, 네트워크 왕복 포함)**\n");
  lines.push("| 깊이 | 오프셋 (skip) | 커서 (범위 + OR) |");
  lines.push("| ---: | ---: | ---: |");
  for (const depth of DEPTHS) {
    const cursor = await cursorAt(depth);
    const offset = await time(() => prismaOffset(depth));
    const keyset = await time(() => prismaKeyset(cursor));
    lines.push(`| ${depth.toLocaleString("en-US")} | ${fmt(offset)} | ${fmt(keyset)} |`);
  }

  const count = await time(() => prisma.recruitment.count({ where: { deletedAt: null } }));
  lines.push(
    `\n전체 개수 세기(\`COUNT\`, 오프셋 방식에서 페이지 번호를 만들 때 필요): ${fmt(count)} ms`,
  );

  return lines.join("\n");
}

async function indexExists() {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = ${INDEX_NAME}) AS exists`;
  return rows[0]?.exists ?? false;
}

let hadIndexAtStart = false;

beforeAll(async () => {
  hadIndexAtStart = await indexExists();

  await prisma.$executeRawUnsafe(`
    INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
    VALUES ('${AUTHOR_ID}', 'measure@example.com', 'measure', 'not-a-real-hash', now(), now())`);

  // 작성 시각이 1초씩 늦어지는 글 10만 건. 50건에 1건은 삭제된 글이다.
  await prisma.$executeRawUnsafe(`
    INSERT INTO recruitments
      (id, author_id, title, content, type, capacity, mode, region, deadline, status, deleted_at, created_at, updated_at)
    SELECT
      'c' || lpad(i::text, 24, '0'),
      '${AUTHOR_ID}',
      '측정용 모집글 ' || i,
      repeat('측정용 본문입니다. ', 20),
      (ARRAY['STUDY', 'PROJECT'])[1 + i % 2]::recruitment_type,
      2 + i % 8,
      (ARRAY['ONLINE', 'OFFLINE', 'HYBRID'])[1 + i % 3]::meeting_mode,
      CASE WHEN i % 3 = 0 THEN NULL ELSE '서울' END,
      timestamptz '2099-12-31 14:59:59.999+00',
      'OPEN',
      CASE WHEN i % 50 = 0 THEN now() END,
      timestamptz '2026-01-01 00:00:00+00' + i * interval '1 second',
      now()
    FROM generate_series(1, ${ROWS}) AS i`);
});

afterAll(async () => {
  // 인덱스 상태를 시작할 때와 같게 되돌린다. 남겨 두면 다음 마이그레이션 적용이 충돌할 수 있다.
  if (hadIndexAtStart) {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "${INDEX_NAME}" ON recruitments (created_at DESC, id DESC)`,
    );
  } else {
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${INDEX_NAME}"`);
  }
  await prisma.$disconnect();
});

it("오프셋 방식과 커서 방식의 조회 비용을 비교한다", async () => {
  const report: string[] = [];

  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${INDEX_NAME}"`);
  await prisma.$executeRawUnsafe("ANALYZE recruitments");
  report.push(await measurePhase("정렬용 인덱스 없음"));

  await prisma.$executeRawUnsafe(
    `CREATE INDEX "${INDEX_NAME}" ON recruitments (created_at DESC, id DESC)`,
  );
  await prisma.$executeRawUnsafe("ANALYZE recruitments");
  report.push(await measurePhase("정렬용 인덱스 (created_at DESC, id DESC) 있음"));

  const version = await prisma.$queryRaw<{ server_version: string }[]>`SHOW server_version`;
  console.log(
    [
      `\n## 측정 결과 (${ROWS.toLocaleString("en-US")}건, 페이지 크기 ${PAGE_SIZE}, PostgreSQL ${version[0]?.server_version})`,
      ...report,
    ].join("\n"),
  );
});
