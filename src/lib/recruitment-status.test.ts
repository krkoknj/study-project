import { describe, expect, it } from "vitest";

import { displayStatus, isRecruiting } from "@/lib/recruitment-status";

const deadline = new Date("2026-10-20T14:59:59.999Z");
const before = new Date(deadline.getTime() - 1);
const after = new Date(deadline.getTime() + 1);

describe("isRecruiting", () => {
  it("상태가 OPEN이고 마감 전이면 모집중이다", () => {
    expect(isRecruiting({ status: "OPEN", deadline }, before)).toBe(true);
  });

  it("마감 시각이 되는 순간부터 모집중이 아니다", () => {
    expect(isRecruiting({ status: "OPEN", deadline }, deadline)).toBe(false);
    expect(isRecruiting({ status: "OPEN", deadline }, after)).toBe(false);
  });

  it("상태가 CLOSED이면 마감 전이어도 모집중이 아니다", () => {
    expect(isRecruiting({ status: "CLOSED", deadline }, before)).toBe(false);
  });
});

describe("displayStatus", () => {
  it("저장된 상태가 OPEN이어도 마감일이 지났으면 CLOSED로 보여 준다", () => {
    expect(displayStatus({ status: "OPEN", deadline }, before)).toBe("OPEN");
    expect(displayStatus({ status: "OPEN", deadline }, after)).toBe("CLOSED");
  });
});
