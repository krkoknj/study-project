"use client";

import { useActionState, useState } from "react";

import { TextField } from "@/components/text-field";

import { signupAction } from "../actions";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, null);
  // 제출 후 폼이 초기화되어도 입력한 값이 남도록 직접 관리한다. 비밀번호는 일부러 남기지 않는다.
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const error = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <TextField
        name="email"
        label="이메일"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        errors={error?.fieldErrors?.email}
      />
      <TextField
        name="name"
        label="이름"
        autoComplete="nickname"
        required
        hint="2~20자"
        value={name}
        onChange={(event) => setName(event.target.value)}
        errors={error?.fieldErrors?.name}
      />
      <TextField
        name="password"
        label="비밀번호"
        type="password"
        autoComplete="new-password"
        required
        hint="8자 이상"
        errors={error?.fieldErrors?.password}
      />
      {error && !error.fieldErrors ? (
        <p role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isPending ? "가입하는 중…" : "가입하기"}
      </button>
    </form>
  );
}
