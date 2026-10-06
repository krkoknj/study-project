"use client";

import { useActionState } from "react";

import { deleteRecruitmentAction } from "../actions";

export function DeleteButton({ recruitmentId }: { recruitmentId: string }) {
  const [state, formAction, isPending] = useActionState(
    deleteRecruitmentAction.bind(null, recruitmentId),
    null,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("이 모집글을 삭제할까요?")) {
          event.preventDefault();
        }
      }}
      className="flex items-center gap-3"
    >
      <button type="submit" disabled={isPending} className="text-sm text-red-600 underline">
        {isPending ? "삭제하는 중…" : "삭제"}
      </button>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error.message}
        </p>
      ) : null}
    </form>
  );
}
