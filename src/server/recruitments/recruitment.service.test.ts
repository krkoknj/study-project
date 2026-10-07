import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import { isRecruiting } from "@/lib/recruitment-status";
import {
  noFilter,
  type RecruitmentFilter,
  type RecruitmentInput,
} from "@/lib/validation/recruitment";
import { prisma } from "@/server/db";
import {
  createRecruitment,
  deleteRecruitment,
  getRecruitment,
  listRecruitments,
  updateRecruitment,
} from "@/server/recruitments/recruitment.service";
import { resetDb } from "@/test/db";

const columns = {
  title: "알고리즘 스터디 모집",
  content: "주 2회 온라인으로 문제를 풉니다.",
  type: "STUDY",
  capacity: 4,
  mode: "ONLINE",
  region: null,
  deadline: new Date("2099-12-31T14:59:59.999Z"),
} satisfies Omit<RecruitmentInput, "tags">;

const input: RecruitmentInput = { ...columns, tags: [] };

const changedColumns = {
  title: "사이드 프로젝트 팀원 모집",
  content: "주말마다 모여 서비스를 만듭니다.",
  type: "PROJECT",
  capacity: 6,
  mode: "OFFLINE",
  region: "서울 강남",
  deadline: new Date("2099-06-30T14:59:59.999Z"),
} satisfies Omit<RecruitmentInput, "tags">;

const changed: RecruitmentInput = { ...changedColumns, tags: [] };

function createUser(name: string) {
  return prisma.user.create({
    data: { email: `${name}@example.com`, name, passwordHash: "not-used-in-this-test" },
  });
}

let authorId: string;
let otherId: string;

beforeEach(async () => {
  await resetDb();
  authorId = (await createUser("author")).id;
  otherId = (await createUser("other")).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createRecruitment", () => {
  it("요청자를 작성자로, 모집중 상태로 저장한다", async () => {
    const { id } = await createRecruitment(authorId, input);

    const saved = await prisma.recruitment.findUniqueOrThrow({ where: { id } });
    expect(saved).toMatchObject({ ...columns, authorId, status: "OPEN", deletedAt: null });
  });
});

describe("getRecruitment", () => {
  it("작성자 이름과 함께 돌려주고, 작성자의 이메일·비밀번호 해시는 포함하지 않는다", async () => {
    const { id } = await createRecruitment(authorId, input);

    const found = await getRecruitment(id);

    expect(found).toMatchObject({
      id,
      title: input.title,
      author: { id: authorId, name: "author" },
    });
    expect(Object.keys(found?.author ?? {}).sort()).toEqual(["id", "name"]);
  });

  it("없는 글은 null을 돌려준다", async () => {
    expect(await getRecruitment("missing-id")).toBeNull();
  });
});

describe("listRecruitments", () => {
  it("최신 글부터 돌려주고 본문은 포함하지 않는다", async () => {
    const first = await createRecruitment(authorId, { ...input, title: "첫 번째 글" });
    const second = await createRecruitment(otherId, { ...input, title: "두 번째 글" });

    const list = await listRecruitments();

    expect(list.map((item) => item.id)).toEqual([second.id, first.id]);
    expect(list[0]).not.toHaveProperty("content");
  });

  it("지정한 개수까지만 돌려준다", async () => {
    await createRecruitment(authorId, input);
    await createRecruitment(authorId, input);
    await createRecruitment(authorId, input);

    expect(await listRecruitments(undefined, { limit: 2 })).toHaveLength(2);
  });
});

