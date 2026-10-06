import Link from "next/link";

import { formatKstDate } from "@/lib/date";
import {
  meetingModeLabels,
  recruitmentStatusLabels,
  recruitmentTypeLabels,
} from "@/lib/recruitment-labels";
import { listRecruitments } from "@/server/recruitments/recruitment.service";

export default async function Home() {
  const recruitments = await listRecruitments();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">모집글</h1>

      {recruitments.length === 0 ? (
        <p className="text-sm text-zinc-500">아직 모집글이 없습니다.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {recruitments.map((recruitment) => (
            <li key={recruitment.id} className="flex flex-col gap-1 py-4">
              <p className="text-sm text-zinc-500">
                {recruitmentTypeLabels[recruitment.type]} ·{" "}
                {recruitmentStatusLabels[recruitment.status]}
              </p>
              <Link href={`/recruitments/${recruitment.id}`} className="font-medium underline">
                {recruitment.title}
              </Link>
              <p className="text-sm text-zinc-500">
                {recruitment.capacity}명 · {meetingModeLabels[recruitment.mode]}
                {recruitment.region ? ` (${recruitment.region})` : ""} ·{" "}
                {formatKstDate(recruitment.deadline)} 마감 · {recruitment.author.name}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
