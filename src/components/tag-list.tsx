import Link from "next/link";

import { noFilter, toFilterQuery } from "@/lib/validation/recruitment";

// 태그를 누르면 그 태그 하나로 거른 목록으로 이동한다.
export function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            href={`/?${toFilterQuery({ ...noFilter, tags: [tag] })}`}
            className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:border-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-100"
          >
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
