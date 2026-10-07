import Form from "next/form";
import Link from "next/link";

import { SelectField, TextField } from "@/components/form-fields";
import { meetingModeLabels, recruitmentTypeLabels } from "@/lib/recruitment-labels";
import { type RecruitmentFilter, toFilterQuery } from "@/lib/validation/recruitment";

// GET 폼: 제출하면 값이 쿼리스트링이 되고(/?type=STUDY&tag=react), 서버가 그 주소로 다시 조회한다.
// 필터 상태가 주소에 있으므로 링크를 공유할 수 있고 뒤로 가기가 동작한다.
export function RecruitmentFilterForm({ filter }: { filter: RecruitmentFilter }) {
  const query = toFilterQuery(filter);

  return (
    // key: 태그 링크 등으로 필터가 바뀌면 입력 칸을 새 값으로 다시 그린다.
    <Form
      key={query}
      action="/"
      className="grid items-end gap-4 rounded-md border border-zinc-200 p-4 sm:grid-cols-4 dark:border-zinc-800"
    >
      <SelectField
        name="type"
        label="모집 유형"
        options={{ "": "전체", ...recruitmentTypeLabels }}
        defaultValue={filter.type ?? ""}
      />
      <SelectField
        name="mode"
        label="진행 방식"
        options={{ "": "전체", ...meetingModeLabels }}
        defaultValue={filter.mode ?? ""}
      />
      <div className="sm:col-span-2">
        <TextField
          name="tag"
          label="태그"
          placeholder="react, typescript"
          hint="입력한 태그가 모두 달린 글만 보여 줍니다."
          defaultValue={filter.tags.join(", ")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="open" value="1" defaultChecked={filter.openOnly} />
        모집중만 보기
      </label>
      <div className="flex items-center gap-4 sm:col-span-2 sm:justify-end">
        {query ? (
          <Link href="/" className="text-sm text-zinc-500 underline">
            필터 초기화
          </Link>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          적용
        </button>
      </div>
    </Form>
  );
}
