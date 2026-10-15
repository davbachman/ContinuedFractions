import { dragSurface } from "./rotation";
import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("loads exact default, plays, steps, edits and undoes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(
    page.getByRole("heading", { name: "One number. Many geometries." }),
  ).toBeVisible();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page
    .getByRole("button", { name: "Next Farey crossing", exact: true })
    .click();
  expect(
    Number(
      await page.getByRole("slider", { name: "Scrub trajectory" }).inputValue(),
    ),
  ).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "7/19", exact: true }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("7/19");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page.getByLabel("ENDPOINT α").fill("[0;2,2]");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("2/5");
  await page
    .getByRole("button", { name: "Select coefficient a1 = 2", exact: true })
    .click();
  await page.locator("#coefficient-input").fill("3");
  await page.getByRole("button", { name: "Apply coefficient" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("2/7");
  expect(errors).toEqual([]);
});
test("scene share, download, load, validation and local persistence", async ({
  page,
}) => {
  await page.getByRole("button", { name: "√2", exact: true }).click();
  await page
    .getByRole("button", { name: "Next Farey crossing", exact: true })
    .click();
  await page.getByRole("button", { name: "Share scene" }).click();
  const url = page.url();
  expect(url).toContain("#scene=");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download scene" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("continued-fractions-scene.json");
  await page.goto(url);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("√2");
  await page.getByLabel("ENDPOINT α").fill("0/0");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await expect(page.getByRole("alert")).toContainText("undefined");
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":9}'),
  });
  await expect(page.getByRole("alert")).toContainText("version 1");
  const path = await file.path();
  if (path) {
    await page.locator("input[type=file]").setInputFiles(path);
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("√2");
  }
});
test("quotient, inspection, accessible guide, and no page overflow", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "02 Modular quotient" }).click();
  await page.getByRole("button", { name: "Schematic 3D" }).click();
  await dragSurface(
    page,
    page.getByRole("img", { name: /Schematic punctured sphere/ }),
    testInfo.project.name === "mobile",
  );
  await page.getByRole("button", { name: "Folded domain" }).click();
  await page.getByText("Inspect transformation").click();
  await expect(page.getByText("z ↦ (az + b)/(cz + d)")).toBeVisible();
  await page.locator("#inspect-rational").selectOption("1/2");
  await expect(
    page.getByText("Ford circle 1/2", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page
    .getByRole("button", { name: "Use this endpoint", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("1/2");
  await page.getByRole("button", { name: "Field guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-atlas.png`,
    fullPage: true,
  });
});
test("keyboard and reduced motion preserve explicit playback controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("h1").click();
  await page.keyboard.press("ArrowRight");
  expect(
    Number(
      await page.getByRole("slider", { name: "Scrub trajectory" }).inputValue(),
    ),
  ).toBeGreaterThan(0);
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
});
test("integer inputs, alternate expressions, and mobile panel changes remain stable", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("button", { name: "Select coefficient a4 = 2", exact: true })
    .click();
  await page.getByLabel("ENDPOINT α").fill("3");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await expect(
    page.getByText("On a Farey edge", { exact: true }),
  ).toBeVisible();
  await page.locator("#coefficient-input").fill("-2");
  await page.getByRole("button", { name: "Apply coefficient" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("-2");
  await page.getByRole("button", { name: "5/13", exact: true }).click();
  await page.getByLabel("Alternate ending", { exact: false }).check();
  await expect(
    page.getByRole("button", {
      name: "Select coefficient a5 = 1",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel("Alternate ending", { exact: false }).uncheck();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "02 Modular quotient" }).click();
    await expect(
      page.getByRole("button", { name: "Folded domain" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "01 Upper half-plane" }).click();
    await expect(
      page.getByRole("img", { name: /Upper half-plane/ }),
    ).toBeVisible();
  }
  await page.getByRole("slider", { name: "Scrub trajectory" }).fill("2.6");
  await page.locator("h1").click();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-default.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("dragging alpha updates immediately, stays under the pointer, and undoes in one step", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const canvas = page.getByRole("img", { name: /Upper half-plane/ });
  await canvas.evaluate((node) => node.scrollIntoView({ block: "center" }));
  const box = (await canvas.boundingBox())!;
  const x = box.x + Number(await canvas.getAttribute("data-alpha-x")),
    y = box.y + box.height - 32;
  const endpoint = page.getByLabel("ENDPOINT α");
  let touch;
  if (testInfo.project.name === "mobile") {
    touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 55, y }],
    });
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 55, y, { steps: 5 });
  }
  await expect(endpoint).not.toHaveValue("5/13");
  expect(
    Math.abs(
      Number(await canvas.getAttribute("data-alpha-x")) - (x + 55 - box.x),
    ),
  ).toBeLessThan(7);
  if (touch)
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  else await page.mouse.up();
  const moved = await endpoint.inputValue();
  const dragX = Number(await canvas.getAttribute("data-alpha-x"));
  await page.getByRole("slider", { name: "Scrub trajectory" }).fill("2");
  expect(Number(await canvas.getAttribute("data-alpha-x"))).toBeCloseTo(
    dragX,
    5,
  );
  expect(
    Math.abs(
      Number(await canvas.getAttribute("data-alpha-x")) - (x + 55 - box.x),
    ),
  ).toBeLessThan(7);
  await expect(
    page.getByText("Endpoint preview:", { exact: false }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(endpoint).toHaveValue("5/13");
  await page.getByRole("button", { name: "Redo number edit" }).click();
  await expect(endpoint).toHaveValue(moved);
  expect(errors).toEqual([]);
});

test("automatic zoom accompanies playback with a slow on-screen descent and deterministic seeking", async ({
  page,
}) => {
  const canvas = page.getByRole("img", { name: /Upper half-plane/ });
  await expect(page.getByRole("checkbox", { name: "Auto zoom" })).toBeChecked();
  const initialY = Number(await canvas.getAttribute("data-point-y")),
    initialScale = Number(await canvas.getAttribute("data-scale"));
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-scale")))
    .toBeGreaterThan(initialScale * 1.4);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const t = Number(
    await page.getByRole("slider", { name: "Scrub trajectory" }).inputValue(),
  );
  const box = (await canvas.boundingBox())!,
    bottom = box.height - 32;
  const currentY = Number(await canvas.getAttribute("data-point-y"));
  expect(currentY).toBeGreaterThan(initialY);
  expect((bottom - currentY) / (bottom - initialY)).toBeCloseTo(
    Math.exp(-0.08 * t),
    3,
  );
  const scrub = page.getByRole("slider", { name: "Scrub trajectory" });
  await scrub.fill("8");
  const deepY = await canvas.getAttribute("data-point-y");
  await scrub.fill("3");
  await scrub.fill("8");
  expect(await canvas.getAttribute("data-point-y")).toBe(deepY);
  await page.getByRole("checkbox", { name: "Auto zoom" }).uncheck();
  expect(Number(await canvas.getAttribute("data-scale"))).toBeCloseTo(
    initialScale,
  );
  expect(Number(await canvas.getAttribute("data-point-y"))).toBeGreaterThan(
    Number(deepY),
  );
});

test("trackpad vertical scrolling zooms only the canvas without editing the number or scrolling the page", async ({
  page,
}) => {
  const canvas = page.getByRole("img", { name: /Upper half-plane/ });
  await canvas.evaluate((node) => node.scrollIntoView({ block: "center" }));
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const scroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, -120);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-manual-zoom")))
    .toBeGreaterThan(1.1);
  await page.mouse.wheel(0, 120);
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-manual-zoom")))
    .toBeCloseTo(1, 5);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(
    page.getByRole("button", { name: "Undo number edit" }),
  ).toBeDisabled();
  await page.mouse.move(5, 100);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll);
});

