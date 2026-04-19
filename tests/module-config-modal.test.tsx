// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { ModuleMeta, ModulesIndexEntry, Page } from "../src/modules/types";

const loaderMocks = vi.hoisted(() => ({
  loadModulesIndex: vi.fn<() => Promise<ModulesIndexEntry[]>>(),
  loadModuleDefinition: vi.fn(),
}));

vi.mock("../src/modules/loader", () => ({
  loadModulesIndex: loaderMocks.loadModulesIndex,
  loadModuleDefinition: loaderMocks.loadModuleDefinition,
}));

import { ModuleConfigModal } from "../src/modules/ui/ModuleConfigModal";

function createMeta(id: string, name = id): ModuleMeta {
  return {
    id,
    name,
    entry: "./index.tsx",
    size: { width: 2, height: 1 },
  };
}

function createEntry(meta: ModuleMeta): ModulesIndexEntry {
  return {
    basePath: `/modules/${meta.id}`,
    meta,
    importers: {
      entry: async () => ({ default: () => null }),
    },
  };
}

function PreviewComponent({ config }: { config: Record<string, unknown> }) {
  return (
    <div data-testid="preview-component">
      Preview title: {String(config.title ?? config.apiKey ?? "empty")}
    </div>
  );
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function settle() {
  await act(async () => {
    await flushMicrotasks();
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function clickButton(label: string) {
  const button = Array.from(document.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label),
  ) as HTMLButtonElement | undefined;

  if (!button) {
    throw new Error(`Button ${label} was not found`);
  }

  button.click();
  return button;
}

describe("ModuleConfigModal", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
        await flushMicrotasks();
      });
    }

    document.body.innerHTML = "";
    root = null;
    container = null;
  });

  async function renderModal({
    meta,
    schema,
    initialConfig = {},
    mode = "edit",
    pages = [],
    onSave = vi.fn(),
  }: {
    meta: ModuleMeta;
    schema: z.ZodTypeAny;
    initialConfig?: Record<string, unknown>;
    mode?: "add" | "edit";
    pages?: Page[];
    onSave?: ReturnType<typeof vi.fn>;
  }) {
    const entry = createEntry(meta);
    loaderMocks.loadModulesIndex.mockResolvedValue([entry]);
    loaderMocks.loadModuleDefinition.mockResolvedValue({
      Component: PreviewComponent,
      configSchema: schema,
    });

    root = createRoot(container!);
    await act(async () => {
      root!.render(
        <ModuleConfigModal
          meta={meta}
          open
          onClose={() => undefined}
          onSave={onSave}
          mode={mode}
          initialConfig={initialConfig}
          pages={pages}
          currentPageId={pages[0]?._id}
        />,
      );
    });
    await settle();

    return { onSave };
  }

  it("renders friendly labels and blocks saving invalid required fields", async () => {
    const meta = createMeta("weather-widget", "Weather Widget");
    const schema = z.object({
      city: z.string().min(1).default("Madrid"),
      apiKey: z.string().min(1),
    });
    const onSave = vi.fn();

    await renderModal({ meta, schema, onSave });

    expect(document.body.textContent).toContain("API key");
    expect(document.body.textContent).not.toContain("apiKey");

    const saveButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Save"),
    ) as HTMLButtonElement;

    expect(saveButton.disabled).toBe(true);

    await act(async () => {
      saveButton.click();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves parsed config after a required field becomes valid", async () => {
    const meta = createMeta("weather-widget", "Weather Widget");
    const schema = z.object({
      city: z.string().min(1).default("Madrid"),
      apiKey: z.string().min(1),
    });
    const onSave = vi.fn();

    await renderModal({ meta, schema, onSave });

    const input = document.querySelector(
      "input[id$='apiKey']",
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();

    await act(async () => {
      setInputValue(input!, "weather-secret");
    });

    await act(async () => {
      clickButton("Save");
    });

    expect(onSave).toHaveBeenCalledWith(
      {
        city: "Madrid",
        apiKey: "weather-secret",
      },
      undefined,
    );
  });

  it("switches preview modes without saving draft config", async () => {
    const meta = createMeta("weather-widget", "Weather Widget");
    const schema = z.object({
      title: z.string().default("Weather"),
    });
    const onSave = vi.fn();

    await renderModal({ meta, schema, onSave, initialConfig: { title: "Desk" } });

    expect(document.body.textContent).toContain("Sample");
    expect(document.body.textContent).toContain("Live");

    await act(async () => {
      clickButton("Live");
    });
    await settle();

    expect(onSave).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Preview title: Desk");
  });

  it("keeps add-mode placement disabled when the selected dashboard is full", async () => {
    const meta = createMeta("weather-widget", "Weather Widget");
    const schema = z.object({
      city: z.string().default("Madrid"),
    });
    const fullPage: Page = {
      _id: "page-1",
      name: "Main",
      slug: "main",
      active: true,
      order: 0,
      modules: [
        {
          _id: "full",
          meta: {
            id: "full",
            name: "Full",
            entry: "./index.tsx",
            size: { width: 4, height: 5 },
          },
          config: {},
          position: { x: 0, y: 0, w: 4, h: 5 },
        },
      ],
    };

    await renderModal({ meta, schema, mode: "add", pages: [fullPage] });

    expect(document.body.textContent).toContain("no longer has space");
    const addButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Add widget"),
    ) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });
});
