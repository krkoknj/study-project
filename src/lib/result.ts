import { z } from "zod";

// 서버가 돌려주는 성공·실패의 공통 형식.
// 예상 가능한 실패(검증 오류, 중복, 권한 없음)는 예외로 던지지 않고 이 형식으로 반환한다.
// 예상하지 못한 오류(DB 장애 등)만 예외로 둔다.

export type ErrorCode = "VALIDATION" | "CONFLICT" | "INVALID_CREDENTIALS";

export type FieldErrors = Record<string, string[]>;

export type AppError = {
  code: ErrorCode;
  message: string;
  // 입력 필드별 오류. 폼에서 해당 필드 아래에 표시한다.
  fieldErrors?: FieldErrors;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail(code: ErrorCode, message: string, fieldErrors?: FieldErrors): Result<never> {
  return { ok: false, error: { code, message, fieldErrors } };
}

export function validationFail(error: z.ZodError): Result<never> {
  return fail("VALIDATION", "입력값을 확인해 주세요.", z.flattenError(error).fieldErrors);
}