test("two-finger vertical touch drag zooms in and out, and lifting one finger never edits alpha", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Real touchscreen gesture coverage.",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const canvas = page.getByRole("img", { name: /Upper half-plane/ });
  await canvas.evaluate((node) => node.scrollIntoView({ block: "center" }));
  const box = (await canvas.boundingBox())!,
    x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const scroll = await page.evaluate(() => scrollY);
  const touch = await page.context().newCDPSession(page);
  const points = (dy: number) => [
    { id: 1, x: x - 25, y: y + dy },
    { id: 2, x: x + 25, y: y + dy },
  ];
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: points(0),
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: points(-80),
  });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-manual-zoom")))
    .toBeCloseTo(Math.exp(0.4), 5);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: points(0),
  });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-manual-zoom")))
    .toBeCloseTo(1, 5);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [points(0)[0]],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 1, x: x + 60, y: y + 30 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(
    page.getByRole("button", { name: "Undo number edit" }),
  ).toBeDisabled();
  expect(Number(await canvas.getAttribute("data-alpha-x"))).toBeCloseTo(
    box.width / 2,
    5,
  );
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  // A fresh one-finger gesture still pans after the multi-touch gesture ends.
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 1, x, y }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 1, x: x + 40, y }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(Number(await canvas.getAttribute("data-alpha-x"))).toBeCloseTo(
    box.width / 2 + 40,
    3,
  );
  expect(errors).toEqual([]);
});

