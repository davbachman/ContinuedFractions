import { test, expect, type Page } from "@playwright/test";
const pane = (p: Page, side: string) =>
  p.getByRole("region", { name: `${side} representation`, exact: true });
const disk = (p: Page) =>
  p.getByRole("group", { name: "Poincare Disk", exact: true });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test("disk layers work independently and its path is exclusive to an edge-flip comparison", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?left=h2&right=farey");
  const right = pane(page, "Right"),
    left = pane(page, "Left"),
    svg = disk(page);
  await expect(
    right.getByRole("combobox", { name: "Right representation", exact: true }),
  ).toHaveValue("farey");
  await expect(svg.locator("[data-dual-flip-path]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Play flips", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Play trajectory", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".comparison-pane .pane-transport")).toHaveCount(0);
  await right.getByLabel("Farey edges", { exact: true }).uncheck();
  await expect(svg.locator("[data-disk-farey]")).toHaveCount(0);
  await expect(svg.locator("[data-farey-fills]")).toHaveCount(0);
  await right.getByLabel("Modular domains", { exact: true }).check();
  await expect(svg.locator("[data-disk-modular] path").first()).toBeAttached();
  await expect(svg.locator("[data-disk-ford] circle").first()).toBeAttached();
  await svg.screenshot({
    path: `test-results/${info.project.name}-disk-layers.png`,
  });
  await right.getByLabel("Ford circles", { exact: true }).uncheck();
  await expect(svg.locator("[data-disk-ford]")).toHaveCount(0);
  await right.getByText("More layers", { exact: true }).click();
  await right.getByLabel("Trajectory", { exact: true }).uncheck();
  await expect(svg.locator("[data-moving-disk-point]")).toHaveCount(0);
  await right.getByLabel("Convergents", { exact: true }).uncheck();
  await expect(svg.locator("[data-disk-convergents]")).toHaveCount(0);
  await right.getByLabel("Trajectory", { exact: true }).check();
  await right.getByText("More layers", { exact: true }).click();
  await right.getByLabel("Farey edges", { exact: true }).check();
  await left
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("triangulation");
  await expect(svg.locator("[data-dual-flip-path] path")).toHaveCount(5);
  const lattice = left.getByRole("group", {
    name: "Marked torus triangulation",
    exact: true,
  });
  for (let i = 0; i < 3; i++) {
    const color = await lattice
      .locator(`[data-lattice-edge="${i}"]`)
      .first()
      .getAttribute("stroke");
    await expect(svg.locator(`[data-disk-edge="${i}"]`)).toHaveAttribute(
      "stroke",
      color!,
    );
  }
  for (let i = 0; i < 5; i++)
    await page
      .getByRole("button", { name: "Next flip step", exact: true })
      .click();
  await expect(lattice).toHaveAttribute(
    "data-slopes",
    (await svg.getAttribute("data-slopes"))!,
  );
  expect(
    Number(await lattice.getAttribute("data-lattice-span")),
  ).toBeGreaterThan(1);
  await lattice.screenshot({
    path: `test-results/${info.project.name}-lattice-deep.png`,
  });
  await svg.screenshot({
    path: `test-results/${info.project.name}-disk-flips.png`,
  });
  await right
    .getByRole("combobox", { name: "Right representation", exact: true })
    .selectOption("h2");
  const h2 = right.getByRole("img", { name: /Upper half-plane/ });
  await expect(h2).toHaveAttribute("data-flip-path", "5");
  await expect(h2).toHaveAttribute("data-flip-cursor", "5");
  await page
    .getByRole("button", { name: "Previous flip step", exact: true })
    .click();
  await expect(h2).toHaveAttribute("data-flip-cursor", "4");
  await h2.screenshot({
    path: `test-results/${info.project.name}-h2-flips.png`,
  });
  await left
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("symbolic");
  await expect(h2).not.toHaveAttribute("data-flip-path");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("disk cameras, forward and reverse clocks, endpoint drag and undo share the exact number", async ({
  page,
}) => {
  await page.goto("/?left=h2&right=farey");
  const right = pane(page, "Right"),
    left = pane(page, "Left"),
    svg = disk(page);
  const clock = page.getByRole("slider", { name: "Scrub trajectory" });
  await clock.fill("2");
  await expect(svg.locator("[data-moving-disk-point]")).toHaveAttribute(
    "cx",
    "190",
  );
  await clock.fill("1");
  await expect(svg).toHaveAttribute("data-time", "1");
  await right.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(svg).toHaveAttribute("data-follow-point", "false");
  const y = Number(await svg.getAttribute("data-camera-height"));
  await right.getByRole("button", { name: "Zoom out", exact: true }).click();
  expect(Number(await svg.getAttribute("data-camera-height"))).toBeGreaterThan(
    y,
  );
  await right.getByRole("button", { name: "Pan left", exact: true }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await right
    .getByRole("button", { name: "Reset Farey camera", exact: true })
    .click();
  await svg.scrollIntoViewIfNeeded();
  const point = await svg.locator("[data-target-marker] circle").boundingBox();
  const destination = await svg.evaluate((node) => {
    const p = (node as SVGSVGElement).createSVGPoint();
    p.x = 190;
    p.y = 330;
    const out = p.matrixTransform((node as SVGSVGElement).getScreenCTM()!);
    return { x: out.x, y: out.y };
  });
  await page.mouse.move(
    point!.x + point!.width / 2,
    point!.y + point!.height / 2,
  );
  await page.mouse.down();
  // The bottom boundary point of the default camera represents -1.
  await page.mouse.move(destination.x, destination.y, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("-1");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});

test("disk supports stationary Ford inspection, pan gestures, wheel and two-finger zoom", async ({
  page,
}, info) => {
  await page.goto("/?left=symbolic&right=farey");
  const svg = disk(page),
    right = pane(page, "Right");
  const ford = svg.getByRole("button", {
    name: "Inspect Ford circle 0",
    exact: true,
  });
  await ford.click();
  await expect(page.locator(".shared-inspection")).toContainText("C0: 0");
  await page
    .getByRole("button", { name: "Close inspection", exact: true })
    .click();
  await svg.evaluate((n) => n.scrollIntoView({ block: "center" }));
  const b = (await svg.boundingBox())!,
    x = b.x + b.width / 2,
    y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 30, y + 10, { steps: 5 });
  await page.mouse.up();
  await expect(svg).toHaveAttribute("data-follow-point", "false");
  let height = Number(await svg.getAttribute("data-camera-height"));
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, -70);
  await expect
    .poll(async () => Number(await svg.getAttribute("data-camera-height")))
    .toBeLessThan(height);
  if (info.project.name === "mobile") {
    const touch = await page.context().newCDPSession(page);
    const points = (dy: number) => [
      { id: 1, x: x - 25, y: y + dy },
      { id: 2, x: x + 25, y: y + dy },
    ];
    height = Number(await svg.getAttribute("data-camera-height"));
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: points(0),
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: points(-60),
    });
    await expect
      .poll(async () => Number(await svg.getAttribute("data-camera-height")))
      .toBeLessThan(height);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [points(-60)[0]],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ id: 1, x: x + 40, y }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(
    page.getByRole("button", { name: "Undo number edit", exact: true }),
  ).toBeDisabled();
});