describe("updateRecruitment", () => {
  it("작성자가 수정하면 반영된다", async () => {
    const { id } = await createRecruitment(authorId, input);

    const result = await updateRecruitment(authorId, id, changed);

    expect(result).toEqual({ ok: true, data: { id } });
    expect(await prisma.recruitment.findUniqueOrThrow({ where: { id } })).toMatchObject(
      changedColumns,
    );
  });

  it("다른 사용자가 수정하면 FORBIDDEN이고 내용이 바뀌지 않는다", async () => {
    const { id } = await createRecruitment(authorId, input);

    const result = await updateRecruitment(otherId, id, changed);

    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await prisma.recruitment.findUniqueOrThrow({ where: { id } })).toMatchObject(columns);
  });

  it("수정해도 작성자는 바뀌지 않는다", async () => {
    const { id } = await createRecruitment(authorId, input);

    await updateRecruitment(authorId, id, changed);

    const saved = await prisma.recruitment.findUniqueOrThrow({ where: { id } });
    expect(saved.authorId).toBe(authorId);
  });

  it("없는 글을 수정하면 NOT_FOUND다", async () => {
    const result = await updateRecruitment(authorId, "missing-id", changed);

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("deleteRecruitment", () => {
  it("작성자가 삭제하면 행은 남고 deleted_at만 채워진다", async () => {
    const { id } = await createRecruitment(authorId, input);

    const result = await deleteRecruitment(authorId, id);

    expect(result).toEqual({ ok: true, data: null });
    const row = await prisma.recruitment.findUniqueOrThrow({ where: { id } });
    expect(row.deletedAt).toBeInstanceOf(Date);
    expect(row.title).toBe(input.title);
  });

  it("다른 사용자가 삭제하면 FORBIDDEN이고 글이 그대로 보인다", async () => {
    const { id } = await createRecruitment(authorId, input);

    const result = await deleteRecruitment(otherId, id);

    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await getRecruitment(id)).not.toBeNull();
  });

  it("없는 글을 삭제하면 NOT_FOUND다", async () => {
    expect(await deleteRecruitment(authorId, "missing-id")).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
});

describe("삭제된 글은 없는 글로 취급한다", () => {
  let deletedId: string;
  let remainingId: string;

  beforeEach(async () => {
    deletedId = (await createRecruitment(authorId, { ...input, title: "삭제될 글" })).id;
    remainingId = (await createRecruitment(authorId, { ...input, title: "남는 글" })).id;
    await deleteRecruitment(authorId, deletedId);
  });

  it("상세 조회에서 null을 돌려준다", async () => {
    expect(await getRecruitment(deletedId)).toBeNull();
  });

  it("목록에 나오지 않는다", async () => {
    expect((await listRecruitments()).map((item) => item.id)).toEqual([remainingId]);
  });

  it("작성자도 수정할 수 없고 NOT_FOUND다", async () => {
    const result = await updateRecruitment(authorId, deletedId, changed);

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const row = await prisma.recruitment.findUniqueOrThrow({ where: { id: deletedId } });
    expect(row.title).toBe("삭제될 글");
  });

  it("다시 삭제하면 NOT_FOUND이고 처음 삭제한 시각이 유지된다", async () => {
    const before = await prisma.recruitment.findUniqueOrThrow({ where: { id: deletedId } });

    const result = await deleteRecruitment(authorId, deletedId);

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const after = await prisma.recruitment.findUniqueOrThrow({ where: { id: deletedId } });
    expect(after.deletedAt).toEqual(before.deletedAt);
  });

  it("다른 사용자에게도 FORBIDDEN이 아니라 NOT_FOUND다", async () => {
    expect(await deleteRecruitment(otherId, deletedId)).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
});

describe("태그 저장", () => {
  it("작성할 때 태그를 저장하고, 조회하면 이름순으로 돌려준다", async () => {
    const { id } = await createRecruitment(authorId, { ...input, tags: ["typescript", "react"] });

    expect((await getRecruitment(id))?.tags).toEqual(["react", "typescript"]);
    expect((await listRecruitments())[0]?.tags).toEqual(["react", "typescript"]);
  });

  it("이미 있는 태그는 새로 만들지 않고 재사용한다", async () => {
    await createRecruitment(authorId, { ...input, tags: ["react"] });
    await createRecruitment(otherId, { ...input, tags: ["react", "typescript"] });

    const names = (await prisma.tag.findMany({ orderBy: { name: "asc" } })).map((tag) => tag.name);
    expect(names).toEqual(["react", "typescript"]);
  });

  it("같은 새 태그를 가진 글을 동시에 작성해도 태그는 하나씩만 생기고 모두 성공한다", async () => {
    // 절반은 순서를 뒤집어 넣는다. 정렬하지 않으면 교착 상태가 생길 수 있는 입력이다.
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, index) =>
        createRecruitment(authorId, {
          ...input,
          tags: index % 2 === 0 ? ["react", "typescript"] : ["typescript", "react"],
        }),
      ),
    );

    expect(results.map((result) => result.status)).toEqual(Array(6).fill("fulfilled"));
    expect(await prisma.tag.count()).toBe(2);
    expect(await prisma.recruitmentTag.count()).toBe(12);
  });

  // 위 테스트는 트랜잭션이 짧아서 정렬을 빼도 통과한다 (직접 확인함). 정렬이 필요한 이유는
  // 잠금 순서를 강제로 엇갈리게 만든 아래 테스트가 보여 준다.
  it("겹치는 태그를 서로 다른 순서로 넣으면 교착 상태가 생긴다 (이름을 정렬해서 넣는 이유)", async () => {
    const insertTag = (tx: Prisma.TransactionClient, name: string) =>
      tx.$executeRaw`INSERT INTO tags (id, name) VALUES (${name}, ${name}) ON CONFLICT (name) DO NOTHING`;

    // 각 트랜잭션이 첫 번째 태그를 넣은 뒤에야 상대가 다음 단계로 가도록 순서를 고정한다.
    let signalFirstInserted!: () => void;
    const firstInserted = new Promise<void>((resolve) => (signalFirstInserted = resolve));
    let signalSecondInserted!: () => void;
    const secondInserted = new Promise<void>((resolve) => (signalSecondInserted = resolve));

    const results = await Promise.allSettled([
      prisma.$transaction(async (tx) => {
        await insertTag(tx, "a");
        signalFirstInserted();
        await secondInserted;
        await insertTag(tx, "b"); // 상대가 넣은 b의 커밋을 기다린다
      }),
      prisma.$transaction(async (tx) => {
        await firstInserted;
        await insertTag(tx, "b");
        signalSecondInserted();
        await insertTag(tx, "a"); // 상대가 넣은 a의 커밋을 기다린다 → 서로 기다림
      }),
    ]);

    // PostgreSQL이 교착 상태를 감지해 한쪽을 중단시키고, 다른 쪽은 끝까지 진행한다.
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0]?.reason)).toMatch(/deadlock detected|40P01/);
    expect(await prisma.tag.count()).toBe(2);
  });

  it("수정하면 태그 구성이 통째로 바뀐다", async () => {
    const { id } = await createRecruitment(authorId, { ...input, tags: ["react", "typescript"] });

    await updateRecruitment(authorId, id, { ...changed, tags: ["typescript", "nestjs"] });

    expect((await getRecruitment(id))?.tags).toEqual(["nestjs", "typescript"]);
    expect(await prisma.recruitmentTag.count({ where: { recruitmentId: id } })).toBe(2);
  });

  it("수정으로 태그를 모두 지울 수 있다", async () => {
    const { id } = await createRecruitment(authorId, { ...input, tags: ["react"] });

    await updateRecruitment(authorId, id, { ...changed, tags: [] });

    expect((await getRecruitment(id))?.tags).toEqual([]);
  });

  it("다른 사용자가 수정을 시도하면 태그도 바뀌지 않는다", async () => {
    const { id } = await createRecruitment(authorId, { ...input, tags: ["react"] });

    const result = await updateRecruitment(otherId, id, { ...changed, tags: ["hacked"] });

    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect((await getRecruitment(id))?.tags).toEqual(["react"]);
    expect(await prisma.tag.count({ where: { name: "hacked" } })).toBe(0);
  });

  it.each([
    ["대문자", "React"],
    ["앞 공백", " react"],
    ["뒤 공백", "react "],
    ["빈 문자열", ""],
  ])("정규화되지 않은 이름(%s)은 DB가 직접 거부한다", async (_label, name) => {
    await expect(prisma.tag.create({ data: { name } })).rejects.toThrow(
      /tags_name_normalized_check/,
    );
  });
});

