import { expect, test } from "@playwright/test";

for (const side of ["Left", "Right"]) {
  test(`shared trajectory controls drive the ${side.toLowerCase()} disk and H², and switch safely to flips`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(
      side === "Left" ? "/?left=farey&right=h2" : "/?left=h2&right=farey",
    );
    const start = new Date("2026-10-16T12:00:00Z");
    await page.clock.install({ time: start });
    await page.clock.pauseAt(start);
    const nav = page.getByRole("region", {
      name: "Shared playback",
      exact: true,
    });
    const slider = nav.getByRole("slider", { name: "Scrub trajectory" });
    await expect(
      page.getByRole("slider", { name: "Scrub trajectory" }),
    ).toHaveCount(1);
    await expect(page.locator(".comparison-pane .pane-transport")).toHaveCount(
      0,
    );
    const navBox = (await nav.boundingBox())!;
    const gridBox = (await page.locator(".comparison-grid").boundingBox())!;
    const stripBox = (await page.locator(".comparison-strip").boundingBox())!;
    expect(navBox.y).toBeGreaterThanOrEqual(stripBox.y + stripBox.height);
    expect(navBox.y + navBox.height).toBeLessThanOrEqual(gridBox.y);
    expect(Math.abs(navBox.width - gridBox.width)).toBeLessThan(2);
    const restart = nav.getByRole("button", {
      name: "Restart trajectory",
      exact: true,
    });
    expect((await restart.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    await expect(restart.locator("svg")).toHaveAttribute("width", "22");
    await slider.fill("0.5");
    await nav
      .getByRole("button", { name: "Play trajectory", exact: true })
      .click();
    await page.clock.runFor(400);
    expect(Number(await slider.inputValue())).toBeGreaterThan(0.5);
    await nav
      .getByRole("button", { name: "Pause trajectory", exact: true })
      .click();
    const paused = await slider.inputValue();
    await page.clock.runFor(200);
    await expect(slider).toHaveValue(paused);
    await restart.click();
    await expect(slider).toHaveValue("0");
    await nav
      .getByRole("button", { name: "Next crossing", exact: true })
      .click();
    const disk = page.getByRole("group", {
      name: "Poincare Disk",
      exact: true,
    });
    const halfPlane = page.getByRole("img", { name: /Upper half-plane/ });
    await expect(halfPlane).toHaveAttribute(
      "data-triangulation",
      (await disk.getAttribute("data-slopes"))!,
    );
    await page
      .getByRole("combobox", {
        name: `${side === "Left" ? "Right" : "Left"} representation`,
        exact: true,
      })
      .selectOption("triangulation");
    await nav.getByLabel("Playback process").selectOption("flips");
    await nav
      .getByRole("button", { name: "Restart flips", exact: true })
      .click();
    await nav.getByRole("button", { name: "Play flips", exact: true }).click();
    await page.clock.runFor(300);
    await slider.fill("0.3");
    await expect(
      nav.getByRole("button", { name: "Play flips", exact: true }),
    ).toBeVisible();
    await page.clock.runFor(300);
    await expect(slider).toHaveValue("0.3");
    await nav.getByRole("button", { name: "Play flips", exact: true }).click();
    await nav.getByLabel("Playback process").selectOption("trajectory");
    await expect(
      nav.getByRole("button", { name: "Play trajectory", exact: true }),
    ).toBeVisible();
    await page.clock.runFor(300);
    await expect(slider).toHaveValue("0.3");
    await expect(page.getByLabel("ENDPOINT α", { exact: true })).toHaveValue(
      "5/13",
    );
    await page.screenshot({
      path: `test-results/${info.project.name}-${side}-shared-playback.png`,
      fullPage: true,
    });
  });
}

test("rectangle and coefficient navigation stay above both panes without duplicate coefficient steppers", async ({
  page,
}) => {
  await page.goto("/?left=braid&right=rectangle");
  const nav = page.getByRole("region", {
    name: "Shared playback",
    exact: true,
  });
  await expect(
    page.getByRole("button", { name: /^(Previous|Next) coefficient$/ }),
  ).toHaveCount(0);
  await expect(page.locator(".comparison-pane .pane-transport")).toHaveCount(0);
  await nav
    .getByRole("button", { name: "Restart linked playback", exact: true })
    .click();
  await expect(page.getByLabel("Edit coefficient a0")).toBeVisible();
  await nav
    .getByRole("button", { name: "Next linked stage", exact: true })
    .click();
  await expect(
    page.locator('[data-braid-coefficient="1"]').first(),
  ).toHaveAttribute("data-selected", "true");
  await page
    .getByRole("button", { name: "Highlight coefficient a3 = 1", exact: true })
    .click();
  await expect(
    page.locator('[data-braid-coefficient="3"]').first(),
  ).toHaveAttribute("data-selected", "true");
  await expect(
    page.getByRole("group", { name: "Rectangle dissection diagram" }),
  ).toHaveAttribute("data-stage", "3");
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("symbolic");
  await expect(
    page.getByRole("button", { name: /^(Previous|Next) coefficient$/ }),
  ).toHaveCount(0);
});
