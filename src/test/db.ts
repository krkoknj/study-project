import { prisma } from "@/server/db";

// 테스트 사이에 데이터가 섞이지 않도록 모든 테이블을 비운다.
export async function resetDb() {
  await prisma.$executeRaw`
    TRUNCATE TABLE users, recruitments, tags, recruitment_tags, applications, comments, bookmarks
    RESTART IDENTITY CASCADE
  `;
}
