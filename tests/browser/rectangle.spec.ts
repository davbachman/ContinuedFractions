import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?layout=atlas");
});

test("view switching preserves the number, selected coefficient and independent H² time", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByRole("slider", { name: "Scrub trajectory" }).fill("3");
  await page
    .getByRole("button", { name: "Select coefficient a2 = 1", exact: true })
    .click();
  const time = await page
    .getByRole("slider", { name: "Scrub trajectory" })
    .inputValue();
  await page
    .getByRole("button", { name: "Rectangle dissection", exact: true })
    .click();
  const diagram = page.getByRole("group", {
    name: "Rectangle dissection diagram",
  });
  await expect(diagram).toHaveAttribute("data-stage", "2");
  await expect(
    page.getByRole("slider", { name: "Scrub trajectory" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Next rectangle stage", exact: true })
    .click();
  await expect(diagram).toHaveAttribute("data-stage", "3");
  await expect(page.getByTestId("remainder-dimensions")).toHaveText(
    "2/13 × 1/13",
  );
  await page
    .getByRole("button", { name: "Hyperbolic plane", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: /Upper half-plane/ }),
  ).toHaveAttribute("data-selected-term", "3");
  await expect(
    page.getByRole("slider", { name: "Scrub trajectory" }),
  ).toHaveValue(time);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  if (info.project.name === "mobile")
    await page
      .getByRole("button", { name: "02 Modular quotient", exact: true })
      .click();
  await expect(
    page.getByRole("button", { name: "Folded domain", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Rectangle dissection", exact: true })
    .click();
  await expect(diagram).toHaveAttribute("data-stage", "3");
  expect(errors).toEqual([]);
});

test("canonical groups, shared editing, undo, keyboard selection, and exact termination", async ({
  page,
}) => {
  await page.getByLabel("ENDPOINT α").fill("13/5");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await page
    .getByRole("button", { name: "Rectangle dissection", exact: true })
    .click();
  const diagram = page.getByRole("group", {
    name: "Rectangle dissection diagram",
  });
  await page.getByRole("button", { name: "Restart dissection" }).click();
  await expect(page.getByTestId("remainder-dimensions")).toHaveText("3/5 × 1");
  await expect(diagram.locator(".rectangle-stage rect")).toHaveCount(2);
  await page.getByRole("button", { name: "Next rectangle stage" }).click();
  await page
    .getByRole("button", {
      name: "Select square group a0: 2 squares",
      exact: true,
    })
    .click();
  await expect(diagram).toHaveAttribute("data-stage", "0");
  await page
    .getByRole("button", { name: "Select coefficient a2 = 1", exact: true })
    .click();
  await expect(diagram).toHaveAttribute("data-stage", "2");
  await page.locator("#coefficient-input").fill("2");
  await page.getByRole("button", { name: "Apply coefficient" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("19/7");
  await expect(diagram).toHaveAttribute("data-stage", "2");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await expect(page.getByTestId("remainder-dimensions")).toHaveText(
    "1/5 × 2/5",
  );
  await page.getByRole("button", { name: "Next rectangle stage" }).click();
  await expect(page.locator(".dissection-status")).toHaveText(
    "Exact termination: the remainder is zero.",
  );
  await expect(
    page.getByRole("button", { name: "Next rectangle stage" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Overview group a0", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(diagram).toHaveAttribute("data-stage", "0");
  await page
    .getByRole("button", { name: "Hyperbolic plane", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: /Upper half-plane/ }),
  ).toHaveAttribute("data-selected-term", "0");
});

test("zero-square orientation step, periodic playback, camera, resize, and mobile layouts", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Rectangle dissection", exact: true })
    .click();
  await page.getByRole("button", { name: "Restart dissection" }).click();
  await expect(page.locator(".dissection-explanation")).toContainText(
    "Orientation change · no squares removed",
  );
  const diagram = page.getByRole("group", {
    name: "Rectangle dissection diagram",
  });
  await expect(diagram.locator(".rectangle-stage rect")).toHaveCount(0);
  await page.getByRole("button", { name: "Next rectangle stage" }).click();
  await page
    .getByRole("button", { name: "Follow remainder", exact: true })
    .click();
  await expect(diagram).toHaveAttribute("data-camera", "remainder");
  await expect(
    page.getByRole("group", { name: "Original rectangle overview" }),
  ).toBeVisible();
  const width = info.project.name === "mobile" ? 412 : 1100;
  await page.setViewportSize({ width, height: 900 });
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(diagram).toHaveAttribute("data-stage", "1");
  await page.getByRole("button", { name: "φ", exact: true }).click();
  await page.getByRole("button", { name: "Play dissection" }).click();
  await expect(diagram).toHaveAttribute("data-stage", "2", { timeout: 4000 });
  await page.getByRole("button", { name: "Pause dissection" }).click();
  await expect(page.locator(".dissection-status")).toContainText(
    "Infinite expansion",
  );
  for (let i = 0; i < 7; i++)
    await page.getByRole("button", { name: "Next rectangle stage" }).click();
  await expect(diagram).toHaveAttribute("data-stage", "9");
  await expect(page.locator(".rectangle-progress")).toContainText(
    "16 stages generated",
  );
  await page.getByRole("button", { name: "√2", exact: true }).click();
  await expect(page.locator(".dissection-status")).toContainText(
    "Display limits do not mean mathematical termination",
  );
  await expect(page.getByTestId("remainder-dimensions")).toHaveText(
    "(α − 1) × (3 − 2α)",
  );
  await page.locator(".rectangle-grid").screenshot({
    path: `test-results/${info.project.name}-rectangle-follow.png`,
  });
  if (info.project.name === "mobile") {
    await page
      .getByRole("button", { name: "02 Euclidean division", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Euclidean division", exact: true }),
    ).toBeVisible();
    await page
      .locator(".rectangle-grid")
      .screenshot({ path: "test-results/mobile-rectangle-explanation.png" });
    await page
      .getByRole("button", { name: "01 Rectangle dissection", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Full dissection", exact: true })
    .click();
  await page.getByRole("button", { name: "5/13", exact: true }).click();
  await page
    .getByRole("button", { name: "Select coefficient a4 = 2", exact: true })
    .click();
  await page.locator(".rectangle-grid").screenshot({
    path: `test-results/${info.project.name}-rectangle-full.png`,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("dragging the outer rectangle previews a snapped value and is one undoable edit", async ({
  page,
}, info) => {
  await page
    .getByRole("button", { name: "Rectangle dissection", exact: true })
    .click();
  const handle = page.getByRole("slider", {
    name: "Resize outer rectangle aspect ratio",
  });
  await handle.scrollIntoViewIfNeeded();
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const overview = await page
    .getByRole("group", { name: "Original rectangle overview" })
    .boundingBox();
  // Default α = 5/13, display scale = 100. Move to the exact 1/2 snap.
  const dx = ((0.5 - 5 / 13) * 100 * overview!.width) / 320;
  if (info.project.name === "mobile") {
    const touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + dx, y }],
    });
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("1/2");
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y, { steps: 5 });
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("1/2");
    await page.mouse.up();
  }
  await expect(page.getByTestId("remainder-dimensions")).toHaveText("1/2 × 0");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(
    page.getByRole("button", { name: "Undo number edit" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Hyperbolic plane", exact: true })
    .click();
  await page.getByRole("button", { name: "Redo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("1/2");
  await page
    .getByRole("button", { name: "Rectangle dissection", exact: true })
    .click();
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("ENDPOINT α")).not.toHaveValue("1/2");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("1/2");
});

test("unavailable numbers remain unchanged, integer termination and large counts remain bounded", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Rectangle dissection", exact: true })
    .click();
  for (const input of ["0", "-2"]) {
    await page.getByLabel("ENDPOINT α").fill(input);
    await page.getByRole("button", { name: "Apply endpoint" }).click();
    await expect(page.locator(".rectangle-unavailable")).toContainText(
      "unavailable",
    );
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue(input);
    await expect(
      page.getByRole("button", { name: "Play dissection" }),
    ).toBeDisabled();
  }
  await page.getByLabel("ENDPOINT α").fill("infinity");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await expect(page.locator(".rectangle-unavailable")).toContainText(
    "unavailable for infinity",
  );
  await expect(page.getByTestId("tangle-fraction")).toHaveText("∞");
  await page.getByLabel("ENDPOINT α").fill("10000");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await expect(page.locator(".dissection-status")).toContainText(
    "Exact termination",
  );
  const diagram = page.getByRole("group", {
    name: "Rectangle dissection diagram",
  });
  await expect(diagram.locator(".rectangle-stage rect")).toHaveCount(1);
  await expect(
    page.getByRole("button", {
      name: "Select square group a0: 10000 squares",
      exact: true,
    }),
  ).toBeAttached();
  await page.getByLabel("ENDPOINT α").fill("1/1000000000000");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await expect(diagram.locator(".rectangle-stage rect")).toHaveCount(1);
  await expect(page.locator(".rectangle-progress")).toContainText(
    "1000000000000",
  );
});

test("follow camera animates rotations and cancelled aspect drags restore the shared number", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Rectangle dissection", exact: true })
    .click();
  const diagram = page.getByRole("group", {
    name: "Rectangle dissection diagram",
  });
  const camera = diagram.locator(":scope > g");
  await page
    .getByRole("button", { name: "Follow remainder", exact: true })
    .click();
  await expect(camera).toHaveAttribute("transform", /rotate\(-90\)/);
  await page.getByRole("button", { name: "Next rectangle stage" }).click();
  await expect(camera).toHaveAttribute("transform", /rotate\(0\)/);
  const current = diagram.locator(".rectangle-stage.current rect").first();
  const square = (await current.boundingBox())!;
  expect(square.width).toBeCloseTo(square.height, 3);
  const handle = page.getByRole("slider", {
    name: "Resize outer rectangle aspect ratio",
  });
  await handle.scrollIntoViewIfNeeded();
  const box = (await handle.boundingBox())!,
    x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 25, y);
  await expect(page.getByLabel("ENDPOINT α")).not.toHaveValue("5/13");
  await handle.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(
    page.getByRole("button", { name: "Undo number edit" }),
  ).toBeDisabled();
});

test("deep irrational remainders remain visible and the display cap never implies termination", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "φ", exact: true }).click();
  await page
    .getByRole("button", { name: "Rectangle dissection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Follow remainder", exact: true })
    .click();
  const coefficients = page.getByRole("tabpanel", {
    name: "Coefficients",
    exact: true,
  });
  for (let last = 23; last < 95; last += 8) {
    await coefficients
      .getByRole("button", {
        name: `Select coefficient a${last} = 1`,
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Next rectangle stage" }).click();
  }
  await coefficients
    .getByRole("button", { name: "Select coefficient a95 = 1", exact: true })
    .click();
  const diagram = page.getByRole("group", {
    name: "Rectangle dissection diagram",
  });
  await expect(diagram).toHaveAttribute("data-stage", "95");
  await expect(
    page.getByRole("button", { name: "Next rectangle stage" }),
  ).toBeDisabled();
  await expect(page.locator(".dissection-status")).toContainText(
    "Infinite expansion: the remainder is never zero",
  );
  const rect = diagram.locator(".rectangle-stage.current rect");
  const box = (await rect.boundingBox())!;
  expect(box.width).toBeGreaterThan(40);
  expect(box.width).toBeCloseTo(box.height, 3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
});
