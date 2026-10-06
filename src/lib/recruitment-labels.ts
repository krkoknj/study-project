import type { MeetingMode, RecruitmentStatus, RecruitmentType } from "@/generated/prisma/enums";

// enum 값의 화면 표시 이름. Record 타입이라 enum에 값이 추가되면 여기서 타입 오류가 난다.

export const recruitmentTypeLabels: Record<RecruitmentType, string> = {
  STUDY: "스터디",
  PROJECT: "프로젝트",
};

export const meetingModeLabels: Record<MeetingMode, string> = {
  ONLINE: "온라인",
  OFFLINE: "오프라인",
  HYBRID: "온·오프라인 혼합",
};

export const recruitmentStatusLabels: Record<RecruitmentStatus, string> = {
  OPEN: "모집중",
  CLOSED: "마감",
};
