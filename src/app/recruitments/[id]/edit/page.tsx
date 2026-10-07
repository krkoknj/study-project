import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { toKstIsoDate } from "@/lib/date";
import { requireUser } from "@/server/auth/session";
import { getRecruitment } from "@/server/recruitments/recruitment.service";

import { updateRecruitmentAction } from "../../actions";
import { RecruitmentForm } from "../../recruitment-form";

export const metadata: Metadata = { title: "모집글 수정" };

export default async function EditRecruitmentPage({
  params,
}: PageProps<"/recruitments/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser();

  const recruitment = await getRecruitment(id);
  // 남의 글의 수정 화면은 없는 페이지로 취급한다. 실제 수정 권한은 Action과 서비스가 다시 검증한다.
  if (!recruitment || recruitment.author.id !== user.id) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">모집글 수정</h1>
      <RecruitmentForm
        action={updateRecruitmentAction.bind(null, recruitment.id)}
        initialValues={{
          title: recruitment.title,
          content: recruitment.content,
          type: recruitment.type,
          capacity: String(recruitment.capacity),
          mode: recruitment.mode,
          region: recruitment.region ?? "",
          deadline: toKstIsoDate(recruitment.deadline),
          tags: recruitment.tags.join(", "),
        }}
        minDeadline={toKstIsoDate(new Date())}
        submitLabel="수정하기"
      />
    </main>
  );
}
