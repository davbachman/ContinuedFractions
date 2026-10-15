import { test, expect, type Page } from "@playwright/test";
const pane = (page: Page, side: string) =>
  page.getByRole("region", { name: `${side} representation`, exact: true });
const diagram = (page: Page) =>
  page.getByRole("group", { name: "Rectangle dissection diagram" });
const link = (page: Page) =>
  page.getByRole("checkbox", { name: "Synchronize by coefficient" });
const clock = (page: Page) =>
  page.getByRole("slider", { name: "Progress through coefficient run" });
async function number(page: Page, input: string) {
  await page.getByLabel("ENDPOINT α").fill(input);
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("rectangle run clock controls either flip pane, pauses, reverses and preserves undo", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?left=rectangle&right=farey");
  const right = pane(page, "Right"),
    left = pane(page, "Left");
  await link(page).check();
  await expect(
    right.getByRole("button", { name: "Follow target", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await clock(page).fill("1");
  await expect(right.getByTestId("flip-status")).toContainText("Step 2");
  await clock(page).fill("0");
  await expect(right.getByTestId("flip-status")).toContainText("Step 1");
  await expect(diagram(page)).toHaveAttribute("data-stage", "1");
  await page.getByLabel("Linked playback speed").selectOption("1");
  await left
    .getByRole("button", { name: "Play linked playback", exact: true })
    .click();
  await expect(
    right.getByRole("button", { name: "Pause linked playback", exact: true }),
  ).toBeVisible();
  await expect(diagram(page)).toHaveAttribute("data-stage", "2", {
    timeout: 5000,
  });
  await right
    .getByRole("button", { name: "Pause linked playback", exact: true })
    .click();
  const stopped = await clock(page).inputValue();
  await page.waitForTimeout(180);
  await expect(clock(page)).toHaveValue(stopped);
  const pausedStage = Number(await diagram(page).getAttribute("data-stage"));
  await left
    .getByRole("button", { name: "Previous linked stage", exact: true })
    .click();
  await expect(diagram(page)).toHaveAttribute(
    "data-stage",
    String(pausedStage - 1),
  );
  await page
    .getByRole("button", { name: "Highlight coefficient a4 = 2", exact: true })
    .click();
  await clock(page).fill("1");
  await expect(right.getByTestId("flip-status")).toContainText(
    "Terminal triangle",
  );
  await expect(page.getByTestId("linked-run-status")).toContainText(
    "Rational dissection complete",
  );
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(link(page)).not.toBeChecked();
  await expect(
    right.getByRole("button", { name: "Manual flips", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Redo number edit", exact: true })
    .click();
  await expect(right.getByTestId("flip-status")).toContainText(
    "Terminal triangle",
  );
  await page
    .getByRole("combobox", { name: "Right representation", exact: true })
    .selectOption("triangulation");
  await link(page).check();
  await page.getByRole("button", { name: "Restart linked playback" }).click();
  await clock(page).fill("1");
  await expect(right.getByTestId("flip-status")).toContainText("Step 1");
  await page.locator(".comparison-workspace").screenshot({
    path: `test-results/${info.project.name}-linked-square.png`,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

for (const view of ["h2", "orbifold", "torus"]) {
  test(`rectangle clock drives ${view}, including zero runs and edits`, async ({
    page,
  }, info) => {
    await page.goto(`/?left=rectangle&right=${view}`);
    await number(page, "1/2");
    await link(page).check();
    await expect(diagram(page)).toHaveAttribute("data-stage", "1");
    await expect(page.getByTestId("linked-run-status")).toContainText(
      "No crossings",
    );
    const time = pane(page, "Right").getByText(/Linked run · hyperbolic time/);
    const held = await time.textContent();
    await clock(page).fill("1");
    await expect(time).toHaveText(held!);
    await page.getByRole("button", { name: "Restart linked playback" }).click();
    await expect(diagram(page)).toHaveAttribute("data-stage", "0");
    await expect(page.getByTestId("linked-run-status")).toContainText(
      "orientation change; no squares removed",
    );
    await clock(page).fill("0.5");
    await expect(time).not.toHaveText(held!);
    await clock(page).fill("1");
    await expect(time).toHaveText(held!);
    if (view === "torus") {
      await pane(page, "Right")
        .getByRole("button", { name: "Torus 3D", exact: true })
        .click();
      const before = await time.textContent();
      const surface = pane(page, "Right").getByRole("img", {
        name: "Schematic six-sheet punctured torus",
        exact: true,
      });
      await surface.press("ArrowRight");
      await expect(time).toHaveText(before!);
      await expect(link(page)).toBeChecked();
      await page.locator(".comparison-workspace").screenshot({
        path: `test-results/${info.project.name}-linked-torus.png`,
      });
    }
    await number(page, "13/5");
    await expect(link(page)).not.toBeChecked();
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
    await link(page).check();
    await page
      .getByRole("button", {
        name: "Highlight coefficient a2 = 1",
        exact: true,
      })
      .click();
    await expect(diagram(page)).toHaveAttribute("data-stage", "2");
    await pane(page, "Right").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(diagram(page)).toHaveAttribute("data-stage", "1");
    if (view !== "h2") {
      const right = pane(page, "Right");
      await page
        .getByRole("button", {
          name: "Highlight coefficient a2 = 1",
          exact: true,
        })
        .click();
      if (view === "torus")
        await right
          .getByRole("button", { name: "Flat hexagon", exact: true })
          .click();
      // Exercise the existing chart-path selection handler independently of camera occlusion.
      await right
        .locator('path[data-selected-run="2"]')
        .first()
        .dispatchEvent("click");
      await expect(link(page)).not.toBeChecked();
      await expect(
        right.getByRole("button", { name: "Play trajectory", exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
    }
  });
}

test("irrational cutoff and large coefficients are incomplete, not terminal", async ({
  page,
}) => {
  await page.goto("/?left=rectangle&right=farey");
  for (const input of ["phi", "sqrt2", "1/10000"]) {
    await number(page, input);
    await link(page).check();
    const next = pane(page, "Left").getByRole("button", {
      name: "Next linked stage",
      exact: true,
    });
    for (let i = 0; i < 96 && (await next.isEnabled()); i++) await next.click();
    await clock(page).fill("1");
    await expect(page.getByTestId("linked-run-status")).toContainText(
      "run is incomplete",
    );
    await expect(page.getByTestId("linked-run-status")).not.toContainText(
      "Rational dissection complete",
    );
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue(
      input === "phi" ? "φ" : input === "sqrt2" ? "√2" : input,
    );
  }
});

test("smooth run playback traverses multiple crossings and reverses without changing the target", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?left=rectangle&right=h2");
  await number(page, "1/7");
  await link(page).check();
  await page.getByLabel("Linked playback speed").selectOption("2");
  const right = pane(page, "Right");
  const start = await right
    .getByText(/Linked run · hyperbolic time/)
    .textContent();
  await right
    .getByRole("button", { name: "Play linked playback", exact: true })
    .click();
  await expect(right.getByText(/Linked run · hyperbolic time/)).not.toHaveText(
    start!,
  );
  await expect(page.getByTestId("linked-run-status")).toContainText(
    /(?:[1-5]) of 5 flips/,
  );
  await right
    .getByRole("button", { name: "Pause linked playback", exact: true })
    .click();
  await page.getByLabel("Reverse linked playback", { exact: true }).check();
  await right
    .getByRole("button", { name: "Play linked playback", exact: true })
    .click();
  await expect(diagram(page)).toHaveAttribute("data-stage", "0", {
    timeout: 6000,
  });
  await expect(
    right.getByRole("button", { name: "Play linked playback", exact: true }),
  ).toBeVisible({ timeout: 6000 });
  await expect(clock(page)).toHaveValue("0");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("1/7");
});

test("rectangle playback emphasizes matrix factors and canonical tangle regions", async ({
  page,
}, info) => {
  await page.goto("/?left=rectangle&right=matrices");
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  await expect(right.locator(".matrix-new-factor")).toContainText(
    "Append A(a1)",
  );
  await left.getByRole("button", { name: "Next stage", exact: true }).click();
  await expect(right.locator(".matrix-new-product")).toContainText(
    "Exact product M2",
  );
  await page
    .locator(".comparison-grid")
    .screenshot({ path: `test-results/${info.project.name}-matrix-step.png` });
  await left.getByRole("button", { name: "Next stage", exact: true }).click();
  await left.getByRole("button", { name: "Next stage", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Right representation", exact: true })
    .selectOption("tangle");
  await right
    .getByRole("button", { name: "Lifted tangle 3D", exact: true })
    .click();
  await expect(right.getByTestId("tangle-run-focus")).toContainText(
    "a4 → signed region",
  );
  await expect(
    right.locator('path[data-active-region="true"]').first(),
  ).toHaveAttribute("opacity", "1");
  await left
    .getByRole("button", { name: "Previous stage", exact: true })
    .click();
  await expect(right.getByTestId("tangle-run-focus")).toContainText(
    "a3 → signed region",
  );
  await page
    .locator(".comparison-grid")
    .screenshot({ path: `test-results/${info.project.name}-tangle-step.png` });
  await left
    .getByRole("button", { name: "Restart dissection", exact: true })
    .click();
  await expect(right.getByTestId("tangle-run-focus")).toContainText(
    "zero twists",
  );
  await expect(right.locator('path[data-active-region="true"]')).toHaveCount(0);
  await right
    .getByRole("button", { name: "Add +1 endpoint twist", exact: true })
    .click();
  await expect(right.getByTestId("tangle-run-focus")).toHaveCount(0);
  await expect(right).toContainText("Custom signed construction");
});
