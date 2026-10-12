import Link from "next/link";

type PaginationProps = {
  // 첫 페이지가 아닐 때만 넘긴다.
  firstHref?: string;
  // 더 볼 글이 있을 때만 넘긴다.
  nextHref?: string;
};

const linkClassName = "rounded-md px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800";

// 커서 방식에서는 "다음"으로만 이동한다. 이전 페이지는 브라우저의 뒤로 가기로 간다.
export function Pagination({ firstHref, nextHref }: PaginationProps) {
  if (!firstHref && !nextHref) {
    return null;
  }

  return (
    <nav aria-label="페이지 이동" className="flex items-center justify-center gap-1 text-sm">
      {firstHref ? (
        <Link href={firstHref} className={linkClassName}>
          처음으로
        </Link>
      ) : null}
      {nextHref ? (
        <Link href={nextHref} className={linkClassName}>
          다음
        </Link>
      ) : (
        <span className="px-3 py-1 text-zinc-400">마지막 페이지입니다</span>
      )}
    </nav>
  );
}
