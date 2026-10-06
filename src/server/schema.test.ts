import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";
import { resetDb } from "@/test/db";

// 애플리케이션 검증을 거치지 않고 DB에 직접 써도 불변 조건이 지켜지는지 확인한다.

function createUser(name: string) {
  return prisma.user.create({ data: { email: `${name}@example.com`, name } });
}

function createRecruitment(authorId: string, overrides: { capacity?: number } = {}) {
  return prisma.recruitment.create({
    data: {
      authorId,
      title: "알고리즘 스터디",
      content: "주 2회 문제 풀이",
      type: "STUDY",
      capacity: 4,
      mode: "ONLINE",
      deadline: new Date("2099-12-31T00:00:00Z"),
      ...overrides,
    },
  });
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("신청 중복 방지 (유니크 제약)", () => {
  it("같은 사용자가 같은 모집글에 두 번 신청하면 거부한다", async () => {
    const author = await createUser("author");
    const applicant = await createUser("applicant");
    const recruitment = await createRecruitment(author.id);
    const data = { recruitmentId: recruitment.id, applicantId: applicant.id, message: "참여 희망" };

    await prisma.application.create({ data });

    await expect(prisma.application.create({ data })).rejects.toMatchObject({ code: "P2002" });
  });

  it("취소한 신청이 있어도 다시 신청할 수 없다", async () => {
    const author = await createUser("author");
    const applicant = await createUser("applicant");
    const recruitment = await createRecruitment(author.id);
    const data = { recruitmentId: recruitment.id, applicantId: applicant.id, message: "참여 희망" };

    await prisma.application.create({ data: { ...data, status: "CANCELED" } });

    await expect(prisma.application.create({ data })).rejects.toMatchObject({ code: "P2002" });
  });

  it("동시에 여러 번 신청해도 한 건만 저장된다", async () => {
    const author = await createUser("author");
    const applicant = await createUser("applicant");
    const recruitment = await createRecruitment(author.id);
    const data = { recruitmentId: recruitment.id, applicantId: applicant.id, message: "참여 희망" };

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => prisma.application.create({ data })),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.application.count()).toBe(1);
  });

  it("서로 다른 사용자는 같은 모집글에 각각 신청할 수 있다", async () => {
    const author = await createUser("author");
    const first = await createUser("first");
    const second = await createUser("second");
    const recruitment = await createRecruitment(author.id);

    await prisma.application.create({
      data: { recruitmentId: recruitment.id, applicantId: first.id, message: "참여 희망" },
    });
    await prisma.application.create({
      data: { recruitmentId: recruitment.id, applicantId: second.id, message: "참여 희망" },
    });

    expect(await prisma.application.count()).toBe(2);
  });
});

describe("모집 인원 (CHECK 제약)", () => {
  it("모집 인원이 0명인 모집글은 저장할 수 없다", async () => {
    const author = await createUser("author");

    await expect(createRecruitment(author.id, { capacity: 0 })).rejects.toThrow(
      /recruitments_capacity_check/,
    );
  });

  it("모집 인원이 1명인 모집글은 저장할 수 있다", async () => {
    const author = await createUser("author");

    await expect(createRecruitment(author.id, { capacity: 1 })).resolves.toMatchObject({
      capacity: 1,
    });
  });
});

describe("찜과 태그 중복 방지", () => {
  it("같은 모집글을 두 번 찜할 수 없다", async () => {
    const author = await createUser("author");
    const user = await createUser("user");
    const recruitment = await createRecruitment(author.id);
    const data = { userId: user.id, recruitmentId: recruitment.id };

    await prisma.bookmark.create({ data });

    await expect(prisma.bookmark.create({ data })).rejects.toMatchObject({ code: "P2002" });
  });

  it("같은 이름의 태그를 두 번 만들 수 없다", async () => {
    await prisma.tag.create({ data: { name: "react" } });

    await expect(prisma.tag.create({ data: { name: "react" } })).rejects.toMatchObject({
      code: "P2002",
    });
  });
});

describe("삭제 정책", () => {
  it("신청이 있는 모집글은 행을 직접 삭제할 수 없다 (Restrict)", async () => {
    const author = await createUser("author");
    const applicant = await createUser("applicant");
    const recruitment = await createRecruitment(author.id);
    await prisma.application.create({
      data: { recruitmentId: recruitment.id, applicantId: applicant.id, message: "참여 희망" },
    });

    await expect(prisma.recruitment.delete({ where: { id: recruitment.id } })).rejects.toThrow();
    expect(await prisma.application.count()).toBe(1);
  });

  it("모집글 행을 삭제하면 찜과 태그 연결도 함께 삭제된다 (Cascade)", async () => {
    const author = await createUser("author");
    const recruitment = await createRecruitment(author.id);
    const tag = await prisma.tag.create({ data: { name: "react" } });
    await prisma.bookmark.create({ data: { userId: author.id, recruitmentId: recruitment.id } });
    await prisma.recruitmentTag.create({ data: { recruitmentId: recruitment.id, tagId: tag.id } });

    await prisma.recruitment.delete({ where: { id: recruitment.id } });

    expect(await prisma.bookmark.count()).toBe(0);
    expect(await prisma.recruitmentTag.count()).toBe(0);
    expect(await prisma.tag.count()).toBe(1);
  });
});