describe("목록 필터", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  const future = new Date("2026-12-31T14:59:59.999Z");
  const past = new Date("2026-10-01T14:59:59.999Z");

  async function titles(filter: Partial<RecruitmentFilter>) {
    const list = await listRecruitments({ ...noFilter, ...filter }, { now });
    return list.map((item) => item.title).sort();
  }

  beforeEach(async () => {
    const base = { ...input, deadline: future };
    await createRecruitment(authorId, {
      ...base,
      title: "A 스터디 온라인",
      type: "STUDY",
      mode: "ONLINE",
      tags: ["react", "typescript"],
    });
    await createRecruitment(authorId, {
      ...base,
      title: "B 프로젝트 오프라인",
      type: "PROJECT",
      mode: "OFFLINE",
      region: "서울",
      tags: ["react"],
    });
    await createRecruitment(authorId, {
      ...base,
      title: "C 마감일 지남",
      type: "STUDY",
      mode: "HYBRID",
      region: "부산",
      deadline: past,
      tags: ["spring"],
    });
    const closed = await createRecruitment(authorId, {
      ...base,
      title: "D 마감 상태",
      type: "PROJECT",
      mode: "ONLINE",
      tags: ["react", "typescript", "nestjs"],
    });
    await prisma.recruitment.update({ where: { id: closed.id }, data: { status: "CLOSED" } });
    const deleted = await createRecruitment(authorId, {
      ...base,
      title: "E 삭제됨",
      type: "STUDY",
      mode: "ONLINE",
      tags: ["react"],
    });
    await deleteRecruitment(authorId, deleted.id);
  });

  it("필터가 없으면 삭제되지 않은 글을 모두 돌려준다", async () => {
    expect(await titles({})).toEqual([
      "A 스터디 온라인",
      "B 프로젝트 오프라인",
      "C 마감일 지남",
      "D 마감 상태",
    ]);
  });

  it("유형으로 거른다", async () => {
    expect(await titles({ type: "STUDY" })).toEqual(["A 스터디 온라인", "C 마감일 지남"]);
  });

  it("진행 방식으로 거른다", async () => {
    expect(await titles({ mode: "ONLINE" })).toEqual(["A 스터디 온라인", "D 마감 상태"]);
  });

  it("태그 하나로 거른다", async () => {
    expect(await titles({ tags: ["react"] })).toEqual([
      "A 스터디 온라인",
      "B 프로젝트 오프라인",
      "D 마감 상태",
    ]);
  });

  it("태그가 여러 개면 모두 달린 글만 돌려준다 (AND)", async () => {
    expect(await titles({ tags: ["react", "typescript"] })).toEqual([
      "A 스터디 온라인",
      "D 마감 상태",
    ]);
    expect(await titles({ tags: ["react", "spring"] })).toEqual([]);
  });

  it("없는 태그로 거르면 결과가 없다", async () => {
    expect(await titles({ tags: ["rust"] })).toEqual([]);
  });

  it("모집중만 보기는 마감 상태인 글과 마감일이 지난 글을 뺀다", async () => {
    expect(await titles({ openOnly: true })).toEqual(["A 스터디 온라인", "B 프로젝트 오프라인"]);
  });

  it("모집중만 보기의 결과는 isRecruiting 판정과 일치한다", async () => {
    const all = await listRecruitments(noFilter, { now });
    const expected = all.filter((item) => isRecruiting(item, now)).map((item) => item.title);

    expect(await titles({ openOnly: true })).toEqual(expected.sort());
  });

  it("여러 필터를 함께 걸면 모두 만족하는 글만 돌려준다", async () => {
    expect(await titles({ type: "PROJECT", tags: ["react"], openOnly: true })).toEqual([
      "B 프로젝트 오프라인",
    ]);
    expect(await titles({ type: "STUDY", mode: "ONLINE", tags: ["typescript"] })).toEqual([
      "A 스터디 온라인",
    ]);
  });
});
