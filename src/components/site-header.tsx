import Link from "next/link";

import { logoutAction } from "@/app/(auth)/actions";
import { getSession } from "@/server/auth/session";

export async function SiteHeader() {
  // 표시용이므로 쿠키만 확인한다 (DB 조회 없음).
  const session = await getSession();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-3 text-sm">
        <Link href="/" className="font-semibold">
          스터디·프로젝트 모집
        </Link>
        {session ? (
          <div className="flex items-center gap-4">
            <span>{session.name}님</span>
            <form action={logoutAction}>
              <button type="submit" className="text-zinc-500 underline">
                로그아웃
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/login">로그인</Link>
            <Link href="/signup">회원가입</Link>
          </div>
        )}
      </nav>
    </header>
  );
}
