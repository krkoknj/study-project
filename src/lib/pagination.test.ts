import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "@/lib/pagination";

const cursor = { createdAt: new Date("2026-10-20T14:59:59.123Z"), id: "cmgf1x2y30000abcd1234efgh" };

describe("커서 인코딩", () => {
  it("인코딩한 값을 다시 풀면 같은 위치가 된다 (밀리초까지 유지)", () => {
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("주소에 그대로 넣을 수 있는 문자만 쓴다", () => {
    expect(encodeCursor(cursor)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("잘못된 커서", () => {
  const encode = (payload: unknown) => Buffer.from(JSON.stringify(payload)).toString("base64url");

  it.each([
    ["없음", undefined],
    ["null", null],
    ["빈 문자열", ""],
    ["반복된 값", ["a", "b"]],
    ["base64가 아닌 문자열", "!!!not-base64!!!"],
    ["JSON이 아닌 내용", Buffer.from("hello").toString("base64url")],
    ["배열이 아닌 JSON", encode({ createdAt: 1, id: "a" })],
    ["요소가 하나뿐", encode([1])],
    ["요소가 셋", encode([1, "a", "b"])],
    ["시각이 문자열", encode(["2026-01-01", "a"])],
    ["시각이 음수", encode([-1, "a"])],
    ["시각이 소수", encode([1.5, "a"])],
    ["시각이 Date 범위 밖", encode([9e15, "a"])],
    ["id가 빈 문자열", encode([1, ""])],
    ["id가 숫자", encode([1, 2])],
    ["id가 너무 김", encode([1, "a".repeat(65)])],
    ["전체가 너무 김", "a".repeat(201)],
  ])("%s이면 null을 돌려준다", (_label, value) => {
    expect(decodeCursor(value)).toBeNull();
  });
});
