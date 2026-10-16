import { test, expect, type Page } from "@playwright/test";
const pane = (page: Page, side: string) =>
  page.getByRole("region", { name: `${side} representation`, exact: true });
const disk = (page: Page) =>
  page.getByRole("group", { name: "Poincare Disk", exact: true });
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
  const scrub = page.getByRole("slider", { name: "Scrub trajectory" });
  const outline = svg.locator("[data-current-farey-triangle]");
  await expect(
    left.getByRole("img", { name: /Upper half-plane/ }),
  ).toHaveAttribute("data-farey-coloring", "true");
  await expect(outline).toHaveAttribute("fill", "none");
  const fillColors = await svg
    .locator("[data-farey-fills] path")
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((n) => n.getAttribute("fill"))),
    ]);
  expect(fillColors).toHaveLength(4);
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
  await svg.screenshot({
    path: `test-results/${info.project.name}-farey-disk.png`,
  });
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("disk trajectory playback shares the H² clock and pauses", async ({
  page,
}) => {
  const right = pane(page, "Right"),
    svg = disk(page);
  await page
    .getByRole("button", { name: "Play trajectory", exact: true })
    .click();
  await expect
    .poll(async () => Number(await svg.getAttribute("data-time")))
    .toBeGreaterThan(0.05);
  await page
    .getByRole("button", { name: "Pause trajectory", exact: true })
    .click();
  const paused = await svg.getAttribute("data-time");
  await page.waitForTimeout(150);
  await expect(svg).toHaveAttribute("data-time", paused!);
  expect(
    Number(
      await page.getByRole("slider", { name: "Scrub trajectory" }).inputValue(),
    ),
  ).toBeCloseTo(Number(paused), 3);
  await page
    .getByRole("button", { name: "Restart trajectory", exact: true })
    .click();
  await expect(svg).toHaveAttribute("data-time", "0");
  await expect(svg.locator("[data-dual-flip-path]")).toHaveCount(0);
});

test("modular domains match the cover lift and infinity has no fictitious moving point", async ({
  page,
}) => {
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("torus");
  const svg = disk(page),
    tiles = svg.locator("[data-disk-domains] path");
  const before = await tiles.first().getAttribute("fill");
  await pane(page, "Left")
    .getByLabel("Cover lift", { exact: true })
    .selectOption("2");
  await expect(tiles.first()).not.toHaveAttribute("fill", before!);
  await page.getByLabel("ENDPOINT α").fill("infinity");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  await expect(svg.locator("[data-moving-disk-point]")).toHaveCount(0);
  await expect(pane(page, "Right")).toContainText(
    "∞ has no finite vertical H² ray",
  );
});

