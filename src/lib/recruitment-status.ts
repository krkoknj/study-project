import type { RecruitmentStatus } from "@/generated/prisma/enums";

// "지금 신청을 받는 글인가"의 유일한 기준.
// 상태가 OPEN이어도 마감일이 지났으면 모집중이 아니다. 마감일이 지난 글의 상태를
// CLOSED로 바꾸는 처리는 10단계에서 다루므로, 그 전까지는 조회 시점에 이 함수로 판정한다.
// 같은 조건을 SQL로 쓴 것이 recruitment.service.ts의 recruitingWhere다. 둘은 항상 같이 바꾼다.
export function isRecruiting(
  recruitment: { status: RecruitmentStatus; deadline: Date },
  now: Date,
): boolean {
  return recruitment.status === "OPEN" && recruitment.deadline.getTime() > now.getTime();
}

// 화면에 보여 줄 상태. 저장된 상태가 아니라 위 판정 결과를 따른다.
export function displayStatus(
  recruitment: { status: RecruitmentStatus; deadline: Date },
  now: Date,
): RecruitmentStatus {
  return isRecruiting(recruitment, now) ? "OPEN" : "CLOSED";
}
