import { z } from "zod";

export const PAGE_SIZE = 20;

// 커서: "여기까지 봤다"를 나타내는 위치. 목록의 정렬 기준(작성 시각, id)과 같은 값으로 이뤄진다.
// 작성 시각이 같은 글이 있을 수 있어서 id까지 있어야 한 지점을 정확히 가리킨다.
export type Cursor = { createdAt: Date; id: string };

const payloadSchema = z.tuple([
  // 밀리초 단위 시각. Date가 표현할 수 있는 범위 안이어야 한다.
  z.number().int().min(0).max(8_640_000_000_000_000),
  z.string().min(1).max(64),
]);

// 주소에 넣을 수 있는 문자열로 바꾼다. 내용을 숨기려는 것이 아니라 한 덩어리로 다루기 위한 것이다.
export function encodeCursor(cursor: Cursor): string {
  const payload = JSON.stringify([cursor.createdAt.getTime(), cursor.id]);
  return Buffer.from(payload, "utf8").toString("base64url");
}

// 커서는 사용자가 주소창에서 바꿀 수 있는 입력이다. 형식이 틀리면 null을 돌려주고,
// 부르는 쪽은 이를 "첫 페이지"로 처리한다. 값을 조작해도 공개 목록의 시작 위치만 바뀐다.
export function decodeCursor(value: unknown): Cursor | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    return null;
  }

  try {
    const json: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const parsed = payloadSchema.safeParse(json);
    return parsed.success ? { createdAt: new Date(parsed.data[0]), id: parsed.data[1] } : null;
  } catch {
    return null;
  }
}
