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

test("fixed Farey colors are independent of the cover lift and infinity has no fictitious moving point", async ({
  page,
}) => {
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("torus");
  const svg = disk(page),
    before = await svg
      .locator("[data-farey-fills] path")
      .first()
      .getAttribute("fill");
  await pane(page, "Left")
    .getByLabel("Cover lift", { exact: true })
    .selectOption("2");
  await expect(svg.locator("[data-farey-fills] path").first()).toHaveAttribute(
    "fill",
    before!,
  );
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
  await left.getByRole("slider", { name: "Scrub trajectory" }).fill("2");
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
      await right
        .getByRole("button", { name: "Next flip step", exact: true })
        .click();
  }
  await right
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
  await page
    .locator(".comparison-grid")
    .screenshot({
      path: `test-results/${info.project.name}-fixed-farey-square.png`,
    });
});
