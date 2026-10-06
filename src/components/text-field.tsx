import type { ComponentProps } from "react";

type TextFieldProps = Omit<ComponentProps<"input">, "id" | "name"> & {
  name: string;
  label: string;
  hint?: string;
  errors?: string[];
};

// 라벨·입력·오류 메시지를 묶은 입력 칸. 오류는 스크린 리더가 입력 칸과 함께 읽도록 연결한다.
export function TextField({ name, label, hint, errors, ...inputProps }: TextFieldProps) {
  const hasError = Boolean(errors?.length);
  const describedBy = hasError ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100"
        {...inputProps}
      />
      {hasError ? (
        <p id={`${name}-error`} className="text-sm text-red-600">
          {errors?.join(" ")}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-sm text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
