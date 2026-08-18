import { readFileSync } from "node:fs";
import { join } from "node:path";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/(game)/page";

// Home page is a Next JSX file; vitest node has no automatic runtime.
(globalThis as { React?: typeof React }).React = React;

const ROOT = join(__dirname, "..");
const LANDING = "app/(game)/page.tsx";

const PROTOTYPE_HERO = "Later you will command the line. Today you learn to stand.";

describe("Landing sells four-fort domination (AMC-8964e8d9)", () => {
  it("source no longer ships the physics-prototype hero or 1/2/3 hit-test keys", () => {
    const source = readFileSync(join(ROOT, LANDING), "utf8");

    expect(source).not.toContain(PROTOTYPE_HERO);
    expect(source).not.toMatch(/1\s*\/\s*2\s*\/\s*3/);
    expect(source).toContain("AI kings");
    expect(source).toMatch(/forts/i);
    expect(source).toContain("Victory");
    expect(source).toContain("Defeat");
    expect(source).toContain("Four-fort domination");
    expect(source).toContain("Recruit");
    expect(source).toContain("March");
    expect(source).toContain("Capture");
    expect(source).toContain("Enter the field");
    expect(source).toContain("Shield Wall");
    expect(source).toContain('href="/play"');
  });

  it("rendered hero and cards mention forts, AI kings, and Victory/Defeat", () => {
    const html = renderToString(createElement(HomePage));

    expect(html).not.toContain(PROTOTYPE_HERO);
    expect(html).not.toMatch(/1\s*\/\s*2\s*\/\s*3/);
    expect(html).toContain("AI kings");
    expect(html).toMatch(/forts/i);
    expect(html).toContain("Victory");
    expect(html).toContain("Defeat");
    expect(html).toContain("Four-fort domination");
    expect(html).toContain("Recruit");
    expect(html).toContain("March");
    expect(html).toContain("Capture");
    expect(html).toContain("Enter the field");
    expect(html).toContain("Shield Wall");
    expect(html).toContain("/play");
  });
});