test("modular overlay refines during zoom and stays independent of Farey and Ford overlays", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const canvas = page.getByRole("img", { name: /Upper half-plane/ });
  await page.getByRole("checkbox", { name: "Modular domains" }).check();
  await page.getByRole("checkbox", { name: "Farey edges" }).uncheck();
  await page.getByRole("checkbox", { name: "Ford circles" }).uncheck();
  const scrub = page.getByRole("slider", { name: "Scrub trajectory" });
  for (const time of ["0", "4", "8"]) {
    await scrub.fill(time);
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-modular-arc-count")),
      )
      .toBeGreaterThan(15);
  }
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute("data-modular-arc-count")),
    )
    .toBeGreaterThan(15);
  await scrub.fill("4");
  await canvas.screenshot({
    path: `test-results/${testInfo.project.name}-modular-zoom.png`,
  });
  await page.getByRole("checkbox", { name: "Modular domains" }).uncheck();
  await expect(canvas).toHaveAttribute("data-modular-arc-count", "0");
  expect(errors).toEqual([]);
});

test("fraction tabs preserve the scene, support keyboard navigation, and share coefficient edits", async ({
  page,
}, testInfo) => {
  const listTab = page.getByRole("tab", { name: "Coefficients", exact: true });
  const fractionTab = page.getByRole("tab", {
    name: "Stacked fraction",
    exact: true,
  });
  await expect(listTab).toHaveAttribute("aria-selected", "true");
  const scrub = page.getByRole("slider", { name: "Scrub trajectory" });
  await scrub.fill("2");
  await listTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(fractionTab).toBeFocused();
  await expect(fractionTab).toHaveAttribute("aria-selected", "true");
  await expect(scrub).toHaveValue("2");
  const panel = page.getByRole("tabpanel", { name: "Stacked fraction" });
  await expect(panel.locator(".stacked-coefficient")).toHaveText([
    "0",
    "2",
    "1",
    "1",
    "2",
  ]);
  // Independently evaluate the rendered nested denominators, not the coefficient list.
  const renderedValue = await panel
    .locator(".stacked-quotient")
    .first()
    .evaluate((root) => {
      function evaluate(node: Element): number {
        const a = Number(node.querySelector(":scope > button")!.textContent);
        const denominator = node.querySelector(
          ":scope > .stacked-reciprocal > .stacked-denominator > .stacked-quotient",
        );
        return denominator ? a + 1 / evaluate(denominator) : a;
      }
      return evaluate(root);
    });
  expect(renderedValue).toBeCloseTo(5 / 13, 14);
  await panel
    .getByRole("button", { name: "Select coefficient a2 = 1", exact: true })
    .click();
  await expect(page.locator(".coefficient-detail")).toContainText("1/3");
  await page.locator("#coefficient-input").fill("2");
  await page.getByRole("button", { name: "Apply coefficient" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("8/19");
  await expect(panel.locator(".stacked-coefficient")).toHaveText([
    "0",
    "2",
    "2",
    "1",
    "2",
  ]);
  await page.locator(".fraction-panel").screenshot({
    path: `test-results/${testInfo.project.name}-stacked-fraction.png`,
  });
  await fractionTab.focus();
  await page.keyboard.press("Home");
  await expect(listTab).toBeFocused();
  await expect(
    page.getByRole("tabpanel", { name: "Coefficients" }),
  ).toBeVisible();
  await page.keyboard.press("End");
  await expect(fractionTab).toBeFocused();
  await expect(
    page.getByRole("tabpanel", { name: "Coefficients" }),
  ).toBeHidden();
});

test("stacked fractions handle integers, alternate endings, and scrollable periodic expansions", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Stacked fraction" }).click();
  const panel = page.getByRole("tabpanel", { name: "Stacked fraction" });
  await page.getByLabel("ENDPOINT α").fill("-2");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await expect(panel.locator(".stacked-coefficient")).toHaveText(["-2"]);
  await expect(panel.locator(".stacked-reciprocal")).toHaveCount(0);
  await page.getByLabel("Alternate ending", { exact: false }).check();
  await expect(panel.locator(".stacked-coefficient")).toHaveText(["-3", "1"]);
  await expect(
    panel.getByRole("button", { name: "Select coefficient a1 = 1" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "φ", exact: true }).click();
  await expect(panel.getByLabel("continues indefinitely")).toBeVisible();
  await expect(panel).toContainText("continues indefinitely");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  const scroller = panel.getByRole("region", {
    name: "Nested continued fraction",
  });
  const scrub = page.getByRole("slider", { name: "Scrub trajectory" });
  await scrub.fill("0");
  await scroller.focus();
  await page.keyboard.press("ArrowRight");
  await expect(scrub).toHaveValue("0");
  await scroller.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
    node.scrollLeft = node.scrollWidth;
  });
  await panel.locator(".stacked-coefficient").last().click();
  await expect(panel.locator(".stacked-coefficient").last()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
