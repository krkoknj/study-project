import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { RecruitmentInput } from "@/lib/validation/recruitment";
import { prisma } from "@/server/db";
import {
  createRecruitment,
  deleteRecruitment,
  getRecruitment,
  listRecruitments,
  updateRecruitment,
} from "@/server/recruitments/recruitment.service";
import { resetDb } from "@/test/db";

const input: RecruitmentInput = {
  title: "알고리즘 스터디 모집",
  content: "주 2회 온라인으로 문제를 풉니다.",
  type: "STUDY",
  capacity: 4,
  mode: "ONLINE",
  region: null,
  deadline: new Date("2099-12-31T14:59:59.999Z"),
};

const changed: RecruitmentInput = {
  title: "사이드 프로젝트 팀원 모집",
  content: "주말마다 모여 서비스를 만듭니다.",
  type: "PROJECT",
  capacity: 6,
  mode: "OFFLINE",
  region: "서울 강남",
  deadline: new Date("2099-06-30T14:59:59.999Z"),
};

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
    expect(saved).toMatchObject({ ...input, authorId, status: "OPEN", deletedAt: null });
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

    expect(await listRecruitments(2)).toHaveLength(2);
  });
});

describe("updateRecruitment", () => {
  it("작성자가 수정하면 반영된다", async () => {
    const { id } = await createRecruitment(authorId, input);

    const result = await updateRecruitment(authorId, id, changed);

    expect(result).toEqual({ ok: true, data: { id } });
    expect(await prisma.recruitment.findUniqueOrThrow({ where: { id } })).toMatchObject(changed);
  });

  it("다른 사용자가 수정하면 FORBIDDEN이고 내용이 바뀌지 않는다", async () => {
    const { id } = await createRecruitment(authorId, input);

    const result = await updateRecruitment(otherId, id, changed);

    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await prisma.recruitment.findUniqueOrThrow({ where: { id } })).toMatchObject(input);
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
