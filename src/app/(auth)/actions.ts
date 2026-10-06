"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { fail, validationFail, type Result } from "@/lib/result";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { registerUser } from "@/server/users/user.service";

// 성공하면 리다이렉트하므로 돌려줄 데이터가 없다. null은 아직 제출하지 않은 초기 상태다.
export type AuthFormState = Result<null> | null;

export async function signupAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return validationFail(parsed.error);
  }

  const result = await registerUser(parsed.data);
  if (!result.ok) {
    return result;
  }

  // 가입 직후 바로 로그인 상태로 만든다. signIn은 성공하면 리다이렉트 예외를 던진다.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/",
  });
  return null;
}

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return validationFail(parsed.error);
  }

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    // 자격 증명이 틀린 경우만 사용자에게 알린다. 리다이렉트 예외와 그 밖의 오류는 그대로 던진다.
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return fail("INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    throw error;
  }
  return null;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
