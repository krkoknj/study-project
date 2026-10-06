import { z } from "zod";

import { MeetingMode, RecruitmentType } from "@/generated/prisma/enums";
import { endOfDayInKst } from "@/lib/date";

// "2026-10-20" 형식이면서 실제로 존재하는 날짜.
const deadlineSchema = z.iso.date("마감일을 선택해 주세요.");

// 작성과 수정에 같은 규칙을 쓴다. 여기 정의한 필드만 저장되므로
// 폼에 authorId나 status 같은 값을 끼워 넣어도 무시된다.
export const recruitmentSchema = z
  .object({
    title: z
      .string({ error: "제목을 입력해 주세요." })
      .trim()
      .min(2, "제목은 2자 이상이어야 합니다.")
      .max(100, "제목은 100자 이하여야 합니다."),
    content: z
      .string({ error: "본문을 입력해 주세요." })
      .trim()
      .min(10, "본문은 10자 이상이어야 합니다.")
      .max(5000, "본문은 5,000자 이하여야 합니다."),
    type: z.enum(RecruitmentType, "모집 유형을 선택해 주세요."),
    // 폼은 숫자도 문자열로 보내므로 숫자로 바꾼 뒤 검사한다.
    capacity: z.coerce
      .number<string>("모집 인원을 숫자로 입력해 주세요.")
      .int("모집 인원은 정수여야 합니다.")
      .min(1, "모집 인원은 1명 이상이어야 합니다.")
      .max(50, "모집 인원은 50명 이하여야 합니다."),
    mode: z.enum(MeetingMode, "진행 방식을 선택해 주세요."),
    region: z.string().trim().max(50, "지역은 50자 이하여야 합니다.").nullish(),
    deadline: deadlineSchema,
  })
  // 필드끼리 엮인 규칙. transform과 달리 다른 필드에 길이·범위 오류가 있어도 실행되므로
  // 사용자가 모든 오류를 한 번에 볼 수 있다.
  .superRefine((input, context) => {
    // 만나서 진행하면 지역이 있어야 한다.
    if (input.mode !== "ONLINE" && !input.region) {
      context.addIssue({
        code: "custom",
        path: ["region"],
        message: "오프라인·혼합 진행은 지역을 입력해 주세요.",
      });
    }

    // "20일까지"는 한국 시간으로 20일이 끝나는 순간까지다. 오늘 날짜는 허용한다.
    // 날짜 형식이 틀린 값은 위에서 이미 오류가 났으므로 여기서 다시 판정하지 않는다.
    const isRealDate = deadlineSchema.safeParse(input.deadline).success;
    if (isRealDate && endOfDayInKst(input.deadline).getTime() <= Date.now()) {
      context.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "마감일은 오늘 이후여야 합니다.",
      });
    }
  })
  // 검증을 모두 통과한 값만 저장할 형태로 바꾼다. 온라인이면 지역을 저장하지 않는다.
  .transform((input) => ({
    ...input,
    region: input.mode === "ONLINE" ? null : input.region || null,
    deadline: endOfDayInKst(input.deadline),
  }));

export type RecruitmentInput = z.output<typeof recruitmentSchema>;

export const recruitmentIdSchema = z.cuid();
