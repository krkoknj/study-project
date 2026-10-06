import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/server/auth/session";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "회원가입" };

export default async function SignupPage() {
  if (await getSession()) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">회원가입</h1>
      <SignupForm />
      <p className="text-sm text-zinc-500">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          로그인
        </Link>
      </p>
    </main>
  );
}
