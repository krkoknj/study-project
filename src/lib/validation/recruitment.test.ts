import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { recruitmentIdSchema, recruitmentSchema } from "@/lib/validation/recruitment";

// 폼이 보내는 형태 그대로 (모든 값이 문자열)
const valid = {
  title: "알고리즘 스터디 모집",
  content: "주 2회 온라인으로 문제를 풉니다.",
  type: "STUDY",
  capacity: "4",
  mode: "OFFLINE",
  region: "서울 강남",
  deadline: "2026-10-20",
};

function fieldsWithErrors(input: unknown) {
  const result = recruitmentSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
}

beforeEach(() => {
  // 한국 시간 2026-10-20 12:00
  vi.useFakeTimers({ now: new Date("2026-10-20T03:00:00Z") });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recruitmentSchema", () => {
  it("폼 값을 저장할 형태로 바꾼다 (숫자, 마감 시각)", () => {
    expect(recruitmentSchema.parse(valid)).toEqual({
      title: valid.title,
      content: valid.content,
      type: "STUDY",
      capacity: 4,
      mode: "OFFLINE",
      region: "서울 강남",
      deadline: new Date("2026-10-20T14:59:59.999Z"),
    });
  });

  it("정의하지 않은 필드는 버린다", () => {
    const result = recruitmentSchema.parse({
      ...valid,
      authorId: "someone-else",
      status: "CLOSED",
    });

    expect(result).not.toHaveProperty("authorId");
    expect(result).not.toHaveProperty("status");
  });

  describe("지역", () => {
    it("온라인이면 입력한 지역을 버리고 null로 저장한다", () => {
      expect(recruitmentSchema.parse({ ...valid, mode: "ONLINE" }).region).toBeNull();
    });

    it("온라인이면 지역이 없어도 통과한다", () => {
      expect(recruitmentSchema.parse({ ...valid, mode: "ONLINE", region: null }).region).toBeNull();
    });

    it.each(["OFFLINE", "HYBRID"])("%s인데 지역이 비어 있으면 거부한다", (mode) => {
      expect(fieldsWithErrors({ ...valid, mode, region: "   " })).toEqual(["region"]);
      expect(fieldsWithErrors({ ...valid, mode, region: null })).toEqual(["region"]);
    });
  });

  describe("마감일", () => {
    it("오늘 날짜는 허용한다", () => {
      expect(fieldsWithErrors({ ...valid, deadline: "2026-10-20" })).toEqual([]);
    });

    it("어제 날짜는 거부한다", () => {
      expect(fieldsWithErrors({ ...valid, deadline: "2026-10-19" })).toEqual(["deadline"]);
    });

    it("UTC로는 아직 전날이어도 한국 시간 기준으로 판정한다", () => {
      // 한국 시간 2026-10-21 00:30 (UTC로는 10월 20일)
      vi.setSystemTime(new Date("2026-10-20T15:30:00Z"));

      expect(fieldsWithErrors({ ...valid, deadline: "2026-10-20" })).toEqual(["deadline"]);
      expect(fieldsWithErrors({ ...valid, deadline: "2026-10-21" })).toEqual([]);
    });

    it.each(["", "2026-13-01", "2026-02-30", "내일"])(
      "날짜가 아닌 값 %j은 거부한다",
      (deadline) => {
        expect(fieldsWithErrors({ ...valid, deadline })).toEqual(["deadline"]);
      },
    );
  });

  it.each([
    ["제목이 1자", { title: "a" }, "title"],
    ["제목이 101자", { title: "a".repeat(101) }, "title"],
    ["본문이 9자", { content: "123456789" }, "content"],
    ["본문이 5,001자", { content: "a".repeat(5001) }, "content"],
    ["모집 유형이 정의되지 않은 값", { type: "PARTY" }, "type"],
    ["진행 방식이 정의되지 않은 값", { mode: "REMOTE" }, "mode"],
    ["모집 인원이 0명", { capacity: "0" }, "capacity"],
    ["모집 인원이 51명", { capacity: "51" }, "capacity"],
    ["모집 인원이 소수", { capacity: "2.5" }, "capacity"],
    ["모집 인원이 숫자가 아님", { capacity: "많이" }, "capacity"],
    ["모집 인원이 비어 있음", { capacity: "" }, "capacity"],
  ])("%s이면 해당 필드 오류로 거부한다", (_label, override, field) => {
    expect(fieldsWithErrors({ ...valid, ...override })).toEqual([field]);
  });
});

describe("여러 필드가 동시에 틀린 경우", () => {
  it("길이 오류와 필드 간 규칙 오류를 한 번에 모두 알려 준다", () => {
    const fields = fieldsWithErrors({
      ...valid,
      title: "a",
      content: "",
      mode: "OFFLINE",
      region: "",
      deadline: "2026-10-19",
    });

    expect(fields.sort()).toEqual(["content", "deadline", "region", "title"]);
  });

  it("빈 폼을 제출하면 지역 오류도 함께 알려 준다", () => {
    const fields = fieldsWithErrors({
      title: "",
      content: "",
      type: "STUDY",
      capacity: "",
      mode: "HYBRID",
      region: null,
      deadline: "",
    });

    expect(fields.sort()).toEqual(["capacity", "content", "deadline", "region", "title"]);
  });
});

describe("recruitmentIdSchema", () => {
  it("cuid 형식만 통과시킨다", () => {
    expect(recruitmentIdSchema.safeParse("cmgf1x2y30000abcd1234efgh").success).toBe(true);
    expect(recruitmentIdSchema.safeParse("1 OR 1=1").success).toBe(false);
    expect(recruitmentIdSchema.safeParse("").success).toBe(false);
  });
});
