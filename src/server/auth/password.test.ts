import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/server/auth/password";

describe("비밀번호 해싱", () => {
  it("Argon2id 해시를 만들고 원문은 포함하지 않는다", async () => {
    const hash = await hashPassword("password1234");

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(hash).not.toContain("password1234");
  });

  it("같은 비밀번호라도 솔트가 달라 해시가 매번 다르다", async () => {
    const [first, second] = await Promise.all([
      hashPassword("password1234"),
      hashPassword("password1234"),
    ]);

    expect(first).not.toBe(second);
  });

  it("올바른 비밀번호는 통과시키고 틀린 비밀번호는 거부한다", async () => {
    const hash = await hashPassword("password1234");

    expect(await verifyPassword(hash, "password1234")).toBe(true);
    expect(await verifyPassword(hash, "password12345")).toBe(false);
  });

  it("저장된 값이 해시 형식이 아니면 예외 없이 거부한다", async () => {
    expect(await verifyPassword("not-a-hash", "password1234")).toBe(false);
  });
});
