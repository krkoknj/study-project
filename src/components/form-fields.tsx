import type { ComponentProps, ReactNode } from "react";

type FieldProps = {
  name: string;
  label: string;
  hint?: string;
  errors?: string[];
};

const controlClassName =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 disabled:opacity-50 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

// 오류나 안내 문구를 스크린 리더가 입력 칸과 함께 읽도록 연결하는 속성.
function ariaProps({ name, hint, errors }: FieldProps) {
  const hasError = Boolean(errors?.length);
  return {
    "aria-invalid": hasError,
    "aria-describedby": hasError ? `${name}-error` : hint ? `${name}-hint` : undefined,
  };
}

// 라벨·입력·오류 메시지를 묶는 틀.
function Field({ name, label, hint, errors, children }: FieldProps & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {errors?.length ? (
        <p id={`${name}-error`} className="text-sm text-red-600">
          {errors.join(" ")}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-sm text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type ControlProps<T extends "input" | "textarea" | "select"> = FieldProps &
  Omit<ComponentProps<T>, "id" | "name">;

export function TextField({ name, label, hint, errors, ...props }: ControlProps<"input">) {
  const field = { name, label, hint, errors };
  return (
    <Field {...field}>
      <input id={name} name={name} className={controlClassName} {...ariaProps(field)} {...props} />
    </Field>
  );
}

export function TextareaField({ name, label, hint, errors, ...props }: ControlProps<"textarea">) {
  const field = { name, label, hint, errors };
  return (
    <Field {...field}>
      <textarea
        id={name}
        name={name}
        className={controlClassName}
        {...ariaProps(field)}
        {...props}
      />
    </Field>
  );
}

export function SelectField({
  name,
  label,
  hint,
  errors,
  options,
  ...props
}: ControlProps<"select"> & { options: Record<string, string> }) {
  const field = { name, label, hint, errors };
  return (
    <Field {...field}>
      <select id={name} name={name} className={controlClassName} {...ariaProps(field)} {...props}>
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  );
}
