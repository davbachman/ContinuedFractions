import { test, expect } from "@playwright/test";
test("domain colors agree across the half-plane and filled translucent quotient surfaces", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("checkbox", { name: "Modular domains" }).check();
  await page.getByRole("checkbox", { name: "Ford circles" }).uncheck();
  await page.getByRole("slider", { name: "Scrub trajectory" }).fill("5");
  await page
    .getByRole("img", { name: /Upper half-plane/ })
    .screenshot({
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
