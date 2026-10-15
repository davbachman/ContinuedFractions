import { test, expect, type Page } from "@playwright/test";
const pane = (page: Page, side: string) =>
  page.getByRole("region", { name: `${side} representation`, exact: true });
const disk = (page: Page) =>
  page.getByRole("group", { name: "Interactive Farey triangles", exact: true });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?left=h2&right=farey");
});

test("point-centered disk moves continuously with H² and preserves colors, frozen camera, reverse seeking and α", async ({
  page,
}, info) => {
  const left = pane(page, "Left"),
    right = pane(page, "Right"),
    svg = disk(page);
  const point = svg.locator("[data-moving-disk-point]");
  const scrub = left.getByRole("slider", { name: "Scrub trajectory" });
  const outline = svg.locator("[data-current-farey-triangle]");
  await expect(
    left.getByRole("img", { name: /Upper half-plane/ }),
  ).toHaveAttribute("data-torus-lift", "0");
  await expect(outline).toHaveAttribute("fill", "none");
  const fillColors = await svg
    .locator("[data-disk-domains] path")
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((n) => n.getAttribute("fill"))),
    ]);
  expect(fillColors).toHaveLength(6);
  const initialSlopes = await svg.getAttribute("data-slopes");
  const initialPath = await outline.getAttribute("d");
  await scrub.fill("0.4");
  await expect(svg).toHaveAttribute("data-slopes", initialSlopes!);
  await expect(outline).not.toHaveAttribute("d", initialPath!);
  await expect(point).toHaveAttribute("cx", "190");
  await expect(point).toHaveAttribute("cy", "185");
  const atFour = await outline.getAttribute("d");
  await scrub.fill("0.8");
  await expect(outline).not.toHaveAttribute("d", atFour!);
  await scrub.fill("0.4");
  await expect(outline).toHaveAttribute("d", atFour!);
  await right
    .getByLabel("Keep moving point centered", { exact: true })
    .uncheck();
  await scrub.fill("0.8");
  await expect(outline).toHaveAttribute("d", atFour!);
  await expect(point).not.toHaveAttribute("cx", "190");
  await right.getByLabel("Keep moving point centered", { exact: true }).check();
  await expect(point).toHaveAttribute("cx", "190");
  for (const time of ["1.4", "1.5", "3", "6", "12", "2"]) {
    await scrub.fill(time);
    await expect(point).toHaveAttribute("cx", "190");
    await expect(point).toHaveAttribute("cy", "185");
    expect(
      await svg
        .locator("path")
        .evaluateAll((nodes) =>
          nodes.every((n) => !/NaN|Infinity/.test(n.getAttribute("d") ?? "")),
        ),
    ).toBe(true);
  }
  await right
    .locator(".triangulation-panel")
    .screenshot({ path: `test-results/${info.project.name}-farey-disk.png` });
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("flip playback animates between crossings, pauses, and shares actual time with H²", async ({
  page,
}) => {
  const right = pane(page, "Right"),
    svg = disk(page);
  const outline = svg.locator("[data-current-farey-triangle]");
  const before = await outline.getAttribute("d");
  await right.getByRole("button", { name: "Play flips", exact: true }).click();
  await expect
    .poll(async () => Number(await svg.getAttribute("data-time")))
    .toBeGreaterThan(0.05);
  expect(Number(await svg.getAttribute("data-time"))).toBeLessThan(1.4);
  await expect(outline).not.toHaveAttribute("d", before!);
  await right.getByRole("button", { name: "Pause flips", exact: true }).click();
  const paused = await svg.getAttribute("data-time");
  await page.waitForTimeout(150);
  await expect(svg).toHaveAttribute("data-time", paused!);
  expect(
    Number(
      await pane(page, "Left")
        .getByRole("slider", { name: "Scrub trajectory" })
        .inputValue(),
    ),
  ).toBeCloseTo(Number(paused), 3);
  await right.getByRole("button", { name: "Play flips", exact: true }).click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 1", {
    timeout: 5000,
  });
  await right.getByRole("button", { name: "Pause flips", exact: true }).click();
  // On a small screen, scrolling the transport into view can span a crossing.
  // Rewind the actual paused cursor rather than assuming it is still step one.
  const cursor = Number(
    (await right.getByTestId("flip-status").textContent())?.match(
      /Step (\d+)/,
    )?.[1],
  );
  expect(cursor).toBeGreaterThan(0);
  for (let step = cursor - 1; step >= 0; step--) {
    await right
      .getByRole("button", { name: "Previous flip step", exact: true })
      .click();
    await expect(right.getByTestId("flip-status")).toContainText(
      `Step ${step} /`,
    );
  }
  await expect(svg).toHaveAttribute("data-time", "0");
  await expect(outline).toHaveAttribute("d", before!);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});

test("disk coloring follows the chosen cover lift and infinity has no fictitious moving point", async ({
  page,
}) => {
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("torus");
  const svg = disk(page),
    before = await svg
      .locator("[data-disk-domains] path")
      .first()
      .getAttribute("fill");
  await pane(page, "Left")
    .getByLabel("Cover lift", { exact: true })
    .selectOption("2");
  await expect(svg).toHaveAttribute("data-domain-lift", "2");
  await expect(
    svg.locator("[data-disk-domains] path").first(),
  ).not.toHaveAttribute("fill", before!);
  await page.getByLabel("ENDPOINT α").fill("infinity");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  await expect(svg.locator("[data-moving-disk-point]")).toHaveCount(0);
  await expect(pane(page, "Right")).toContainText(
    "∞ has no finite vertical H² ray",
  );
});
