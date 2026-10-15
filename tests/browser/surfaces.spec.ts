import { test, expect } from "@playwright/test";
test("surface gestures preserve scene state, support keyboard reset and cancellation, and keep trail clicks", async ({
  page,
}, info) => {
  await page.goto("/?layout=atlas");
  const time = page.getByRole("slider", { name: "Scrub trajectory" });
  await time.fill("5");
  if (info.project.name === "mobile")
    await page
      .getByRole("button", { name: "02 Modular quotient", exact: true })
      .click();
  await page.getByRole("button", { name: "Schematic 3D", exact: true }).click();
  const surface = page.getByRole("img", { name: /Schematic punctured sphere/ });
  await expect(page.getByRole("slider", { name: /Rotate/ })).toHaveCount(0);
  await surface.press("ArrowRight");
  expect(Number(await surface.getAttribute("data-rotation"))).toBeCloseTo(-0.5);
  await expect(time).toHaveValue("5");
  await surface.press("ArrowDown");
  expect(Number(await surface.getAttribute("data-roll"))).toBeCloseTo(-0.1);
  await surface.press("Home");
  await expect(surface).toHaveAttribute("data-roll", "0");
  await expect(surface).toHaveAttribute("data-rotation", "-0.4");
  await surface.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const trail = surface
    .locator('[data-surface-trail][data-surface-front="true"]')
    .first();
  const point = await trail.evaluate((element) => {
    const path = element as SVGPathElement;
    const p = path.getPointAtLength(path.getTotalLength() / 2);
    const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 30, point.y + 30, { steps: 3 });
  await expect(surface).not.toHaveAttribute("data-rotation", "-0.4");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(surface).toHaveAttribute("data-rotation", "-0.4");
  await expect(time).toHaveValue("5");
  await expect(surface).toHaveAttribute("data-roll", "0");
  // A fresh click still seeks, even after a cancelled drag began on a curve.
  await page.mouse.click(point.x, point.y);
  await expect(time).not.toHaveValue("5");
  const clickedTime = await time.inputValue();
  const cusp = surface.locator("text").filter({ hasText: /^cusp$/ });
  const cuspBefore = await cusp.getAttribute("y");
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 35, {
    steps: 4,
  });
  await page.mouse.up();
  await expect(surface).not.toHaveAttribute("data-roll", "0");
  await expect(surface).toHaveAttribute("data-rotation", "-0.4");
  await expect(time).toHaveValue(clickedTime);
  await expect(cusp).not.toHaveAttribute("y", cuspBefore!);
  await surface.screenshot({
    path: `test-results/${info.project.name}-rolled-orbifold.png`,
  });
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(
    page.getByRole("button", { name: "Undo number edit" }),
  ).toBeDisabled();
});
test("domain colors agree across the half-plane and filled translucent quotient surfaces", async ({
  page,
}, info) => {
  await page.goto("/?layout=atlas");
  await page.getByRole("checkbox", { name: "Modular domains" }).check();
  await page.getByRole("checkbox", { name: "Ford circles" }).uncheck();
  await page.getByRole("slider", { name: "Scrub trajectory" }).fill("5");
  await page.getByRole("img", { name: /Upper half-plane/ }).screenshot({
    path: `test-results/${info.project.name}-colored-domains.png`,
  });
  if (info.project.name === "mobile")
    await page
      .getByRole("button", { name: "02 Modular quotient", exact: true })
      .click();
  await page.getByRole("button", { name: "Schematic 3D", exact: true }).click();
  const sphere = page.getByRole("img", { name: /Schematic punctured sphere/ });
  await expect(sphere.locator("[data-surface-fill]")).toHaveAttribute(
    "opacity",
    "0.78",
  );
  for (const [side, color] of [
    ["T", "#197d9a"],
    ["S", "#9450a1"],
  ])
    await expect(
      sphere.locator(`[data-domain-side="${side}"]`).first(),
    ).toHaveAttribute("stroke", color);
  await sphere.screenshot({
    path: `test-results/${info.project.name}-solid-orbifold.png`,
  });
  await page
    .getByRole("button", { name: "Punctured torus", exact: true })
    .click();
  await page.getByRole("button", { name: "Torus 3D", exact: true }).click();
  const torus = page.getByRole("img", {
    name: "Schematic six-sheet punctured torus",
    exact: true,
  });
  await expect(torus.locator("[data-surface-fill]")).toHaveAttribute(
    "opacity",
    "0.78",
  );
  await expect(torus.locator('[data-domain-side="S"]').first()).toHaveAttribute(
    "stroke",
    "#9450a1",
  );
  await torus.screenshot({
    path: `test-results/${info.project.name}-solid-torus.png`,
  });
  await page.getByLabel("Domain edges", { exact: true }).uncheck();
  await expect(torus.locator("[data-domain-side]")).toHaveCount(0);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});
