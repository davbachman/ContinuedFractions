import { expect, test, type Page } from "@playwright/test";
import {
  visualColors,
  coverSheetColors,
  DOMAIN_FILL_OPACITY,
} from "../../src/renderers/visualColors";
import { stageColor } from "../../src/renderers/dissectionColors";
const choose = (p: Page, side: string, kind: string) =>
  p
    .getByRole("combobox", { name: `${side} representation`, exact: true })
    .selectOption(kind);
const select = (p: Page, i: number) =>
  p.locator(`.comparison-coefficients [data-coefficient="${i}"]`).click();

for (const rectangleSide of ["Left", "Right"]) {
  test(`${rectangleSide} rectangle selection survives partner changes and exact edit/undo/redo`, async ({
    page,
  }, info) => {
    await page.goto(
      rectangleSide === "Left"
        ? "/?left=rectangle&right=symbolic"
        : "/?left=symbolic&right=rectangle",
    );
    await select(page, 2);
    const slider = page.getByRole("slider", { name: "Sequence progress" });
    const time = await slider.inputValue();
    for (const kind of [
      "h2",
      "farey",
      "orbifold",
      "torus",
      "triangulation",
      "tangle",
      "braid",
      "symbolic",
    ]) {
      await choose(page, rectangleSide === "Left" ? "Right" : "Left", kind);
      await expect(
        page.getByLabel("Edit coefficient a2", { exact: true }),
      ).toHaveValue("1");
      await expect(slider).toHaveValue(time);
      await page.getByLabel("Edit coefficient a2", { exact: true }).fill("2");
      await page
        .getByLabel("Edit coefficient a2", { exact: true })
        .press("Enter");
      await expect(page.getByLabel("ENDPOINT α")).toHaveValue("8/19");
      await expect(
        page.getByLabel("Edit coefficient a2", { exact: true }),
      ).toHaveValue("2");
      await page
        .getByRole("button", { name: "Undo number edit", exact: true })
        .click();
      await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
      await expect(
        page.getByLabel("Edit coefficient a2", { exact: true }),
      ).toHaveValue("1");
      await expect(slider).toHaveValue(time);
      await page
        .getByRole("button", { name: "Redo number edit", exact: true })
        .click();
      await expect(page.getByLabel("ENDPOINT α")).toHaveValue("8/19");
      await expect(
        page.getByLabel("Edit coefficient a2", { exact: true }),
      ).toHaveValue("2");
      await page
        .getByRole("button", { name: "Undo number edit", exact: true })
        .click();
    }
    await page.screenshot({
      path: `test-results/${info.project.name}-${rectangleSide}-consistent-rectangle.png`,
      fullPage: true,
    });
  });
}

for (const term of [1, 2]) {
  test(`selecting a${term} seeks the same time with static, hyperbolic, and flip partners`, async ({
    page,
  }) => {
    await page.goto("/?left=symbolic&right=h2");
    await select(page, term);
    const time = await page
      .getByRole("slider", { name: "Scrub trajectory" })
      .inputValue();
    expect(Number(time)).toBeGreaterThan(0);
    for (const kind of [
      "farey",
      "orbifold",
      "torus",
      "triangulation",
      "tangle",
      "braid",
      "rectangle",
    ]) {
      await choose(page, "Right", kind);
      await expect(
        page.getByLabel(`Edit coefficient a${term}`, { exact: true }),
      ).toHaveValue(term === 1 ? "2" : "1");
      await select(page, term);
      if (["farey", "orbifold", "torus", "triangulation"].includes(kind))
        await expect(
          page.getByRole("slider", { name: "Scrub trajectory" }),
        ).toHaveValue(time);
    }
  });
}

