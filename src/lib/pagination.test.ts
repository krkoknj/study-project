import { describe, expect, it } from "vitest";

import { countPages, pageWindow } from "@/lib/pagination";

describe("countPages", () => {
  it.each([
    [0, 1],
    [1, 1],
    [20, 1],
    [21, 2],
    [40, 2],
    [41, 3],
  ])("글이 %i건이면 %i페이지다", (totalCount, expected) => {
    expect(countPages(totalCount)).toBe(expected);
  });
});

describe("pageWindow", () => {
  it("현재 페이지를 가운데에 두고 앞뒤 2개씩 보여 준다", () => {
    expect(pageWindow(6, 10)).toEqual([4, 5, 6, 7, 8]);
  });

  it("앞쪽 끝에서는 1부터 5개를 보여 준다", () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(2, 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it("뒤쪽 끝에서는 마지막 5개를 보여 준다", () => {
    expect(pageWindow(10, 10)).toEqual([6, 7, 8, 9, 10]);
    expect(pageWindow(9, 10)).toEqual([6, 7, 8, 9, 10]);
  });

  it("전체 페이지가 5개보다 적으면 있는 만큼만 보여 준다", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });

  it("범위를 벗어난 현재 페이지에서도 존재하는 페이지만 돌려준다", () => {
    expect(pageWindow(99, 3)).toEqual([1, 2, 3]);
  });
});
