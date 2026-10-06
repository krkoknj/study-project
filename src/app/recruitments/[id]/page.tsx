import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { formatKstDate } from "@/lib/date";
import {
  meetingModeLabels,
  recruitmentStatusLabels,
  recruitmentTypeLabels,
} from "@/lib/recruitment-labels";
import { getSession } from "@/server/auth/session";
import { getRecruitment } from "@/server/recruitments/recruitment.service";

import { DeleteButton } from "./delete-button";

// 제목(metadata)과 본문이 같은 글을 조회한다. 한 요청 안에서는 DB를 한 번만 읽는다.
const loadRecruitment = cache(getRecruitment);

export async function generateMetadata({
  params,
}: PageProps<"/recruitments/[id]">): Promise<Metadata> {
  const { id } = await params;
  const recruitment = await loadRecruitment(id);
  return { title: recruitment?.title ?? "모집글을 찾을 수 없습니다" };
}

export default async function RecruitmentPage({ params }: PageProps<"/recruitments/[id]">) {
  const { id } = await params;
  const [recruitment, session] = await Promise.all([loadRecruitment(id), getSession()]);

  if (!recruitment) {
    notFound();
  }

  // 버튼을 보여 줄지만 정한다. 실제 권한은 수정·삭제 시 서버가 검증한다.
  const isAuthor = session?.id === recruitment.author.id;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">
          {recruitmentTypeLabels[recruitment.type]} · {recruitmentStatusLabels[recruitment.status]}
        </p>
        <h1 className="text-2xl font-semibold">{recruitment.title}</h1>
        <p className="text-sm text-zinc-500">
          {recruitment.author.name} · {formatKstDate(recruitment.createdAt)} 작성
        </p>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dt className="text-zinc-500">모집 인원</dt>
        <dd>{recruitment.capacity}명</dd>
        <dt className="text-zinc-500">진행 방식</dt>
        <dd>
          {meetingModeLabels[recruitment.mode]}
          {recruitment.region ? ` (${recruitment.region})` : ""}
        </dd>
        <dt className="text-zinc-500">마감일</dt>
        <dd>{formatKstDate(recruitment.deadline)}</dd>
      </dl>

      {/* 본문은 일반 텍스트로만 표시한다. React가 HTML을 이스케이프하고, 줄바꿈은 CSS로 살린다. */}
      <p className="text-sm leading-7 break-words whitespace-pre-wrap">{recruitment.content}</p>

      {isAuthor ? (
        <div className="flex items-center gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <Link href={`/recruitments/${recruitment.id}/edit`} className="text-sm underline">
            수정
          </Link>
          <DeleteButton recruitmentId={recruitment.id} />
        </div>
      ) : null}
    </main>
  );
}
