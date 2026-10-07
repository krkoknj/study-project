import type { Prisma } from "@/generated/prisma/client";
import { fail, ok, type Result } from "@/lib/result";
import {
  noFilter,
  type RecruitmentFilter,
  type RecruitmentInput,
} from "@/lib/validation/recruitment";
import { prisma } from "@/server/db";

// 소프트 삭제된 글은 없는 글로 취급한다. 모집글을 읽거나 바꾸는 모든 쿼리에 이 조건을 넣는다.
const notDeleted = { deletedAt: null } satisfies Prisma.RecruitmentWhereInput;

// "지금 신청을 받는 글"의 조건. src/lib/recruitment-status.ts의 isRecruiting과 같은 기준이며 항상 같이 바꾼다.
function recruitingWhere(now: Date) {
  return { status: "OPEN", deadline: { gt: now } } satisfies Prisma.RecruitmentWhereInput;
}

const authorSelect = { id: true, name: true } satisfies Prisma.UserSelect;

const tagsSelect = {
  select: { tag: { select: { name: true } } },
  orderBy: { tag: { name: "asc" } },
} satisfies Prisma.Recruitment$tagsArgs;

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
  tags: tagsSelect,
} satisfies Prisma.RecruitmentSelect;

const detailSelect = {
  ...summarySelect,
  content: true,
  updatedAt: true,
} satisfies Prisma.RecruitmentSelect;

type SummaryRow = Prisma.RecruitmentGetPayload<{ select: typeof summarySelect }>;
type DetailRow = Prisma.RecruitmentGetPayload<{ select: typeof detailSelect }>;

// 연결 테이블의 모양([{ tag: { name } }])을 감추고 태그 이름 목록으로 내보낸다.
type WithTagNames<Row> = Omit<Row, "tags"> & { tags: string[] };

export type RecruitmentSummary = WithTagNames<SummaryRow>;
export type RecruitmentDetail = WithTagNames<DetailRow>;

function withTagNames<Row extends { tags: { tag: { name: string } }[] }>(
  row: Row,
): WithTagNames<Row> {
  return { ...row, tags: row.tags.map(({ tag }) => tag.name) };
}

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

// 글의 태그 구성을 names로 맞춘다. 반드시 글을 저장하는 트랜잭션 안에서 호출한다.
async function replaceTags(tx: Prisma.TransactionClient, recruitmentId: string, names: string[]) {
  await tx.recruitmentTag.deleteMany({ where: { recruitmentId } });
  if (names.length === 0) {
    return;
  }

  // 정렬: 여러 요청이 겹치는 태그를 서로 다른 순서로 넣으면 교착 상태가 생길 수 있다.
  const sorted = [...names].sort();

  // 없는 태그만 만든다 (INSERT ... ON CONFLICT DO NOTHING). "조회 후 삽입"과 달리
  // 같은 새 태그를 동시에 만들어도 유니크 제약 위반이 나지 않는다.
  await tx.tag.createMany({ data: sorted.map((name) => ({ name })), skipDuplicates: true });

  const tags = await tx.tag.findMany({ where: { name: { in: sorted } }, select: { id: true } });
  await tx.recruitmentTag.createMany({
    data: tags.map((tag) => ({ recruitmentId, tagId: tag.id })),
  });
}

// actorId는 항상 세션에서 얻은 값이어야 한다. 요청 본문에서 받은 값을 넘기지 않는다.
export function createRecruitment(
  actorId: string,
  input: RecruitmentInput,
): Promise<{ id: string }> {
  // 글과 태그 연결은 함께 저장되거나 함께 취소된다.
  return prisma.$transaction(async (tx) => {
    const created = await tx.recruitment.create({
      data: { ...toColumns(input), authorId: actorId },
      select: { id: true },
    });
    await replaceTags(tx, created.id, input.tags);
    return created;
  });
}

export async function getRecruitment(id: string): Promise<RecruitmentDetail | null> {
  const row = await prisma.recruitment.findFirst({
    where: { id, ...notDeleted },
    select: detailSelect,
  });
  return row ? withTagNames(row) : null;
}

type ListOptions = {
  // 모집중 판정의 기준 시각. 테스트에서 고정하기 위해 받는다.
  now?: Date;
  limit?: number;
};

// 페이지네이션은 6단계에서 추가한다. 지금은 조건에 맞는 최신 글 일부만 보여 준다.
export async function listRecruitments(
  filter: RecruitmentFilter = noFilter,
  { now = new Date(), limit = 20 }: ListOptions = {},
): Promise<RecruitmentSummary[]> {
  const rows = await prisma.recruitment.findMany({
    where: {
      ...notDeleted,
      // 값이 undefined인 조건은 Prisma가 무시한다.
      type: filter.type,
      mode: filter.mode,
      ...(filter.openOnly ? recruitingWhere(now) : {}),
      // 태그마다 "이 태그가 달려 있다"는 조건을 하나씩 건다. 모두 만족해야 한다 (AND).
      AND: filter.tags.map((name) => ({ tags: { some: { tag: { name } } } })),
    },
    // createdAt이 같은 글의 순서가 매번 달라지지 않도록 id로 한 번 더 정렬한다.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: summarySelect,
  });
  return rows.map(withTagNames);
}

// 권한 조건(author_id)을 WHERE에 넣어 "확인"과 "변경"을 한 문장으로 실행한다.
// 먼저 조회해서 확인한 뒤 변경하면 그 사이에 글이 삭제될 수 있다.
export async function updateRecruitment(
  actorId: string,
  id: string,
  input: RecruitmentInput,
): Promise<Result<{ id: string }>> {
  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.recruitment.updateMany({
      where: { id, authorId: actorId, ...notDeleted },
      data: toColumns(input),
    });
    if (count !== 1) {
      return false;
    }
    // 위 UPDATE가 이 글의 행을 잠그고 있어서, 같은 글을 동시에 수정하는 요청은 여기서 순서대로 처리된다.
    await replaceTags(tx, id, input.tags);
    return true;
  });

  return updated ? ok({ id }) : explainNoRowChanged(id);
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
