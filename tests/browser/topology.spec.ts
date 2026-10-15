import { dragSurface } from "./rotation";
import { test, expect, type Page } from "@playwright/test";
async function number(page: Page, value: string) {
  await page.getByLabel("ENDPOINT α").fill(value);
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
}
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
test.beforeEach(async ({ page }) => {
  await page.goto("/?layout=atlas");
});

test("six-sheet cover follows forward and reverse time and survives view changes", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (info.project.name === "mobile")
    await button(page, "02 Modular quotient").click();
  await button(page, "Punctured torus").click();
  const flat = page.getByRole("img", {
    name: "Six-sheet punctured torus hexagon",
  });
  await expect(flat).toBeVisible();
  await page.getByRole("slider", { name: "Scrub trajectory" }).fill("5");
  const sheet = await flat.getAttribute("data-sheet");
  await page.getByRole("slider", { name: "Scrub trajectory" }).fill("1");
  await page.getByRole("slider", { name: "Scrub trajectory" }).fill("5");
  await expect(flat).toHaveAttribute("data-sheet", sheet!);
  await page.getByLabel("Cover lift", { exact: true }).selectOption("3");
  await expect(flat).not.toHaveAttribute("data-sheet", sheet!);
  await page.getByLabel("Cover trail", { exact: true }).uncheck();
  await page.getByLabel("Cover trail", { exact: true }).check();
  await page
    .locator(".torus-view")
    .count()
    .then(async (count) => {
      const target = count ? page.locator(".torus-view") : flat;
      await target.screenshot({
        path: `test-results/${info.project.name}-torus-flat.png`,
      });
    });
  await button(page, "Torus 3D").click();
  const torus = page.getByRole("img", {
    name: "Schematic six-sheet punctured torus",
  });
  await dragSurface(page, torus, info.project.name === "mobile");
  await expect(torus).toBeVisible();
  await torus.screenshot({
    path: `test-results/${info.project.name}-torus-3d.png`,
  });
  await button(page, "Rectangle dissection").click();
  await button(page, "Hyperbolic plane").click();
  if (info.project.name === "mobile")
    await button(page, "02 Modular quotient").click();
  await expect(torus).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Scrub trajectory" }),
  ).toHaveValue("5");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  expect(errors).toEqual([]);
});

test("signed tangle edits, inverse operations, infinity, and undo synchronize shared views", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await button(page, "Zero tangle").click();
  await button(page, "Add +1 endpoint twist").click();
  await button(page, "Add −1 endpoint twist").click();
  await expect(page.getByTestId("tangle-fraction")).toHaveText("0");
  const diagram = page.getByRole("img", {
    name: "Over-under rational tangle diagram",
  });
  await expect(diagram).toHaveAttribute("data-operations", "2");
  await button(page, "Undo number edit").click();
  await expect(page.getByTestId("tangle-fraction")).toHaveText("1");
  await button(page, "Redo number edit").click();
  await expect(diagram).toHaveAttribute("data-operations", "2");
  await button(page, "Quarter-turn ↺").click();
  await expect(page.getByTestId("tangle-fraction")).toHaveText("∞");
  await button(page, "Rectangle dissection").click();
  await expect(page.locator(".rectangle-unavailable")).toContainText(
    "infinity",
  );
  await button(page, "Quarter-turn ↺").click();
  await expect(page.getByTestId("tangle-fraction")).toHaveText("0");
  await button(page, "Select twist region 1").click();
  await page.getByLabel("Selected twist region count").fill("3");
  await button(page, "Apply twist count").click();
  await expect(page.getByTestId("tangle-fraction")).toHaveText("2");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("2");
  await expect(page.locator(".dissection-status")).toContainText(
    "Exact termination",
  );
  await page.locator("#coefficient-input").fill("4");
  await button(page, "Apply coefficient").click();
  await expect(page.getByTestId("tangle-fraction")).toHaveText("4");
  await expect(diagram).toHaveAttribute("data-operations", "1");
  await button(page, "Undo number edit").click();
  await expect(diagram).toHaveAttribute("data-operations", "4");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("cf-atlas-scene") || "{}").scene
            ?.tangle?.length,
      ),
    )
    .toBe(4);
  await page.reload();
  await expect(diagram).toHaveAttribute("data-operations", "4");
  await expect(page.getByTestId("tangle-fraction")).toHaveText("2");
  expect(errors).toEqual([]);
});

test("tangle diagrams and 3D rotation", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await number(page, "5/2");
  await expect(
    page.getByRole("img", { name: "Over-under rational tangle diagram" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Numerator closure", { exact: true }),
  ).toHaveCount(0);
  await page
    .locator(".tangle-panel")
    .screenshot({ path: `test-results/${info.project.name}-tangle.png` });
  await button(page, "Lifted tangle 3D").click();
  await dragSurface(
    page,
    page.getByRole("img", { name: "Lifted 3D rational tangle" }),
    info.project.name === "mobile",
  );
  await page
    .getByRole("img", { name: "Lifted 3D rational tangle" })
    .screenshot({ path: `test-results/${info.project.name}-tangle-3d.png` });
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/2");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("irrational tangles label selected convergents and editing explicitly makes the number rational", async ({
  page,
}) => {
  await page.getByLabel("ENDPOINT α").fill("phi");
  await button(page, "Apply endpoint").click();
  await expect(
    page.locator(".tangle-panel .tangle-approximation"),
  ).toContainText("does not represent the exact irrational");
  await page.getByLabel("Tangle convergent", { exact: true }).selectOption("4");
  await expect(page.getByTestId("tangle-fraction")).toHaveText("8/5");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await button(page, "Add +1 endpoint twist").click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await expect(page.locator(".tangle-panel .tangle-approximation")).toHaveCount(
    0,
  );
  await button(page, "Undo number edit").click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await expect(
    page.locator(".tangle-panel .tangle-approximation"),
  ).toBeVisible();
});

test("large twist groups disclose display limits without expanding crossings", async ({
  page,
}) => {
  await number(page, "1/1000000000000");
  const diagram = page.getByRole("img", {
    name: "Over-under rational tangle diagram",
  });
  await expect(diagram).toHaveAttribute("data-boxes", "1");
  await expect(button(page, "Lifted tangle 3D")).toBeDisabled();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("1/1000000000000");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
