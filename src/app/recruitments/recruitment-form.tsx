"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";

import { SelectField, TextareaField, TextField } from "@/components/form-fields";
import type { MeetingMode, RecruitmentType } from "@/generated/prisma/enums";
import { meetingModeLabels, recruitmentTypeLabels } from "@/lib/recruitment-labels";

import type { RecruitmentFormState } from "./actions";

export type RecruitmentFormValues = {
  title: string;
  content: string;
  type: RecruitmentType;
  capacity: string;
  mode: MeetingMode;
  region: string;
  deadline: string;
  tags: string;
};

type RecruitmentFormProps = {
  action: (state: RecruitmentFormState, formData: FormData) => Promise<RecruitmentFormState>;
  initialValues: RecruitmentFormValues;
  // 마감일로 고를 수 있는 가장 이른 날짜 (오늘). 편의용이며 서버가 다시 검증한다.
  minDeadline: string;
  submitLabel: string;
};

export function RecruitmentForm({
  action,
  initialValues,
  minDeadline,
  submitLabel,
}: RecruitmentFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [values, setValues] = useState(initialValues);

  const error = state && !state.ok ? state.error : null;
  const isOnline = values.mode === "ONLINE";

  function set<K extends keyof RecruitmentFormValues>(key: K, value: RecruitmentFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  // React는 폼 action이 끝나면 폼을 초기화하는데, 이때 <select>는 상태값으로 복원되지 않아
  // 화면과 상태가 어긋난다. 제출을 직접 처리해 초기화가 일어나지 않게 한다.
  // action 속성은 자바스크립트가 로드되기 전의 제출을 위해 남겨 둔다.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        name="title"
        label="제목"
        required
        maxLength={100}
        value={values.title}
        onChange={(event) => set("title", event.target.value)}
        errors={error?.fieldErrors?.title}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="type"
          label="모집 유형"
          options={recruitmentTypeLabels}
          value={values.type}
          onChange={(event) => set("type", event.target.value as RecruitmentType)}
          errors={error?.fieldErrors?.type}
        />
        <TextField
          name="capacity"
          label="모집 인원"
          type="number"
          required
          min={1}
          max={50}
          hint="1~50명"
          value={values.capacity}
          onChange={(event) => set("capacity", event.target.value)}
          errors={error?.fieldErrors?.capacity}
        />
        <SelectField
          name="mode"
          label="진행 방식"
          options={meetingModeLabels}
          value={values.mode}
          onChange={(event) => set("mode", event.target.value as MeetingMode)}
          errors={error?.fieldErrors?.mode}
        />
        <TextField
          name="region"
          label="지역"
          maxLength={50}
          disabled={isOnline}
          hint={isOnline ? "온라인 진행은 지역을 입력하지 않습니다." : "예: 서울 강남"}
          value={isOnline ? "" : values.region}
          onChange={(event) => set("region", event.target.value)}
          errors={error?.fieldErrors?.region}
        />
      </div>
      <TextField
        name="deadline"
        label="마감일"
        type="date"
        required
        min={minDeadline}
        hint="선택한 날이 끝날 때까지(한국 시간) 모집합니다."
        value={values.deadline}
        onChange={(event) => set("deadline", event.target.value)}
        errors={error?.fieldErrors?.deadline}
      />
      <TextField
        name="tags"
        label="기술 스택 태그"
        maxLength={200}
        hint="쉼표나 공백으로 구분해 최대 5개. 예: react, typescript"
        value={values.tags}
        onChange={(event) => set("tags", event.target.value)}
        errors={error?.fieldErrors?.tags}
      />
      <TextareaField
        name="content"
        label="본문"
        required
        rows={10}
        maxLength={5000}
        hint="10자 이상"
        value={values.content}
        onChange={(event) => set("content", event.target.value)}
        errors={error?.fieldErrors?.content}
      />
      {error && !error.fieldErrors ? (
        <p role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isPending ? "저장하는 중…" : submitLabel}
      </button>
    </form>
  );
}