test("triangle fills stay fixed across crossings and agree in H², the disk, and marked-square faces", async ({
  page,
}, info) => {
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  const plane = left.getByRole("img", { name: /Upper half-plane/ });
  const initialCell = disk(page).locator('[data-farey-triangle="0|1|∞"]');
  await expect(initialCell).toHaveAttribute("fill", "#e4bf66");
  await left.getByLabel("Auto zoom", { exact: true }).uncheck();
  await left.getByLabel("Ford circles", { exact: true }).uncheck();
  const sample = () =>
    plane.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const scale = Number(canvas.dataset.scale),
        dpr = canvas.width / canvas.clientWidth;
      const x = Number(canvas.dataset.alphaX) + (0.25 - 5 / 13) * scale;
      const y = canvas.clientHeight - 32 - 0.8 * scale;
      return Array.from(
        canvas
          .getContext("2d")!
          .getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data,
      );
    });
  const gold = await sample();
  [228, 191, 102, 77].forEach((channel, i) =>
    expect(Math.abs(gold[i] - channel)).toBeLessThanOrEqual(2),
  );
  await page.getByRole("slider", { name: "Scrub trajectory" }).fill("2");
  await expect(disk(page)).toHaveAttribute("data-triangle-color", "#a65732");
  await expect(initialCell).toHaveAttribute("fill", "#e4bf66");
  expect(await sample()).toEqual(gold);
  await expect(plane).toHaveAttribute("data-triangle-color", "#a65732");
  await page
    .getByRole("combobox", { name: "Right representation", exact: true })
    .selectOption("triangulation");
  const square = right.getByRole("group", {
    name: "Marked torus triangulation",
    exact: true,
  });
  await expect(plane).toHaveAttribute("data-farey-coloring", "true");
  await expect(square).toHaveAttribute("data-triangle-color", "#a65732");
  expect(await sample()).toEqual(gold);
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("farey");
  const fixed = new Map<string, string>();
  for (let step = 1; step <= 5; step++) {
    const svg = disk(page),
      color = await svg.getAttribute("data-triangle-color");
    await expect(square).toHaveAttribute("data-triangle-color", color!);
    expect(
      await square
        .locator("[data-torus-face]")
        .evaluateAll((nodes) => [
          ...new Set(nodes.map((n) => n.getAttribute("fill"))),
        ]),
    ).toEqual([color]);
    for (const [id, fill] of await svg
      .locator("[data-farey-triangle]")
      .evaluateAll((nodes) =>
        nodes.map((n) => [
          n.getAttribute("data-farey-triangle")!,
          n.getAttribute("fill")!,
        ]),
      )) {
      if (fixed.has(id)) expect(fill).toBe(fixed.get(id));
      fixed.set(id, fill);
    }
    if (step < 5)
      await page
        .getByRole("button", { name: "Next flip step", exact: true })
        .click();
  }
  await page
    .getByRole("button", { name: "Previous flip step", exact: true })
    .click();
  const beforeEdit = await square.getAttribute("data-triangle-color");
  await page.getByLabel("ENDPOINT α").fill("13/5");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  await expect(square).toHaveAttribute("data-triangle-color", "#9450a1");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(square).toHaveAttribute("data-triangle-color", beforeEdit!);
  await expect(disk(page)).toHaveAttribute("data-triangle-color", beforeEdit!);
  await page
    .getByRole("button", { name: "Center Farey triangle", exact: true })
    .click();
  await expect(disk(page)).toHaveAttribute("data-triangle-color", beforeEdit!);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page.locator(".comparison-grid").screenshot({
    path: `test-results/${info.project.name}-fixed-farey-square.png`,
  });
});

test("traveled trail ends at the moving point and retraces under either camera", async ({
  page,
}, info) => {
  const svg = disk(page),
    right = pane(page, "Right");
  const scrub = page.getByRole("slider", {
    name: "Scrub trajectory",
  });
  const trail = svg.locator("[data-disk-trail]");
  await expect(trail).toHaveCount(0);
  for (const follow of [true, false]) {
    await right
      .getByLabel("Keep moving point centered", { exact: true })
      .setChecked(follow);
    await scrub.fill("2");
    const atTwo = await trail.getAttribute("d");
    const beforeLength = await trail.evaluate((n) =>
      (n as SVGPathElement).getTotalLength(),
    );
    await scrub.fill("4");
    await expect(trail).not.toHaveAttribute("d", atTwo!);
    expect(
      await trail.evaluate((n) => (n as SVGPathElement).getTotalLength()),
    ).toBeGreaterThan(beforeLength);
    const end = await trail.evaluate((n) => {
      const path = n as SVGPathElement,
        p = path.getPointAtLength(path.getTotalLength());
      return { x: 190 + 145 * p.x, y: 185 + 145 * p.y };
    });
    const point = svg.locator("[data-moving-disk-point]");
    expect(end.x).toBeCloseTo(Number(await point.getAttribute("cx")), 3);
    expect(end.y).toBeCloseTo(Number(await point.getAttribute("cy")), 3);
    await scrub.fill("2");
    await expect(trail).toHaveAttribute("d", atTwo!);
  }
  await svg.screenshot({
    path: `test-results/${info.project.name}-disk-trail.png`,
  });
  await right.getByText("More layers", { exact: true }).click();
  await right.getByLabel("Trajectory", { exact: true }).uncheck();
  await expect(trail).toHaveCount(0);
  await right.getByLabel("Trajectory", { exact: true }).check();
  await expect(trail).toHaveCount(1);
  await scrub.fill("0");
  await expect(trail).toHaveCount(0);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});
