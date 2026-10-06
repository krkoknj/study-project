// 이 서비스의 날짜는 모두 한국 시간(KST) 기준이다. 서버가 어느 시간대에서 실행되든 결과가 같아야 한다.

const KST = "Asia/Seoul";

const isoDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: KST });
const displayDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  dateStyle: "medium",
});

// "2026-10-20" → 한국 시간으로 그날의 마지막 순간. "20일까지"는 20일 하루 전체를 포함한다.
export function endOfDayInKst(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999+09:00`);
}

// 시각 → 한국 시간 기준 날짜 "2026-10-20" (input[type=date]의 값 형식)
export function toKstIsoDate(date: Date): string {
  return isoDateFormatter.format(date);
}

// 시각 → 화면 표시용 "2026. 10. 20."
export function formatKstDate(date: Date): string {
  return displayDateFormatter.format(date);
}
