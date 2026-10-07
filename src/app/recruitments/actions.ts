"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, validationFail, type Result } from "@/lib/result";
import { recruitmentIdSchema, recruitmentSchema } from "@/lib/validation/recruitment";
import { requireUser } from "@/server/auth/session";
import {
  createRecruitment,
  deleteRecruitment,
  updateRecruitment,
} from "@/server/recruitments/recruitment.service";

// 성공하면 리다이렉트하므로 돌려줄 데이터가 없다. null은 아직 제출하지 않은 초기 상태다.
export type RecruitmentFormState = Result<null> | null;

function parseForm(formData: FormData) {
  return recruitmentSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    type: formData.get("type"),
    capacity: formData.get("capacity"),
    mode: formData.get("mode"),
    region: formData.get("region"),
    deadline: formData.get("deadline"),
    tags: formData.get("tags"),
  });
}

// 클라이언트가 보낸 id는 형식부터 확인한다. 형식이 틀리면 없는 글과 같게 취급한다.
function parseId(id: unknown) {
  const parsed = recruitmentIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

const notFound = () => fail("NOT_FOUND", "모집글을 찾을 수 없습니다.");

export async function createRecruitmentAction(
  _previous: RecruitmentFormState,
  formData: FormData,
): Promise<RecruitmentFormState> {
  const user = await requireUser();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return validationFail(parsed.error);
  }

  const { id } = await createRecruitment(user.id, parsed.data);

  revalidatePath("/");
  redirect(`/recruitments/${id}`);
}

// 폼에서 .bind(null, id)로 대상 글을 묶어서 쓴다.
export async function updateRecruitmentAction(
  rawId: string,
  _previous: RecruitmentFormState,
  formData: FormData,
): Promise<RecruitmentFormState> {
  const user = await requireUser();

  const id = parseId(rawId);
  if (!id) {
    return notFound();
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return validationFail(parsed.error);
  }

  const result = await updateRecruitment(user.id, id, parsed.data);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/");
  redirect(`/recruitments/${id}`);
}

export async function deleteRecruitmentAction(rawId: string): Promise<RecruitmentFormState> {
  const user = await requireUser();

  const id = parseId(rawId);
  if (!id) {
    return notFound();
  }

  const result = await deleteRecruitment(user.id, id);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/");
  redirect("/");
}
