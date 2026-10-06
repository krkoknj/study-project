import { z } from "zod";

// 앞뒤 공백을 지우고 소문자로 바꾼 뒤 형식을 검사한다.
// 같은 주소가 대소문자만 달라 서로 다른 계정이 되는 것을 막는다.
const email = z
  .string({ error: "이메일을 입력해 주세요." })
  .trim()
  .toLowerCase()
  .max(254, "이메일이 너무 깁니다.")
  .pipe(z.email("올바른 이메일 형식이 아닙니다."));

export const signupSchema = z.object({
  email,
  name: z
    .string({ error: "이름을 입력해 주세요." })
    .trim()
    .min(2, "이름은 2자 이상이어야 합니다.")
    .max(20, "이름은 20자 이하여야 합니다."),
  // 길이만 제한한다. 문자 조합 규칙은 두지 않는다 (NIST SP 800-63B).
  // 상한은 지나치게 긴 입력으로 해싱 비용을 키우는 공격을 막기 위한 것이다.
  password: z
    .string({ error: "비밀번호를 입력해 주세요." })
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .max(128, "비밀번호는 128자 이하여야 합니다."),
});

// 로그인에서는 비밀번호 정책을 다시 검사하지 않는다. 틀린 비밀번호는 모두 같은 실패로 처리한다.
export const loginSchema = z.object({
  email,
  password: z
    .string({ error: "비밀번호를 입력해 주세요." })
    .min(1, "비밀번호를 입력해 주세요.")
    .max(128, "비밀번호는 128자 이하여야 합니다."),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
