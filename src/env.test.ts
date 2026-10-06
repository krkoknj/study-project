import { describe, expect, it } from "vitest";

import { parseEnv } from "@/env";

const valid = {
  DATABASE_URL: "postgresql://user:pw@localhost:5432/db",
  AUTH_SECRET: "a".repeat(32),
};

describe("parseEnv", () => {
  it("올바른 값이면 그대로 통과시키고 NODE_ENV 기본값을 채운다", () => {
    expect(parseEnv(valid)).toEqual({ NODE_ENV: "development", ...valid });
  });

  it("DATABASE_URL이 없으면 어떤 변수가 문제인지 알려 주며 실패한다", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it("PostgreSQL 접속 URL이 아니면 실패한다", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "https://example.com" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("AUTH_SECRET이 없거나 짧으면 실패한다", () => {
    expect(() => parseEnv({ ...valid, AUTH_SECRET: undefined })).toThrow(/AUTH_SECRET/);
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });
});
