import { test, expect } from "@playwright/test";

for (const layout of ["comparison", "atlas"]) {
  test(`${layout}: tangle zoom preserves the viewed center in 2D and 3D`, async ({
    page,
  }, info) => {
    await page.goto(layout === "atlas" ? "/?layout=atlas" : "/");
    if (layout === "comparison")
      await page
        .getByRole("combobox", { name: "Left representation", exact: true })
        .selectOption("closure");
    else await page.getByLabel("Numerator closure", { exact: true }).check();
    const panel = page.locator(".tangle-panel");
    const viewport = panel.getByRole("region", {
      name: "Scrollable marked tangle diagram",
    });
    const slider = panel.getByRole("slider", { name: "Tangle diagram zoom" });
    const metrics = () =>
      viewport.evaluate((element) => {
        const svg = element.querySelector("svg")!;
        return {
          x: (element.scrollLeft + element.clientWidth / 2) / svg.clientWidth,
          y: (element.scrollTop + element.clientHeight / 2) / svg.clientHeight,
          height: element.getBoundingClientRect().height,
          width: element.getBoundingClientRect().width,
          svgWidth: svg.clientWidth,
          svgHeight: svg.clientHeight,
        };
      });
    const fraction = await panel.getByTestId("tangle-fraction").textContent();
    const initial = await metrics();
    expect(initial.x).toBeCloseTo(0.5, 2);
    expect(initial.y).toBeCloseTo(0.5, 2);
    for (const three of [false, true]) {
      if (three)
        await panel
          .getByRole("button", { name: "Lifted tangle 3D", exact: true })
          .click();
      for (const zoom of [2, 4, 1]) {
        await slider.fill(String(zoom));
        const current = await metrics();
        expect(current.x).toBeCloseTo(0.5, 2);
        expect(current.y).toBeCloseTo(0.5, 2);
        expect(current.height).toBe(initial.height);
        expect(current.width).toBe(initial.width);
        expect(current.svgHeight).toBeCloseTo(initial.svgHeight * zoom, 0);
        expect(current.svgWidth).toBeCloseTo(initial.svgWidth * zoom, 0);
      }
      // Zoom about a user-panned point, not only the original diagram center.
      await slider.fill("2");
      await viewport.evaluate((element) => {
        element.scrollLeft += 30;
        element.scrollTop += 25;
      });
      const panned = await metrics();
      await slider.fill("4");
      const enlarged = await metrics();
      expect(enlarged.x).toBeCloseTo(panned.x, 2);
      expect(enlarged.y).toBeCloseTo(panned.y, 2);
      await slider.fill("1");
    }
    await slider.fill("2");
    await viewport.scrollIntoViewIfNeeded();
    await viewport.screenshot({
      path: `test-results/${info.project.name}-${layout}-tangle-zoom.png`,
    });
    await expect(panel.getByTestId("tangle-fraction")).toHaveText(fraction!);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
}
