import { describe, expect, it } from "vitest";

import { loginSchema, signupSchema } from "@/lib/validation/auth";

const valid = { email: "user@example.com", name: "홍길동", password: "password1234" };

describe("signupSchema", () => {
  it("이메일의 앞뒤 공백을 지우고 소문자로 바꾼다", () => {
    const result = signupSchema.parse({ ...valid, email: "  User@Example.COM " });

    expect(result.email).toBe("user@example.com");
  });

  it("이름의 앞뒤 공백을 지운다", () => {
    expect(signupSchema.parse({ ...valid, name: "  홍길동  " }).name).toBe("홍길동");
  });

  it("비밀번호의 공백은 그대로 둔다", () => {
    expect(signupSchema.parse({ ...valid, password: " pass word " }).password).toBe(" pass word ");
  });

  it.each([
    ["이메일 형식이 아님", { email: "not-an-email" }, "email"],
    ["이름이 1자", { name: "a" }, "name"],
    ["이름이 공백뿐", { name: "   " }, "name"],
    ["이름이 21자", { name: "a".repeat(21) }, "name"],
    ["비밀번호가 7자", { password: "1234567" }, "password"],
    ["비밀번호가 129자", { password: "a".repeat(129) }, "password"],
  ])("%s이면 해당 필드 오류로 거부한다", (_label, override, field) => {
    const result = signupSchema.safeParse({ ...valid, ...override });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([field]);
  });

  it("값이 문자열이 아니면 거부한다", () => {
    expect(signupSchema.safeParse({ email: null, name: null, password: null }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("이메일을 가입 때와 같은 방식으로 정규화한다", () => {
    const result = loginSchema.parse({ email: " User@Example.com", password: "x" });

    expect(result.email).toBe("user@example.com");
  });

  it("비밀번호 길이 정책(8자)을 검사하지 않는다", () => {
    expect(loginSchema.safeParse({ email: valid.email, password: "short" }).success).toBe(true);
  });

  it("비밀번호가 비어 있으면 거부한다", () => {
    expect(loginSchema.safeParse({ email: valid.email, password: "" }).success).toBe(false);
  });
});
