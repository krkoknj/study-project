import Link from "next/link";

import { pageWindow } from "@/lib/pagination";

type PaginationProps = {
  page: number;
  totalPages: number;
  // 페이지 번호 → 그 페이지의 주소. 필터를 유지하는 방법은 부르는 쪽이 안다.
  hrefFor: (page: number) => string;
};

const linkClassName = "rounded-md px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800";
const disabledClassName = "px-3 py-1 text-zinc-400";

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1 && page === 1) {
    return null;
  }

  // 마지막 페이지를 넘어선 주소로 들어온 경우에도 "이전"은 실제로 있는 페이지로 보낸다.
  const previous = Math.min(page - 1, totalPages);
  const hasPrevious = previous >= 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="페이지 이동" className="flex items-center justify-center gap-1 text-sm">
      {hasPrevious ? (
        <Link href={hrefFor(previous)} className={linkClassName}>
          이전
        </Link>
      ) : (
        <span className={disabledClassName}>이전</span>
      )}
      {pageWindow(page, totalPages).map((number) =>
        number === page ? (
          <span
            key={number}
            aria-current="page"
            className="rounded-md bg-zinc-900 px-3 py-1 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {number}
          </span>
        ) : (
          <Link key={number} href={hrefFor(number)} className={linkClassName}>
            {number}
          </Link>
        ),
      )}
      {hasNext ? (
        <Link href={hrefFor(page + 1)} className={linkClassName}>
          다음
        </Link>
      ) : (
        <span className={disabledClassName}>다음</span>
      )}
    </nav>
  );
}
