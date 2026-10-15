import { test, expect, type Page } from "@playwright/test";
const right = (p: Page) =>
  p.getByRole("region", { name: "Right representation", exact: true });
async function number(page: Page, value: string) {
  await page.getByLabel("ENDPOINT α").fill(value);
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
}
test("torus basis, winding counts and tracing explain the slope without editing it", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?left=tangle&right=pillowcase");
  await number(page, "2/3");
  const panel = right(page),
    svg = panel.getByRole("img", {
      name: "Marked branched-cover torus with two parallel meridians",
      exact: true,
    });
  await expect(panel.locator('[data-winding="u"]')).toHaveText("q = 3");
  await expect(panel.locator('[data-winding="v"]')).toHaveText("p = 2");
  await expect(svg.locator("[data-torus-basis]")).toHaveCount(2);
  await expect(svg.locator("[data-torus-lift]")).toHaveCount(2);
  const curve = await svg
    .locator('[data-torus-lift="A"] path')
    .last()
    .getAttribute("d");
  await panel
    .getByRole("button", { name: "Loop A · lift 1", exact: true })
    .click();
  await expect(svg.locator('[data-torus-lift="B"]')).toHaveAttribute(
    "opacity",
    "0.16",
  );
  const marker = svg.locator('[data-lift-marker="A"] circle'),
    before = await marker.getAttribute("cx");
  await panel.getByRole("slider", { name: "Trace lifted curve" }).fill("500");
  await expect(marker).not.toHaveAttribute("cx", before!);
  await expect(panel.getByTestId("pillow-trace-readout")).toContainText(
    "U turns: 3/2 · V turns: 1",
  );
  await expect(panel.locator("[data-pillow-trace]")).toHaveCount(1);
  await expect(
    svg.locator('[data-torus-lift="A"] path').last(),
  ).toHaveAttribute("d", curve!);
  await panel.getByRole("slider", { name: "Trace lifted curve" }).fill("1000");
  await expect(panel.getByTestId("pillow-trace-readout")).toContainText(
    "U turns: 3 · V turns: 2",
  );
  expect(Number(await marker.getAttribute("cx"))).toBeCloseTo(
    Number(before),
    7,
  );
  await panel.getByRole("slider", { name: "Trace lifted curve" }).fill("370");
  await svg.press("ArrowRight");
  await expect(panel.locator('[data-winding="u"]')).toHaveText("q = 3");
  await panel.getByLabel("Show coordinate loops", { exact: true }).uncheck();
  await expect(svg.locator("[data-torus-basis]")).toHaveCount(0);
  await panel.getByLabel("Show coordinate loops", { exact: true }).check();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("2/3");
  await svg.screenshot({
    path: `test-results/${info.project.name}-pillowcase-annotations.png`,
  });
  await panel.locator(".pillowcase-grid").screenshot({
    path: `test-results/${info.project.name}-pillowcase-correspondence.png`,
  });
  await panel
    .getByRole("button", { name: "Dehn twist +1", exact: true })
    .click();
  await expect(panel.locator('[data-winding="v"]')).toHaveText("p = 5");
  await expect(
    panel.getByRole("slider", { name: "Trace lifted curve" }),
  ).toHaveValue("0");
  await expect(page.getByTestId("tangle-fraction").first()).toHaveText("5/3");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(panel.locator('[data-winding="v"]')).toHaveText("p = 2");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("signed, zero, infinity and large slopes keep honest winding counts; irrationals use the labeled convergent", async ({
  page,
}) => {
  await page.goto("/?left=symbolic&right=pillowcase");
  const panel = right(page);
  for (const [input, u, v, explanation] of [
    ["-2/3", "3", "-2", "opposite to the V arrow"],
    ["0", "1", "0", "no V winding"],
    ["infinity", "0", "1", "no U winding"],
    ["10000", "1", "10000", "Tracing is unavailable"],
  ]) {
    await number(page, input);
    await expect(panel.locator('[data-winding="u"]')).toHaveText(`q = ${u}`);
    await expect(panel.locator('[data-winding="v"]')).toHaveText(`p = ${v}`);
    await expect(panel).toContainText(explanation);
  }
  await expect(
    panel.getByRole("slider", { name: "Trace lifted curve" }),
  ).toBeDisabled();
  await expect(panel.locator("[data-lift-marker]")).toHaveCount(0);
  await number(page, "phi");
  await expect(panel.locator(".tangle-approximation")).toContainText(
    "Approximation: convergent",
  );
  await expect(
    panel.getByRole("slider", { name: "Trace lifted curve" }),
  ).toBeEnabled();
  await panel.getByRole("slider", { name: "Trace lifted curve" }).fill("700");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
});
