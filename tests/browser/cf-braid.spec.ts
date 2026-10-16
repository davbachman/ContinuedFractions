import { test, expect, type Page } from "@playwright/test";
const pane = (page: Page, side: string) =>
  page.getByRole("region", { name: `${side} representation`, exact: true });
const number = async (page: Page, value: string) => {
  await page.getByLabel("ENDPOINT α").fill(value);
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
};
const braid = (page: Page) =>
  page.getByRole("group", {
    name: "Continued-fraction four-plat diagram",
    exact: true,
  });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?left=symbolic&right=braid");
});

test("vertical CF boxes select and edit the shared coefficient, with undo and responsive layouts", async ({
  page,
}, info) => {
  const right = pane(page, "Right"),
    left = pane(page, "Left");
  await expect(braid(page)).toHaveAttribute("data-fraction", "5/13");
  await expect(braid(page).locator("[data-braid-coefficient]")).toHaveCount(5);
  expect(
    await braid(page)
      .locator("[data-twist-pair]")
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-twist-pair")),
      ),
  ).toEqual(["1–2", "2–3", "1–2", "2–3", "1–2"]);
  await expect(braid(page).locator("[data-plat-cap]")).toHaveCount(4);
  await right
    .getByRole("button", {
      name: "Select braid coefficient a2 = 1",
      exact: true,
    })
    .click();
  await expect(
    left.getByRole("button", {
      name: "Select coefficient a2 = 1",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Edit coefficient a2", { exact: true }).fill("3");
  await page.locator(".coefficient-inline-editor input").press("Enter");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("11/25");
  await expect(braid(page)).toHaveAttribute("data-fraction", "11/25");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(braid(page)).toHaveAttribute("data-fraction", "5/13");
  await left
    .getByRole("button", { name: "Select coefficient a3 = 1", exact: true })
    .click();
  await expect(
    braid(page).locator('[data-braid-coefficient="3"]'),
  ).toHaveAttribute("data-selected", "true");
  await right
    .getByRole("button", {
      name: "Select braid coefficient a1 = 2",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Edit coefficient a1", { exact: true }),
  ).toHaveValue("2");
  await right
    .locator(".cf-braid-panel")
    .screenshot({ path: `test-results/${info.project.name}-cf-braid.png` });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.reload();
  await expect(pane(page, "Right")).toHaveAttribute(
    "data-representation",
    "braid",
  );
  await expect(braid(page)).toHaveAttribute("data-fraction", "5/13");
});

test("split endings keep coefficient identity and rectangle playback highlights the braid", async ({
  page,
}) => {
  await number(page, "13/5");
  const right = pane(page, "Right");
  await expect(right.getByTestId("braid-ending")).toContainText(
    "Both final boxes belong to a3",
  );
  await right
    .getByRole("button", {
      name: "Select braid coefficient a3 = 2 (split ending)",
      exact: true,
    })
    .last()
    .click();
  await expect(braid(page).locator('[data-selected="true"]')).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("rectangle");
  await page
    .getByRole("button", { name: "Restart dissection", exact: true })
    .click();
  await expect(
    braid(page).locator('[data-braid-coefficient="0"]'),
  ).toHaveAttribute("data-selected", "true");
  await page.getByRole("button", { name: "Next stage", exact: true }).click();
  await expect(
    braid(page).locator('[data-braid-coefficient="1"]'),
  ).toHaveAttribute("data-selected", "true");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
});

test("irrationals explicitly use the selected convergent, and conversion, edits and undo remain shared", async ({
  page,
}) => {
  await number(page, "phi");
  const right = pane(page, "Right");
  await expect(page.locator(".shared-approximation")).toContainText(
    "α remains irrational",
  );
  await page
    .getByLabel("Diagram convergent", { exact: true })
    .selectOption("4");
  await expect(braid(page)).toHaveAttribute("data-fraction", "8/5");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await page
    .getByRole("button", { name: "Use approximation as α", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("8/5");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await page.locator('.comparison-coefficients [data-coefficient="1"]').click();
  await page.getByLabel("Edit coefficient a1", { exact: true }).fill("3");
  await page.locator(".coefficient-inline-editor input").press("Enter");
  await expect(page.getByLabel("ENDPOINT α")).not.toHaveValue("φ");
  await expect(page.locator(".shared-approximation")).toBeVisible();
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
});

test("zero, infinity, negative and large inputs have honest topology and bounded rendering", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [value, components, name] of [
    ["0", "2", "unlink"],
    ["infinity", "1", "Unknot"],
    ["3", "1", "Right-handed trefoil"],
    ["-3", "1", "Left-handed trefoil"],
    ["5/2", "1", "Figure-eight"],
    ["2", "2", "Hopf"],
  ]) {
    await number(page, value);
    await expect(braid(page)).toHaveAttribute("data-components", components);
    await expect(pane(page, "Right").locator(".braid-closure")).toContainText(
      name,
    );
  }
  await number(page, "1/10000000000000000000000000000000000000003");
  await expect(pane(page, "Right").locator(".topology-limit")).toContainText(
    "Counts and connectivity stay exact",
  );
  expect(await braid(page).locator("path").count()).toBeLessThan(50);
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("tangle");
  await expect(pane(page, "Left")).toContainText(
    "1/10000000000000000000000000000000000000003",
  );
  await page.setViewportSize({
    width: info.project.name === "mobile" ? 412 : 1100,
    height: 950,
  });
  await expect(braid(page)).toHaveAttribute(
    "data-fraction",
    "1/10000000000000000000000000000000000000003",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("whole-knot framing includes both closures and detail can reach the bottom", async ({
  page,
}, info) => {
  const right = pane(page, "Right");
  for (const value of ["355/113", "233/144", "infinity"]) {
    await number(page, value);
    const viewport = right.locator(".braid-scroll");
    await viewport.scrollIntoViewIfNeeded();
    const bounds = await viewport.evaluate((frame) => {
      const rect = frame.getBoundingClientRect();
      return {
        height: frame.clientHeight,
        scrollHeight: frame.scrollHeight,
        caps: [...frame.querySelectorAll("[data-plat-cap]")].map((cap) => {
          const box = cap.getBoundingClientRect();
          return { top: box.top - rect.top, bottom: box.bottom - rect.top };
        }),
      };
    });
    expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.height + 1);
    for (const cap of bounds.caps) {
      expect(cap.top).toBeGreaterThan(0);
      expect(cap.bottom).toBeLessThan(bounds.height);
    }
  }
  await number(page, "355/113");
  await right.locator(".braid-scroll").scrollIntoViewIfNeeded();
  await right.locator(".braid-scroll").screenshot({
    path: `test-results/${info.project.name}-braid-fit.png`,
  });
  await right
    .getByRole("button", { name: "Inspect twists", exact: true })
    .click();
  const bottomCap = braid(page).locator("[data-plat-cap]").last();
  await bottomCap.scrollIntoViewIfNeeded();
  await expect(bottomCap).toBeInViewport();
  await right
    .getByRole("button", { name: "Fit whole knot", exact: true })
    .click();
  await expect(right.locator(".braid-scroll")).toHaveJSProperty("scrollTop", 0);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("355/113");
  await expect(braid(page)).toHaveAttribute("data-fraction", "355/113");
});

test("scroll gestures in Inspect twists reveal the entire bottom closure", async ({
  page,
}, info) => {
  await page.setViewportSize({
    width: info.project.name === "mobile" ? 390 : 1280,
    height: 720,
  });
  await number(page, "355/113");
  const right = pane(page, "Right");
  await right
    .getByRole("button", { name: "Inspect twists", exact: true })
    .click();
  const bottomCaps = braid(page).locator("[data-plat-cap]");
  const touch =
    info.project.name === "mobile"
      ? await page.context().newCDPSession(page)
      : null;
  const bottomVisible = () =>
    bottomCaps.evaluateAll((caps) =>
      caps.slice(-2).every((cap) => {
        const r = cap.getBoundingClientRect();
        const x = (r.left + r.right) / 2;
        const clip = cap.closest(".pane-body")!.getBoundingClientRect();
        const mobile = innerWidth <= 760;
        return (
          r.top >= 0 &&
          r.bottom < innerHeight - 4 &&
          (mobile || (r.top >= clip.top && r.bottom < clip.bottom - 4)) &&
          x > 0 &&
          x < innerWidth
        );
      }),
    );
  for (let step = 0; step < 12 && !(await bottomVisible()); step++) {
    const point = await right.locator(".braid-scroll").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: (r.left + r.right) / 2,
        y: Math.min(innerHeight - 70, Math.max(100, r.top + 80)),
      };
    });
    if (touch) {
      const { x } = point;
      const y = Math.max(300, point.y);
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let move = 1; move <= 6; move++) {
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y - move * 30 }],
        });
        await page.waitForTimeout(30);
      }
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else {
      await page.mouse.move(point.x, point.y);
      await page.mouse.wheel(0, 180);
    }
    await page.waitForTimeout(150);
  }
  expect(await bottomVisible()).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-braid-detail-bottom.png`,
  });
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("355/113");
});
