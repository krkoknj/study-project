import { describe, expect, it } from "vitest";

import { isValidTagName, parseTagInput, tagListSchema } from "@/lib/validation/tag";

describe("parseTagInput", () => {
  it("쉼표와 공백을 모두 구분자로 쓴다", () => {
    expect(parseTagInput("react, typescript next.js,node")).toEqual([
      "react",
      "typescript",
      "next.js",
      "node",
    ]);
  });

  it("소문자로 바꾸고 중복을 없애며 처음 나온 순서를 지킨다", () => {
    expect(parseTagInput("TypeScript React typescript REACT")).toEqual(["typescript", "react"]);
  });

  it("빈 입력과 구분자뿐인 입력은 빈 목록이 된다", () => {
    expect(parseTagInput("")).toEqual([]);
    expect(parseTagInput(" , ,  ")).toEqual([]);
  });
});

describe("태그 이름 규칙", () => {
  it.each(["react", "c++", "c#", "next.js", "spring-boot", "vue3", "3d", "스프링", "자바스크립트"])(
    "%s는 허용한다",
    (name) => {
      expect(isValidTagName(name)).toBe(true);
    },
  );

  it.each([
    ["대문자", "React"],
    ["기호로 시작", ".net"],
    ["허용하지 않는 기호", "a/b"],
    ["HTML", "<b>"],
    ["31자", "a".repeat(31)],
    ["빈 문자열", ""],
    ["한글 자모만", "ㅋㅋ"],
  ])("%s(%j)는 거부한다", (_label, name) => {
    expect(isValidTagName(name)).toBe(false);
  });
});

describe("tagListSchema", () => {
  it("5개까지 허용하고 6개는 거부한다", () => {
    expect(tagListSchema.safeParse(["a", "b", "c", "d", "e"]).success).toBe(true);
    expect(tagListSchema.safeParse(["a", "b", "c", "d", "e", "f"]).success).toBe(false);
  });
});
