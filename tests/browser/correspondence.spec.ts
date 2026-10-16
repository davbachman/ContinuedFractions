import { expect, test, type Page } from "@playwright/test";
import { quotientTrace } from "../../src/math/modular";
const pane = (page: Page, side: string) =>
  page.getByRole("region", { name: `${side} representation`, exact: true });
const select = async (page: Page, i: number) => {
  await page
    .locator(`.comparison-coefficients [data-coefficient="${i}"]`)
    .click();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
};
const number = async (page: Page, value: string) => {
  await page.getByLabel("ENDPOINT α", { exact: true }).fill(value);
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
};
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("edge inspection is shared while the flip pair has one transport", async ({
  page,
}) => {
  await page.goto("/?left=farey&right=triangulation");
  await expect(
    page.getByRole("group", { name: "Flip path transport", exact: true }),
  ).toHaveCount(1);
  await pane(page, "Left").getByTestId("triangulation-slope-0").focus();
  await page.keyboard.press("Enter");
  for (const side of ["Left", "Right"])
    await expect(
      pane(page, side).getByTestId("triangulation-slope-0"),
    ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-disk-edge="0"]')).toHaveAttribute(
    "stroke-width",
    "4",
  );
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page
    .getByRole("button", { name: "Next flip step", exact: true })
    .click();
  for (const side of ["Left", "Right"])
    await expect(
      pane(page, side).getByTestId("triangulation-slope-1"),
    ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Poincare Disk", exact: true }),
  ).toHaveAttribute("data-slopes", "0 | ∞ | 1");
});

test("finite approximation depth stays separate from coefficient inspection and is shared by tangle and braid", async ({
  page,
}) => {
  await page.goto("/?left=tangle&right=braid");
  await number(page, "phi");
  const fraction = page.getByTestId("tangle-fraction");
  const braid = page.getByRole("group", {
    name: "Continued-fraction four-plat diagram",
    exact: true,
  });
  await expect(page.getByLabel("Diagram convergent")).toHaveValue("4");
  await expect(fraction).toHaveText("8/5");
  await expect(braid).toHaveAttribute("data-fraction", "8/5");
  await select(page, 3);
  await expect(page.getByTestId("tangle-run-focus")).toContainText(
    "Merged ending: a3 + a4",
  );
  await expect(page.locator('[data-coefficient-halo="3"]')).toHaveCount(1);
  await select(page, 7);
  await expect(fraction).toHaveText("8/5");
  await expect(braid).toHaveAttribute("data-fraction", "8/5");
  await expect(page.getByTestId("tangle-run-focus")).toContainText(
    "outside this finite prefix",
  );
  await page.getByLabel("Diagram convergent").selectOption("6");
  await expect(fraction).toHaveText("21/13");
  await expect(braid).toHaveAttribute("data-fraction", "21/13");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await pane(page, "Left").locator(".tangle-expression summary").click();
  await page
    .getByRole("button", { name: "Add +1 endpoint twist", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("34/13");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(fraction).toHaveText("21/13");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("rational inspection and coefficient-colored runs agree between both plane models", async ({
  page,
}) => {
  await page.goto("/?left=h2&right=farey");
  await select(page, 2);
  await expect(
    page.getByRole("slider", { name: "Scrub trajectory", exact: true }),
  ).toHaveCount(1);
  await expect(page.locator("canvas[data-inspected-rational]")).toHaveAttribute(
    "data-inspected-rational",
    "1/3",
  );
  await expect(page.locator('g[data-inspected-rational="1/3"]')).toBeVisible();
  await expect(
    page.locator('[data-trajectory-run="2"] path').last(),
  ).toHaveAttribute("stroke", "#6589ab");
  await pane(page, "Right")
    .getByRole("button", { name: "Inspect Ford circle 0", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".shared-inspection")).toContainText("C0: 0");
  await expect(page.locator("canvas[data-inspected-rational]")).toHaveAttribute(
    "data-inspected-rational",
    "0",
  );
  await expect(page.locator('g[data-inspected-rational="0"]')).toBeVisible();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});

test("surface partners mark the same modular copy and genuine seams in both time directions", async ({
  page,
}) => {
  await page.goto("/?left=h2&right=torus");
  const canvas = page.locator("canvas[data-current-domain]"),
    surface = page.locator("svg[data-sheet]");
  const seam = quotientTrace(5 / 13, 8).segments[1].start;
  const clock = page.getByRole("slider", {
    name: "Scrub trajectory",
    exact: true,
  });
  for (const t of [0, seam - 0.01, seam + 0.01, 3, seam - 0.01]) {
    await clock.fill(String(Number(t.toFixed(3))));
    await expect(canvas).toHaveAttribute(
      "data-current-domain",
      (await surface.getAttribute("data-current-domain"))!,
    );
    if (Math.abs(t - seam) < 0.02)
      await expect(canvas).toHaveAttribute(
        "data-seam",
        (await surface.getAttribute("data-seam"))!,
      );
  }
  await pane(page, "Right")
    .getByRole("button", { name: "Torus 3D", exact: true })
    .click();
  await select(page, 2);
  await expect(
    pane(page, "Right").locator('[data-selected-run="2"]').first(),
  ).toBeVisible();
  await expect(
    pane(page, "Right").locator('[data-run-label="2"]'),
  ).toContainText("selected interval");
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("tangle");
  await expect(
    pane(page, "Right").locator('[data-selected-run="2"]').first(),
  ).toBeVisible();
  await expect(page.locator('[data-coefficient-halo="2"]')).toHaveCount(1);
});

test("rectangle captions expose exact CF tails and termination without expanding a help panel", async ({
  page,
}) => {
  await page.goto("/?left=symbolic&right=rectangle");
  await number(page, "13/5");
  await select(page, 0);
  await expect(page.getByTestId("remainder-tail")).toHaveText(
    "Next CF tail [a1; …] = 5/3",
  );
  await select(page, 3);
  await expect(page.getByTestId("remainder-tail")).toHaveText(
    "Remainder 0 · exact termination",
  );
  await number(page, "5/13");
  await select(page, 0);
  await expect(page.getByTestId("remainder-tail")).toHaveText(
    "Next CF tail [a1; …] = 13/5",
  );
  await number(page, "sqrt2");
  await select(page, 5);
  await expect(page.getByTestId("remainder-tail")).toContainText(
    "Next CF tail",
  );
  await expect(page.getByTestId("remainder-tail")).not.toContainText(
    "termination",
  );
});
