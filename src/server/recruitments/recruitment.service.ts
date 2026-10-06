import type { Prisma } from "@/generated/prisma/client";
import { fail, ok, type Result } from "@/lib/result";
import type { RecruitmentInput } from "@/lib/validation/recruitment";
import { prisma } from "@/server/db";

// 소프트 삭제된 글은 없는 글로 취급한다. 모집글을 읽거나 바꾸는 모든 쿼리에 이 조건을 넣는다.
const notDeleted = { deletedAt: null } satisfies Prisma.RecruitmentWhereInput;

const authorSelect = { id: true, name: true } satisfies Prisma.UserSelect;

const summarySelect = {
  id: true,
  title: true,
  type: true,
  capacity: true,
  mode: true,
  region: true,
  deadline: true,
  status: true,
  createdAt: true,
  author: { select: authorSelect },
} satisfies Prisma.RecruitmentSelect;

const detailSelect = {
  ...summarySelect,
  content: true,
  updatedAt: true,
} satisfies Prisma.RecruitmentSelect;

export type RecruitmentSummary = Prisma.RecruitmentGetPayload<{ select: typeof summarySelect }>;
export type RecruitmentDetail = Prisma.RecruitmentGetPayload<{ select: typeof detailSelect }>;

// 저장할 컬럼을 하나씩 적는다. input을 통째로 넘기지 않으므로 의도하지 않은 컬럼이 쓰일 수 없다.
function toColumns(input: RecruitmentInput) {
  return {
    title: input.title,
    content: input.content,
    type: input.type,
    capacity: input.capacity,
    mode: input.mode,
    region: input.region,
    deadline: input.deadline,
  };
}

// actorId는 항상 세션에서 얻은 값이어야 한다. 요청 본문에서 받은 값을 넘기지 않는다.
export function createRecruitment(
  actorId: string,
  input: RecruitmentInput,
): Promise<{ id: string }> {
  return prisma.recruitment.create({
    data: { ...toColumns(input), authorId: actorId },
    select: { id: true },
  });
}

export function getRecruitment(id: string): Promise<RecruitmentDetail | null> {
  return prisma.recruitment.findFirst({ where: { id, ...notDeleted }, select: detailSelect });
}

// 필터와 페이지네이션은 5·6단계에서 추가한다. 지금은 최신 글 일부만 보여 준다.
export function listRecruitments(limit = 20): Promise<RecruitmentSummary[]> {
  return prisma.recruitment.findMany({
    where: notDeleted,
    // createdAt이 같은 글의 순서가 매번 달라지지 않도록 id로 한 번 더 정렬한다.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: summarySelect,
  });
}

// 권한 조건(author_id)을 WHERE에 넣어 "확인"과 "변경"을 한 문장으로 실행한다.
// 먼저 조회해서 확인한 뒤 변경하면 그 사이에 글이 삭제될 수 있다.
export async function updateRecruitment(
  actorId: string,
  id: string,
  input: RecruitmentInput,
): Promise<Result<{ id: string }>> {
  const { count } = await prisma.recruitment.updateMany({
    where: { id, authorId: actorId, ...notDeleted },
    data: toColumns(input),
  });

  return count === 1 ? ok({ id }) : explainNoRowChanged(id);
}

// 행을 지우지 않고 deleted_at만 채운다. 신청·댓글 이력이 남고 실수로 지운 글을 되살릴 수 있다.
export async function deleteRecruitment(actorId: string, id: string): Promise<Result<null>> {
  const { count } = await prisma.recruitment.updateMany({
    where: { id, authorId: actorId, ...notDeleted },
    data: { deletedAt: new Date() },
  });

  return count === 1 ? ok(null) : explainNoRowChanged(id);
}

// 바뀐 행이 없을 때 이유를 구분한다. 변경은 이미 거부된 뒤이므로 이 조회는 안내 문구에만 영향을 준다.
async function explainNoRowChanged(id: string): Promise<Result<never>> {
  const existing = await prisma.recruitment.findFirst({
    where: { id, ...notDeleted },
    select: { id: true },
  });

  return existing
    ? fail("FORBIDDEN", "작성자만 수정하거나 삭제할 수 있습니다.")
    : fail("NOT_FOUND", "모집글을 찾을 수 없습니다.");
}