test("semantic colors and plane fills remain consistent across surface partners", async ({
  page,
}, info) => {
  await page.goto("/?left=farey&right=h2");
  await expect(page.locator("[data-target-marker] circle")).toHaveAttribute(
    "stroke",
    visualColors.endpoint,
  );
  await expect(page.locator("[data-moving-disk-point]")).toHaveAttribute(
    "fill",
    visualColors.point,
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-farey-coloring",
    "true",
  );
  for (const kind of ["orbifold", "torus"]) {
    await choose(page, "Right", kind);
    await expect(page.locator("[data-moving-surface-point]")).toHaveAttribute(
      "fill",
      visualColors.point,
    );
    await page
      .getByRole("button", {
        name: kind === "torus" ? "Torus 3D" : "Schematic 3D",
        exact: true,
      })
      .click();
    await expect(page.locator("[data-moving-surface-point]")).toHaveAttribute(
      "fill",
      visualColors.point,
    );
  }
  const fills = page.locator("[data-disk-domains] path");
  expect(await fills.count()).toBeGreaterThan(0);
  for (const c of await fills.evaluateAll((ns) => [
    ...new Set(ns.map((n) => n.getAttribute("fill"))),
  ]))
    expect(coverSheetColors).toContain(c);
  await expect(fills.first()).toHaveAttribute(
    "fill-opacity",
    String(DOMAIN_FILL_OPACITY),
  );
  expect(
    coverSheetColors.some((c) =>
      Array.from({ length: 8 }, (_, i) => stageColor(i)).includes(c),
    ),
  ).toBe(false);
  await page.screenshot({
    path: `test-results/${info.project.name}-consistent-cover-colors.png`,
    fullPage: true,
  });
  await choose(page, "Right", "symbolic");
  await choose(page, "Left", "h2");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-farey-coloring",
    "true",
  );
});

test("tangle coefficient colors match braid regions; closure is explicit and survives companion changes", async ({
  page,
}, info) => {
  await page.goto("/?left=tangle&right=braid");
  await select(page, 2);
  await expect(
    page.getByLabel("Numerator closure", { exact: true }),
  ).not.toBeChecked();
  await expect(page.locator("[data-numerator-closure]")).toHaveCount(0);
  for (const mode of ["2D diagram", "Lifted tangle 3D"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    for (const path of await page
      .locator('.tangle-strand[data-active-region="true"]')
      .all())
      await expect(path).toHaveAttribute("stroke", stageColor(2));
    await expect(
      page.locator('[data-braid-coefficient="2"] [data-twist-pair]'),
    ).toHaveAttribute("stroke", stageColor(2));
  }
  await page.getByLabel("Numerator closure", { exact: true }).check();
  await expect(page.locator("[data-numerator-closure]")).toHaveCount(1);
  await page.screenshot({
    path: `test-results/${info.project.name}-consistent-tangle-colors.png`,
    fullPage: true,
  });
  await choose(page, "Right", "symbolic");
  await expect(
    page.getByLabel("Numerator closure", { exact: true }),
  ).toBeChecked();
  await expect(page.locator("[data-numerator-closure]")).toHaveCount(1);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});

test("flip playback keeps constant hyperbolic speed through coefficient boundaries and pauses", async ({
  page,
}) => {
  await page.goto("/?left=h2&right=triangulation");
  const start = new Date("2026-10-16T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  const slider = page.getByRole("slider", { name: "Scrub trajectory" });
  await page.getByRole("button", { name: "Play flips", exact: true }).click();
  for (let seconds = 1; seconds <= 4; seconds++) {
    await page.clock.runFor(1000);
    expect(Number(await slider.inputValue())).toBeCloseTo(seconds, 1);
  }
  await page.getByRole("button", { name: "Pause flips", exact: true }).click();
  const stopped = await slider.inputValue();
  await page.clock.runFor(500);
  await expect(slider).toHaveValue(stopped);
});

test("inspection beyond playback depth preserves the exact coefficient and rectangle group", async ({
  page,
}) => {
  await page.goto("/?left=rectangle&right=symbolic");
  await page.getByLabel("ENDPOINT α").fill("[0;1000000,1,2]");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  const alpha = await page.getByLabel("ENDPOINT α").inputValue();
  await select(page, 2);
  await expect(
    page.getByLabel("Edit coefficient a2", { exact: true }),
  ).toHaveValue("1");
  await expect(
    page.getByRole("group", { name: "Rectangle dissection diagram" }),
  ).toHaveAttribute("data-stage", "2");
  await expect(page.getByTestId("linked-run-status")).toContainText(
    "outside the generated playback path",
  );
  await expect(
    page.getByRole("button", { name: "Play linked playback", exact: true }),
  ).toBeDisabled();
  await choose(page, "Right", "h2");
  await expect(
    page.getByLabel("Edit coefficient a2", { exact: true }),
  ).toHaveValue("1");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue(alpha);
  await select(page, 0);
  await expect(
    page.getByRole("button", { name: "Play linked playback", exact: true }),
  ).toBeEnabled();
});
