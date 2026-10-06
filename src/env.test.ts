import { describe, expect, it } from "vitest";

import { parseEnv } from "@/env";

const validUrl = "postgresql://user:pw@localhost:5432/db";

describe("parseEnv", () => {
  it("올바른 값이면 그대로 통과시키고 NODE_ENV 기본값을 채운다", () => {
    expect(parseEnv({ DATABASE_URL: validUrl })).toEqual({
      NODE_ENV: "development",
      DATABASE_URL: validUrl,
    });
  });

  it("DATABASE_URL이 없으면 어떤 변수가 문제인지 알려 주며 실패한다", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("PostgreSQL 접속 URL이 아니면 실패한다", () => {
    expect(() => parseEnv({ DATABASE_URL: "https://example.com" })).toThrow(/DATABASE_URL/);
  });
});
