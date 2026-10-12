import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  noFilter,
  parsePage,
  parseRecruitmentFilter,
  recruitmentIdSchema,
  recruitmentSchema,
  toFilterQuery,
} from "@/lib/validation/recruitment";

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
      tags: [],
    });
  });

  describe("태그", () => {
    it("한 줄 입력을 정규화된 태그 목록으로 바꾼다", () => {
      const result = recruitmentSchema.parse({ ...valid, tags: "React, TypeScript react" });

      expect(result.tags).toEqual(["react", "typescript"]);
    });

    it("태그가 6개면 거부한다", () => {
      expect(fieldsWithErrors({ ...valid, tags: "a b c d e f" })).toEqual(["tags"]);
    });

    it("허용하지 않는 문자가 있으면 거부한다", () => {
      expect(fieldsWithErrors({ ...valid, tags: "react <script>" })).toEqual(["tags"]);
    });

    it("태그 오류도 다른 필드의 오류와 함께 알려 준다", () => {
      const fields = fieldsWithErrors({ ...valid, title: "a", region: "", tags: "a/b" });

      expect(fields.sort()).toEqual(["region", "tags", "title"]);
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

describe("parseRecruitmentFilter", () => {
  it("쿼리스트링이 없으면 필터가 없다", () => {
    expect(parseRecruitmentFilter({})).toEqual(noFilter);
  });

  it("유형, 진행 방식, 태그, 모집중 여부를 읽는다", () => {
    expect(
      parseRecruitmentFilter({ type: "STUDY", mode: "ONLINE", tag: "react", open: "1" }),
    ).toEqual({ type: "STUDY", mode: "ONLINE", tags: ["react"], openOnly: true });
  });

  it("태그는 반복된 값과 구분자로 이어 쓴 값을 모두 받고 정규화한다", () => {
    expect(parseRecruitmentFilter({ tag: ["React", "typescript"] }).tags).toEqual([
      "react",
      "typescript",
    ]);
    expect(parseRecruitmentFilter({ tag: "React, typescript react" }).tags).toEqual([
      "react",
      "typescript",
    ]);
  });

  it("정의되지 않은 값은 오류 없이 무시한다", () => {
    expect(
      parseRecruitmentFilter({ type: "PARTY", mode: ["ONLINE", "OFFLINE"], open: "yes" }),
    ).toEqual(noFilter);
  });

  it("규칙에 맞지 않는 태그는 버리고 최대 5개까지만 쓴다", () => {
    expect(parseRecruitmentFilter({ tag: "react <script> a/b" }).tags).toEqual(["react"]);
    expect(parseRecruitmentFilter({ tag: "a b c d e f g" }).tags).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("객체가 아닌 입력도 필터 없음으로 처리한다", () => {
    expect(parseRecruitmentFilter(null)).toEqual(noFilter);
  });
});

describe("toFilterQuery", () => {
  it("기본값인 항목은 주소에 넣지 않는다", () => {
    expect(toFilterQuery(noFilter)).toBe("");
  });

  it("특수문자가 있는 태그를 인코딩하고, 다시 읽으면 같은 필터가 된다", () => {
    const filter = {
      type: "PROJECT",
      mode: "HYBRID",
      tags: ["c++", "c#"],
      openOnly: true,
    } as const;

    const query = toFilterQuery({ ...filter, tags: [...filter.tags] });

    expect(query).toBe("type=PROJECT&mode=HYBRID&tag=c%2B%2B&tag=c%23&open=1");
    const params = new URLSearchParams(query);
    expect(
      parseRecruitmentFilter({
        type: params.get("type"),
        mode: params.get("mode"),
        tag: params.getAll("tag"),
        open: params.get("open"),
      }),
    ).toEqual(filter);
  });
});

describe("parsePage", () => {
  it.each([
    ["1", 1],
    ["7", 7],
    [" 3 ", 3],
    ["100000", 100000],
  ])("%j는 %i페이지다", (value, expected) => {
    expect(parsePage(value)).toBe(expected);
  });

  it.each([
    ["없음", undefined],
    ["빈 문자열", ""],
    ["0", "0"],
    ["음수", "-2"],
    ["소수", "2.5"],
    ["숫자가 아님", "abc"],
    ["상한 초과", "100001"],
    ["지수 표기로 상한 초과", "1e20"],
    ["반복된 값", ["2", "3"]],
    ["null", null],
  ])("잘못된 값(%s)은 1페이지로 처리한다", (_label, value) => {
    expect(parsePage(value)).toBe(1);
  });
});

describe("toFilterQuery의 페이지", () => {
  it("1페이지는 주소에 넣지 않고 2페이지부터 넣는다", () => {
    expect(toFilterQuery(noFilter, 1)).toBe("");
    expect(toFilterQuery(noFilter, 3)).toBe("page=3");
    expect(toFilterQuery({ ...noFilter, type: "STUDY" }, 2)).toBe("type=STUDY&page=2");
  });
});

describe("recruitmentIdSchema", () => {
  it("cuid 형식만 통과시킨다", () => {
    expect(recruitmentIdSchema.safeParse("cmgf1x2y30000abcd1234efgh").success).toBe(true);
    expect(recruitmentIdSchema.safeParse("1 OR 1=1").success).toBe(false);
    expect(recruitmentIdSchema.safeParse("").success).toBe(false);
  });
});
