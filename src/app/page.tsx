import Link from "next/link";

import { Pagination } from "@/components/pagination";
import { TagList } from "@/components/tag-list";
import { formatKstDate } from "@/lib/date";
import { countPages } from "@/lib/pagination";
import {
  meetingModeLabels,
  recruitmentStatusLabels,
  recruitmentTypeLabels,
} from "@/lib/recruitment-labels";
import { displayStatus } from "@/lib/recruitment-status";
import { parsePage, parseRecruitmentFilter, toFilterQuery } from "@/lib/validation/recruitment";
import { listRecruitments } from "@/server/recruitments/recruitment.service";

import { RecruitmentFilterForm } from "./recruitment-filter-form";

export default async function Home({ searchParams }: PageProps<"/">) {
  // 쿼리스트링은 외부 입력이다. 검증을 통과한 값만 조회 조건으로 쓴다.
  const params = await searchParams;
  const filter = parseRecruitmentFilter(params);
  const page = parsePage(params.page);
  // 필터와 화면의 모집중 표시가 같은 시각을 기준으로 판정하도록 한 번만 구한다.
  const now = new Date();
  const { items: recruitments, totalCount } = await listRecruitments(filter, { now, page });
  const totalPages = countPages(totalCount);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">모집글</h1>

      <RecruitmentFilterForm filter={filter} />

      <p className="text-sm text-zinc-500">
        총 {totalCount.toLocaleString("ko-KR")}건 · {page} / {totalPages} 페이지
      </p>

      {recruitments.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {totalCount === 0 ? "조건에 맞는 모집글이 없습니다." : "이 페이지에는 모집글이 없습니다."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {recruitments.map((recruitment) => (
            <li key={recruitment.id} className="flex flex-col gap-1 py-4">
              <p className="text-sm text-zinc-500">
                {recruitmentTypeLabels[recruitment.type]} ·{" "}
                {recruitmentStatusLabels[displayStatus(recruitment, now)]}
              </p>
              <Link href={`/recruitments/${recruitment.id}`} className="font-medium underline">
                {recruitment.title}
              </Link>
              <p className="text-sm text-zinc-500">
                {recruitment.capacity}명 · {meetingModeLabels[recruitment.mode]}
                {recruitment.region ? ` (${recruitment.region})` : ""} ·{" "}
                {formatKstDate(recruitment.deadline)} 마감 · {recruitment.author.name}
              </p>
              <TagList tags={recruitment.tags} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(target) => {
          const query = toFilterQuery(filter, target);
          return query ? `/?${query}` : "/";
        }}
      />
    </main>
  );
}
