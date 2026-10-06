import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { env } from "@/env";
import { loginSchema } from "@/lib/validation/auth";
import { verifyCredentials } from "@/server/users/user.service";

// 앱 코드는 이 파일의 auth()를 직접 쓰지 않고 src/server/auth/session.ts를 거친다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  // Credentials 로그인은 JWT 세션에서만 동작한다. 세션은 서명·암호화된 쿠키에 담긴다.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // null을 돌려주면 로그인 실패다. 실패 이유(이메일 없음 / 비밀번호 틀림)는 구분하지 않는다.
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }
        return verifyCredentials(parsed.data);
      },
    }),
  ],
  callbacks: {
    // JWT의 sub에 들어 있는 사용자 ID를 세션 객체로 옮긴다.
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
