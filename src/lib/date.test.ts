import { describe, expect, it } from "vitest";

import { endOfDayInKst, formatKstDate, toKstIsoDate } from "@/lib/date";

describe("endOfDayInKst", () => {
  it("한국 시간으로 그날의 마지막 순간을 돌려준다", () => {
    expect(endOfDayInKst("2026-10-20").toISOString()).toBe("2026-10-20T14:59:59.999Z");
  });
});

describe("toKstIsoDate", () => {
  it("UTC로는 전날이어도 한국 시간 기준 날짜를 돌려준다", () => {
    // UTC 10월 20일 15:00 = 한국 시간 10월 21일 00:00
    expect(toKstIsoDate(new Date("2026-10-20T15:00:00Z"))).toBe("2026-10-21");
    expect(toKstIsoDate(new Date("2026-10-20T14:59:59Z"))).toBe("2026-10-20");
  });

  it("endOfDayInKst와 서로 되돌릴 수 있다", () => {
    expect(toKstIsoDate(endOfDayInKst("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("formatKstDate", () => {
  it("한국 시간 기준 날짜를 표시 형식으로 돌려준다", () => {
    expect(formatKstDate(new Date("2026-10-20T15:00:00Z"))).toBe("2026. 10. 21.");
  });
});
