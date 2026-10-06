import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { findUserById, type PublicUser } from "@/server/users/user.service";

export type SessionUser = { id: string; name: string; email: string };

// 쿠키의 JWT만 확인한다. DB를 조회하지 않으므로 빠르지만, 탈퇴·삭제된 사용자의
// 세션도 만료 전까지는 유효하게 보인다. 화면 표시처럼 틀려도 피해가 없는 곳에만 쓴다.
export async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.name || !user.email) {
    return null;
  }
  return { id: user.id, name: user.name, email: user.email };
}

// JWT를 확인한 뒤 DB에 사용자가 실제로 있는지까지 확인한다.
// 데이터를 바꾸는 모든 작업은 이 함수로 요청자를 얻는다. 로그인하지 않았으면 로그인 페이지로 보낸다.
// cache: 한 요청 안에서 여러 번 불러도 DB 조회는 한 번만 한다.
export const requireUser = cache(async (): Promise<PublicUser> => {
  const session = await getSession();
  const user = session ? await findUserById(session.id) : null;
  if (!user) {
    redirect("/login");
  }
  return user;
});
