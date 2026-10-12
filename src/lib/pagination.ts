export const PAGE_SIZE = 20;

// 글이 하나도 없어도 1페이지는 있다고 본다.
export function countPages(totalCount: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

// 현재 페이지 주변의 페이지 번호. 가능한 한 (2 * radius + 1)개를 채운다.
// pageWindow(1, 10) → [1, 2, 3, 4, 5], pageWindow(6, 10) → [4, 5, 6, 7, 8], pageWindow(10, 10) → [6, 7, 8, 9, 10]
export function pageWindow(current: number, totalPages: number, radius = 2): number[] {
  const size = Math.min(totalPages, 2 * radius + 1);
  const start = Math.max(1, Math.min(current - radius, totalPages - size + 1));
  return Array.from({ length: size }, (_, index) => start + index);
}
