import { z } from "zod";

export const MAX_TAGS = 5;

// 영문 소문자·숫자·한글로 시작하고, 그 뒤로 + # . - 를 쓸 수 있다 (c++, c#, next.js, spring-boot).
// 문자 범위를 좁게 잡아 자바스크립트의 소문자 변환과 PostgreSQL의 lower() 결과가 항상 같게 한다.
const TAG_PATTERN = /^[a-z0-9가-힣][a-z0-9가-힣+#.-]*$/;

// "React, TypeScript  react" → ["react", "typescript"]
// 쉼표나 공백으로 나누고, 소문자로 바꾸고, 중복을 없앤다. 순서는 처음 나온 순서를 따른다.
export function parseTagInput(raw: string): string[] {
  const names = raw
    .split(/[,\s]+/)
    .map((name) => name.toLowerCase())
    .filter((name) => name.length > 0);

  return [...new Set(names)];
}

export const tagNameSchema = z
  .string()
  .max(30, "태그는 30자 이하여야 합니다.")
  .regex(TAG_PATTERN, "태그는 한글·영문·숫자로 시작하고 + # . - 만 함께 쓸 수 있습니다.");

export const tagListSchema = z
  .array(tagNameSchema)
  .max(MAX_TAGS, `태그는 최대 ${MAX_TAGS}개까지 달 수 있습니다.`);

export function isValidTagName(name: string): boolean {
  return tagNameSchema.safeParse(name).success;
}
