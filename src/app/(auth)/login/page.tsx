import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/server/auth/session";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage() {
  if (await getSession()) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">로그인</h1>
      <LoginForm />
      <p className="text-sm text-zinc-500">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          회원가입
        </Link>
      </p>
    </main>
  );
}
