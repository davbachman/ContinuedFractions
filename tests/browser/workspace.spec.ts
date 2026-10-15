import { test, expect, type Page } from "@playwright/test";
import { representations } from "../../src/workspace";
const left = (page: Page) =>
  page.getByRole("region", { name: "Left representation", exact: true });
const right = (page: Page) =>
  page.getByRole("region", { name: "Right representation", exact: true });
const choose = (page: Page, side: string, kind: string) =>
  page
    .getByRole("combobox", { name: `${side} representation`, exact: true })
    .selectOption(kind);
const number = async (page: Page, value: string) => {
  await page.getByLabel("ENDPOINT α").fill(value);
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
};
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("defaults to two views, synchronizes coefficient edits and undo, and fits desktop/mobile", async ({
  page,
}, info) => {
  await expect(left(page)).toHaveAttribute("data-representation", "symbolic");
  await expect(right(page)).toHaveAttribute("data-representation", "rectangle");
  await left(page)
    .getByRole("button", { name: "Select coefficient a2 = 1", exact: true })
    .click();
  await expect(
    right(page).getByText("Euclidean stage a2", { exact: false }),
  ).toBeVisible();
  await left(page).getByLabel("Edit a2", { exact: true }).fill("3");
  await left(page)
    .getByRole("button", { name: "Apply coefficient", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).not.toHaveValue("5/13");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(left(page).getByLabel("Edit a2", { exact: true })).toHaveValue(
    "1",
  );
  const a = (await left(page).boundingBox())!,
    b = (await right(page).boundingBox())!;
  if (info.project.name === "mobile")
    expect(b.y).toBeGreaterThan(a.y + a.height - 1);
  else expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-comparison-default.png`,
    fullPage: true,
  });
});

test("every representation works on either side, including duplicate models with unique SVG IDs", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const kind of Object.keys(representations)) {
    await choose(page, "Left", kind);
    await choose(page, "Right", kind);
    await expect(left(page)).toHaveAttribute("data-representation", kind);
    await expect(right(page)).toHaveAttribute("data-representation", kind);
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
    expect(
      await page.locator("[id]").evaluateAll((nodes) => {
        const ids = nodes.map((n) => n.id);
        return ids.length === new Set(ids).size;
      }),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("coefficient inspection highlights folded and 3D quotient runs without seeking, and focused panes support playback keys", async ({
  page,
}, info) => {
  await choose(page, "Right", "torus");
  await left(page)
    .getByRole("button", { name: "Select coefficient a2 = 1", exact: true })
    .click();
  await expect(
    right(page).locator('[data-selected-run="2"]').first(),
  ).toBeVisible();
  await expect(
    right(page).getByRole("slider", { name: "Scrub trajectory" }),
  ).toHaveValue("0");
  await right(page)
    .getByRole("button", { name: "Torus 3D", exact: true })
    .click();
  await expect(
    right(page).locator('[data-selected-run="2"]').first(),
  ).toBeAttached();
  await choose(page, "Right", "orbifold");
  await expect(
    right(page).locator('[data-selected-run="2"]').first(),
  ).toBeVisible();
  await right(page)
    .getByRole("button", { name: "Schematic 3D", exact: true })
    .click();
  await expect(
    right(page).locator('[data-selected-run="2"]').first(),
  ).toBeAttached();
  await right(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    right(page).getByRole("slider", { name: "Scrub trajectory" }),
  ).not.toHaveValue("0");
  await page.locator(".comparison-grid").screenshot({
    path: `test-results/${info.project.name}-comparison-selected-run.png`,
  });
});

test("two H² cameras and layers are independent and share trajectory time", async ({
  page,
}, info) => {
  await choose(page, "Left", "h2");
  await choose(page, "Right", "h2");
  const first = left(page).getByRole("img", { name: /Upper half-plane/ }),
    second = right(page).getByRole("img", { name: /Upper half-plane/ });
  const original = await second.getAttribute("data-manual-zoom");
  await left(page)
    .getByRole("button", { name: "Zoom in", exact: true })
    .click();
  await expect(first).not.toHaveAttribute("data-manual-zoom", original!);
  await expect(second).toHaveAttribute("data-manual-zoom", original!);
  await left(page).getByLabel("Ford circles", { exact: true }).uncheck();
  await expect(
    right(page).getByLabel("Ford circles", { exact: true }),
  ).toBeChecked();
  await left(page)
    .getByRole("slider", { name: "Scrub trajectory" })
    .fill("1.2");
  await expect(
    right(page).getByRole("slider", { name: "Scrub trajectory" }),
  ).toHaveValue("1.2");
  await choose(page, "Right", "torus");
  await right(page).getByLabel("Cover lift", { exact: true }).selectOption("3");
  await expect(
    left(page).getByRole("img", { name: /Upper half-plane/ }),
  ).toHaveAttribute("data-torus-lift", "3");
  await right(page)
    .getByRole("button", { name: "Torus 3D", exact: true })
    .click();
  await page.locator(".comparison-grid").screenshot({
    path: `test-results/${info.project.name}-comparison-torus.png`,
  });
});

test("rectangle playback leaves hyperbolic time independent and unavailable inputs retain the number", async ({
  page,
}) => {
  await choose(page, "Left", "h2");
  await left(page).getByRole("slider", { name: "Scrub trajectory" }).fill("2");
  await right(page)
    .getByRole("button", { name: "Restart dissection", exact: true })
    .click();
  await right(page)
    .getByRole("button", { name: "Next stage", exact: true })
    .click();
  await expect(
    left(page).getByRole("slider", { name: "Scrub trajectory" }),
  ).toHaveValue("2");
  for (const value of ["0", "-1", "infinity"]) {
    await number(page, value);
    await expect(right(page).locator(".view-unavailable")).toBeVisible();
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue(
      value === "infinity" ? "∞" : value,
    );
  }
  await choose(page, "Left", "symbolic");
  await expect(left(page).getByText(/∞ has no finite regular/)).toBeVisible();
});

test("canonical tangle selection links coefficients, custom words and irrational convergents stay explicit", async ({
  page,
}, info) => {
  await choose(page, "Right", "tangle");
  await left(page)
    .getByRole("button", { name: "Select coefficient a2 = 1", exact: true })
    .click();
  await expect(
    right(page).getByRole("button", {
      name: "Select twist region 5",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await right(page)
    .getByRole("button", { name: "Select twist region 1", exact: true })
    .click();
  await expect(
    left(page).getByRole("button", {
      name: "Select coefficient a4 = 2",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await right(page)
    .getByRole("button", { name: "Add +1 endpoint twist", exact: true })
    .click();
  await expect(
    right(page).getByText(/Custom signed construction/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(right(page).getByText(/Canonical construction/)).toBeVisible();
  await page.getByLabel("ENDPOINT α").fill("φ");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  await right(page)
    .getByLabel("Tangle convergent", { exact: true })
    .selectOption("4");
  await expect(
    right(page).getByText(/Approximation: convergent/),
  ).toContainText("8/5");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await right(page)
    .getByRole("button", { name: "Add +1 endpoint twist", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await page.locator(".comparison-grid").screenshot({
    path: `test-results/${info.project.name}-comparison-tangle.png`,
  });
});

test("Farey flips preserve the target, shared undo works, and layouts survive reload and atlas switching", async ({
  page,
}) => {
  await choose(page, "Left", "h2");
  await choose(page, "Right", "triangulation");
  await right(page)
    .getByRole("button", { name: "Next flip step", exact: true })
    .click();
  await expect(
    left(page).getByRole("img", { name: /Upper half-plane/ }),
  ).toHaveAttribute("data-triangulation", "0 | 1/2 | 1");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(
    left(page).getByRole("img", { name: /Upper half-plane/ }),
  ).toHaveAttribute("data-triangulation", "0 | ∞ | 1");
  await page.reload();
  await expect(left(page)).toHaveAttribute("data-representation", "h2");
  await expect(right(page)).toHaveAttribute(
    "data-representation",
    "triangulation",
  );
  await page.getByRole("button", { name: "Full atlas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The upper half-plane", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Compare two views", exact: true })
    .click();
  await expect(right(page)).toHaveAttribute(
    "data-representation",
    "triangulation",
  );
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});

test("Farey crossing highlights obey each pane's Farey edges toggle while seeking", async ({
  page,
}) => {
  await choose(page, "Left", "h2");
  await choose(page, "Right", "h2");
  const a = left(page).getByRole("img", { name: /Upper half-plane/ });
  const b = right(page).getByRole("img", { name: /Upper half-plane/ });
  const highlightPixels = (canvas: typeof a) =>
    canvas.evaluate((element) => {
      const node = element as HTMLCanvasElement;
      const pixels = node
        .getContext("2d")!
        .getImageData(0, 0, node.width, node.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i] === 207 && pixels[i + 1] === 116 && pixels[i + 2] === 72)
          count++;
      return count;
    });
  const scrub = left(page).getByRole("slider", { name: "Scrub trajectory" });
  await scrub.fill("2");
  await page.locator('.comparison-coefficients [data-coefficient="2"]').click();
  await expect.poll(() => highlightPixels(a)).toBeGreaterThan(0);
  await left(page).getByLabel("Farey edges", { exact: true }).uncheck();
  await expect.poll(() => highlightPixels(a)).toBe(0);
  await expect.poll(() => highlightPixels(b)).toBeGreaterThan(0);
  for (const time of ["3", "4", "6", "2"]) {
    await scrub.fill(time);
    await expect.poll(() => highlightPixels(a)).toBe(0);
  }
  await page.locator('.comparison-coefficients [data-coefficient="2"]').click();
  await left(page).getByLabel("Farey edges", { exact: true }).check();
  await expect.poll(() => highlightPixels(a)).toBeGreaterThan(0);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});

test("removed views disappear and old links and saved layouts retain the shared number", async ({
  page,
}, info) => {
  await number(page, "13/5");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("cf-atlas-scene") || "{}").scene?.spec
            ?.value,
      ),
    )
    .toEqual({ p: "13", q: "5" });
  await page.evaluate(() =>
    localStorage.setItem(
      "cf-atlas-comparison",
      JSON.stringify([{ kind: "intervals" }, { kind: "lattice" }]),
    ),
  );
  await page.goto("/");
  await expect(left(page)).toHaveAttribute("data-representation", "symbolic");
  await expect(right(page)).toHaveAttribute("data-representation", "rectangle");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await page.goto("/?left=closure&right=intervals");
  await expect(left(page)).toHaveAttribute("data-representation", "tangle");
  await expect(right(page)).toHaveAttribute("data-representation", "symbolic");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await page.evaluate(() =>
    localStorage.setItem(
      "cf-atlas-comparison",
      JSON.stringify([{ kind: "errors" }, { kind: "errors" }]),
    ),
  );
  await page.goto("/");
  await expect(left(page)).toHaveAttribute("data-representation", "symbolic");
  await expect(right(page)).toHaveAttribute("data-representation", "rectangle");
  await page.goto("/?left=errors&right=errors");
  await expect(left(page)).toHaveAttribute("data-representation", "symbolic");
  await expect(right(page)).toHaveAttribute("data-representation", "rectangle");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await page.goto("/?left=matrices&right=matrices");
  await expect(left(page)).toHaveAttribute("data-representation", "symbolic");
  await expect(right(page)).toHaveAttribute("data-representation", "rectangle");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await page.goto("/?left=pillowcase&right=pillowcase");
  await expect(left(page)).toHaveAttribute("data-representation", "symbolic");
  await expect(right(page)).toHaveAttribute("data-representation", "rectangle");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  for (const name of ["Left representation", "Right representation"]) {
    const options = await page
      .getByLabel(name, { exact: true })
      .locator("option")
      .allTextContents();
    expect(options.join(" ")).not.toMatch(
      /2-bridge|knot|interval|lattice|approximation errors|measure approximation|matrix|pillowcase/i,
    );
  }
  await expect(
    page.getByLabel("Numerator closure", { exact: true }),
  ).toHaveCount(0);
  await number(page, "8/3");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await page.locator(".comparison-grid").screenshot({
    path: `test-results/${info.project.name}-simplified-workspace.png`,
  });
});

test("inline alpha editing replaces the top controls and preserves exact edits and undo", async ({
  page,
}, info) => {
  await expect(page).toHaveTitle("Continued Fraction Explorer");
  await expect(
    page.getByRole("heading", { name: "Continued Fraction Explorer" }),
  ).toBeVisible();
  await expect(page.locator(".intro")).toHaveCount(0);
  const alpha = page.locator(".comparison-strip").getByLabel("ENDPOINT α");
  await expect(alpha).toHaveCount(1);
  await expect(
    page
      .locator(".site-header")
      .getByRole("button", { name: "Share scene", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".site-header .history-tools button")).toHaveCount(
    5,
  );
  await expect(
    page.locator(
      ".number-bar, .preset-group, .comparison-presets, .connection-caption",
    ),
  ).toHaveCount(0);
  await alpha.fill("13/5");
  await expect(left(page).locator(".symbolic-value")).toContainText("5/13");
  await alpha.press("Enter");
  await expect(left(page).locator(".symbolic-value")).toContainText("13/5");
  await expect(right(page).locator(".rectangle-overview")).toContainText(
    "α = 13/5",
  );
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(alpha).toHaveValue("5/13");
  await page.getByRole("button", { name: "Redo number edit" }).click();
  await expect(alpha).toHaveValue("13/5");
  await alpha.fill("0/0");
  await alpha.press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(left(page).locator(".symbolic-value")).toContainText("13/5");
  await alpha.press("Escape");
  await expect(alpha).toHaveValue("13/5");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Input options", { exact: true })).toHaveCount(0);
  await expect(page.locator(".comparison-footnote")).toHaveCount(0);
  await alpha.fill("[1; 2]");
  await alpha.press("Enter");
  await expect(alpha).toHaveValue("3/2");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(alpha).toHaveValue("13/5");
  await page.screenshot({
    path: `test-results/${info.project.name}-inline-alpha.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("selected strip coefficients edit inline, validate, cancel, and share undo", async ({
  page,
}, info) => {
  const strip = page.locator(".comparison-strip");
  await expect(strip.locator(".strip-edit")).toHaveCount(0);
  await strip
    .getByRole("button", { name: "Highlight coefficient a2 = 1", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const edit = strip.getByRole("textbox", {
    name: "Edit coefficient a2",
    exact: true,
  });
  await expect(edit).toBeFocused();
  await page.keyboard.type("3");
  await expect(edit).toHaveValue("3");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await edit.press("Enter");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("11/25");
  await expect(right(page).locator(".rectangle-overview")).toContainText(
    "α = 11/25",
  );
  await edit.fill("0");
  await edit.press("Enter");
  await expect(page.getByRole("alert")).toContainText("positive integer");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("11/25");
  await edit.press("Escape");
  await expect(edit).toHaveValue("3");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await edit.fill("7");
  await page.getByLabel("ENDPOINT α").focus();
  await expect(edit).toHaveValue("3");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(edit).toHaveValue("1");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page
    .getByRole("button", { name: "Redo number edit", exact: true })
    .click();
  await expect(edit).toHaveValue("3");
  await number(page, "phi");
  await strip.locator('[data-coefficient="2"]').click();
  await edit.fill("3");
  await edit.press("Enter");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue(
    "[1, 1, 3; overline(1)]",
  );
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await number(page, "13/5");
  await strip.locator('[data-coefficient="0"]').click();
  await strip.getByLabel("Edit coefficient a0", { exact: true }).fill("-2");
  await strip.getByLabel("Edit coefficient a0", { exact: true }).press("Enter");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("-7/5");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await strip.screenshot({
    path: `test-results/${info.project.name}-inline-coefficients.png`,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await number(page, "infinity");
  await expect(strip.locator(".coefficient-inline-editor")).toHaveCount(0);
});
