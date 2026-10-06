import type { Metadata } from "next";

import { toKstIsoDate } from "@/lib/date";
import { requireUser } from "@/server/auth/session";

import { createRecruitmentAction } from "../actions";
import { RecruitmentForm } from "../recruitment-form";

export const metadata: Metadata = { title: "모집글 작성" };

export default async function NewRecruitmentPage() {
  // 로그인하지 않았으면 로그인 페이지로 보낸다. Action에서도 다시 확인한다.
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">모집글 작성</h1>
      <RecruitmentForm
        action={createRecruitmentAction}
        initialValues={{
          title: "",
          content: "",
          type: "STUDY",
          capacity: "4",
          mode: "ONLINE",
          region: "",
          deadline: "",
        }}
        minDeadline={toKstIsoDate(new Date())}
        submitLabel="작성하기"
      />
    </main>
  );
}
