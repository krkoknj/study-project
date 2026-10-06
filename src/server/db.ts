import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/env";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// 개발 모드의 핫 리로드는 이 모듈을 반복 평가한다. 그때마다 커넥션 풀이
// 새로 생기지 않도록 클라이언트를 globalThis에 보관해 재사용한다.
const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 유니크 제약 위반(P2002)인지 확인한다. "조회 후 삽입" 대신 삽입을 시도하고
// 이 오류를 잡아야 동시 요청에서도 중복이 생기지 않는다.
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
