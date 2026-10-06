import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";
import { findUserById, registerUser, verifyCredentials } from "@/server/users/user.service";
import { resetDb } from "@/test/db";

const input = { email: "user@example.com", name: "홍길동", password: "password1234" };

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("registerUser", () => {
  it("사용자를 만들고 비밀번호 해시를 제외한 정보만 돌려준다", async () => {
    const result = await registerUser(input);

    expect(result).toEqual({
      ok: true,
      data: { id: expect.any(String), email: input.email, name: input.name },
    });
  });

  it("비밀번호를 원문이 아닌 Argon2id 해시로 저장한다", async () => {
    await registerUser(input);

    const saved = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
    expect(saved.passwordHash).toMatch(/^\$argon2id\$/);
    expect(saved.passwordHash).not.toContain(input.password);
  });

  it("이미 가입된 이메일이면 CONFLICT로 실패하고 기존 계정은 그대로 둔다", async () => {
    await registerUser(input);

    const result = await registerUser({ ...input, name: "다른사람", password: "another-password" });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", fieldErrors: { email: [expect.any(String)] } },
    });
    expect(await prisma.user.count()).toBe(1);
    expect(await verifyCredentials(input)).not.toBeNull();
  });

  it("같은 이메일로 동시에 가입해도 한 건만 성공한다", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => registerUser(input)));

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.error.code === "CONFLICT")).toHaveLength(
      4,
    );
    expect(await prisma.user.count()).toBe(1);
  });
});

describe("verifyCredentials", () => {
  beforeEach(async () => {
    await registerUser(input);
  });

  it("이메일과 비밀번호가 맞으면 사용자 정보를 돌려준다", async () => {
    expect(await verifyCredentials({ email: input.email, password: input.password })).toEqual({
      id: expect.any(String),
      email: input.email,
      name: input.name,
    });
  });

  it("비밀번호가 틀리면 null을 돌려준다", async () => {
    expect(await verifyCredentials({ email: input.email, password: "wrong-password" })).toBeNull();
  });

  it("가입되지 않은 이메일이면 null을 돌려준다", async () => {
    expect(
      await verifyCredentials({ email: "nobody@example.com", password: input.password }),
    ).toBeNull();
  });
});

describe("findUserById", () => {
  it("있는 사용자는 공개 정보만 돌려주고, 없으면 null을 돌려준다", async () => {
    const result = await registerUser(input);
    if (!result.ok) throw new Error("가입 실패");

    expect(await findUserById(result.data.id)).toEqual(result.data);
    expect(await findUserById("missing-id")).toBeNull();
  });
});
