import { describe, expect, it } from "vitest";

import type { Page } from "./types";
import {
  getClientDashboardPages,
  getDashboardEditorStats,
  reorderDashboardPageIds,
  selectClientInitialPage,
  selectDashboardPage,
  sortDashboardPages,
} from "./dashboard-pages";

const makePage = (page: Partial<Page> & Pick<Page, "_id" | "order">): Page => ({
  name: page._id,
  slug: page._id,
  active: false,
  modules: [],
  ...page,
});

describe("dashboard page helpers", () => {
  it("sorts dashboard pages by configured order", () => {
    const pages = [
      makePage({ _id: "third", order: 3 }),
      makePage({ _id: "first", order: 1 }),
      makePage({ _id: "second", order: 2 }),
    ];

    expect(sortDashboardPages(pages).map((page) => page._id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("keeps a preferred dashboard selection when it exists", () => {
    const pages = [
      makePage({ _id: "home", order: 1, active: true }),
      makePage({ _id: "ops", order: 2 }),
    ];

    expect(selectDashboardPage(pages, "ops")?._id).toBe("ops");
  });

  it("falls back to the active dashboard and then the first ordered page", () => {
    const activeFallback = [
      makePage({ _id: "archive", order: 1 }),
      makePage({ _id: "live", order: 2, active: true }),
    ];
    const firstFallback = [
      makePage({ _id: "second", order: 2 }),
      makePage({ _id: "first", order: 1 }),
    ];

    expect(selectDashboardPage(activeFallback, "missing")?._id).toBe("live");
    expect(selectDashboardPage(firstFallback, "missing")?._id).toBe("first");
  });

  it("selects the principal dashboard for the client and hides inactive pages", () => {
    const pages = [
      makePage({ _id: "left", order: 1, active: true }),
      makePage({ _id: "hidden", order: 2, active: false, principal: true }),
      makePage({ _id: "main", order: 3, active: true, principal: true }),
      makePage({ _id: "right", order: 4, active: true }),
    ];

    expect(getClientDashboardPages(pages).map((page) => page._id)).toEqual([
      "left",
      "main",
      "right",
    ]);
    expect(selectClientInitialPage(pages)?._id).toBe("main");
  });

  it("reorders dashboard page ids after drag and drop", () => {
    expect(reorderDashboardPageIds(["one", "two", "three"], "one", "three")).toEqual([
      "two",
      "three",
      "one",
    ]);
    expect(reorderDashboardPageIds(["one", "two", "three"], "three", "one")).toEqual([
      "three",
      "one",
      "two",
    ]);
  });

  it("summarizes modules, occupied cells, and repair state", () => {
    const page = makePage({
      _id: "home",
      order: 1,
      modules: [
        {
          _id: "a",
          meta: { id: "a", name: "A", entry: "a.tsx", size: { width: 2, height: 2 } },
          config: {},
          position: { x: 0, y: 0, w: 2, h: 2 },
        },
        {
          _id: "b",
          meta: { id: "b", name: "B", entry: "b.tsx", size: { width: 1, height: 1 } },
          config: {},
          position: { x: 2, y: 0, w: 1, h: 1 },
        },
      ],
    });

    expect(getDashboardEditorStats(page)).toMatchObject({
      moduleCount: 2,
      occupiedCells: 5,
      totalCells: 20,
      needsRepair: false,
      canRepair: false,
    });
  });
});
