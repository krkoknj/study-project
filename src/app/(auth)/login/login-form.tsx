"use client";

import { useActionState, useState } from "react";

import { TextField } from "@/components/form-fields";

import { loginAction } from "../actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [email, setEmail] = useState("");

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
        name="password"
        label="비밀번호"
        type="password"
        autoComplete="current-password"
        required
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
        {isPending ? "로그인하는 중…" : "로그인"}
      </button>
    </form>
  );
}
