import { afterAll, expect, it } from "vitest";

import { prisma } from "@/server/db";

afterAll(async () => {
  await prisma.$disconnect();
});

it("테스트는 개발 DB가 아닌 테스트 전용 DB에 연결된다", async () => {
  const rows = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;

  expect(rows).toEqual([{ name: "studygroup_test" }]);
});
