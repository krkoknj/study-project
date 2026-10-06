import type { Prisma } from "@/generated/prisma/client";
import { fail, ok, type Result } from "@/lib/result";
import type { LoginInput, SignupInput } from "@/lib/validation/auth";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { isUniqueViolation, prisma } from "@/server/db";

// 서버 밖으로 내보내도 되는 사용자 정보. 비밀번호 해시는 포함하지 않는다.
export type PublicUser = { id: string; email: string; name: string };

const publicUserSelect = { id: true, email: true, name: true } satisfies Prisma.UserSelect;

export async function registerUser(input: SignupInput): Promise<Result<PublicUser>> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash },
      select: publicUserSelect,
    });
    return ok(user);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("CONFLICT", "이미 가입된 이메일입니다.", {
        email: ["이미 가입된 이메일입니다."],
      });
    }
    throw error;
  }
}

// 이메일이 없을 때도 같은 시간만큼 해시 검증을 수행하기 위한 값.
// 응답 시간 차이로 가입 여부를 알아내는 것을 막는다.
let dummyHash: Promise<string> | undefined;

function getDummyHash() {
  dummyHash ??= hashPassword("dummy-password-for-timing");
  return dummyHash;
}

// 이메일이 없든 비밀번호가 틀렸든 null을 돌려준다. 호출하는 쪽은 둘을 구분할 수 없다.
export async function verifyCredentials(input: LoginInput): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...publicUserSelect, passwordHash: true },
  });

  if (!user) {
    await verifyPassword(await getDummyHash(), input.password);
    return null;
  }

  const isValid = await verifyPassword(user.passwordHash, input.password);
  if (!isValid) {
    return null;
  }

  return { id: user.id, email: user.email, name: user.name };
}

export function findUserById(id: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}
