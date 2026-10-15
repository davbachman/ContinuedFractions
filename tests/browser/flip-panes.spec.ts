import { test, expect, type Page } from "@playwright/test";
const pane = (page: Page, side: string) =>
  page.getByRole("region", { name: `${side} representation`, exact: true });
const button = (page: ReturnType<typeof pane>, name: string) =>
  page.getByRole("button", { name, exact: true });
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test("paired Farey and square panes share following, coefficient runs and playback", async ({
  page,
}, info) => {
  await page
    .getByLabel("Comparison preset", { exact: true })
    .selectOption({ label: "Continued fractions → flips" });
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  const farey = left.getByRole("group", {
    name: "Interactive Farey triangles",
    exact: true,
  });
  const square = right.getByRole("group", {
    name: "Marked torus triangulation",
    exact: true,
    includeHidden: true,
  });
  await expect(farey).toBeVisible();
  await expect(square).toBeVisible();
  await expect(
    left.getByRole("group", {
      name: "Marked torus triangulation",
      exact: true,
      includeHidden: true,
    }),
  ).toBeHidden();
  await expect(
    right.getByRole("group", {
      name: "Interactive Farey triangles",
      exact: true,
    }),
  ).toBeHidden();
  await expect(right.locator(".flip-patch")).toBeHidden();
  await expect(button(left, "Follow target")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await button(right, "Next flip step").click();
  await expect(farey).toHaveAttribute(
    "data-slopes",
    (await square.getAttribute("data-slopes")) as string,
  );
  await expect(left.getByTestId("flip-run-caption")).toContainText(
    "Initial crossing",
  );
  await button(left, "Next flip step").click();
  await expect(right.getByTestId("flip-run-caption")).toContainText(
    "a1 = 2 · L run · 1 of 1",
  );
  await page
    .getByRole("button", { name: "Highlight coefficient a3 = 1", exact: true })
    .click();
  await expect(left.locator('[data-selected-run="3"]')).toHaveCount(1);
  await expect(left.getByTestId("flip-status")).toContainText("Step 2");
  await button(left, "Go to selected run").click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 4");
  await button(right, "Previous flip step").click();
  await button(left, "Play flips").click();
  await expect(button(right, "Pause flips")).toBeVisible();
  await expect(right.getByTestId("flip-status")).toContainText("Step 4", {
    timeout: 4000,
  });
  await button(right, "Pause flips").click();
  await expect(button(left, "Play flips")).toBeVisible();
  await button(right, "Next flip step").click();
  await expect(left.getByTestId("flip-status")).toContainText(
    "Terminal triangle",
  );
  await expect(button(left, "Next flip step")).toBeDisabled();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page
    .locator(".comparison-grid")
    .screenshot({ path: `test-results/${info.project.name}-farey-square.png` });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("manual edits work from either pane; inspector and cameras preserve shared slopes and undo", async ({
  page,
}, info) => {
  await page.goto("/?left=farey&right=triangulation");
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  const square = right.getByRole("group", {
    name: "Marked torus triangulation",
    exact: true,
    includeHidden: true,
  });
  await button(left, "Flip via Farey triangle replacing 1 with -1").click();
  await expect(square).toHaveAttribute("data-slopes", "0 | ∞ | -1");
  await button(right, "Flip edge -1").click();
  await expect(
    left.getByRole("group", {
      name: "Interactive Farey triangles",
      exact: true,
    }),
  ).toHaveAttribute("data-slopes", "0 | ∞ | 1");
  await button(right, "Explain this flip").click();
  await expect(square).toBeHidden();
  await expect(
    right.getByRole("img", { name: "Universal-cover flip quadrilateral" }),
  ).toBeVisible();
  await right.getByLabel("Tiled-plane inset", { exact: true }).check();
  await button(right, "Fixed-basis patch").click();
  await expect(square).toHaveAttribute("data-slopes", "0 | ∞ | 1");
  await right.locator(".triangulation-panel").screenshot({
    path: `test-results/${info.project.name}-flip-inspector.png`,
  });
  await button(right, "Back to diagram").click();
  await expect(square).toBeVisible();
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(square).toHaveAttribute("data-slopes", "0 | ∞ | -1");
  await page
    .getByRole("button", { name: "Redo number edit", exact: true })
    .click();
  await expect(square).toHaveAttribute("data-slopes", "0 | ∞ | 1");
  await button(right, "Flip edge 0").focus();
  await page.keyboard.press("Enter");
  await expect(square).toHaveAttribute("data-slopes", "2 | ∞ | 1");
  await left
    .getByText("Edge actions, history & display options", { exact: true })
    .click();
  await button(left, "Center Farey triangle").click();
  await expect(square).toHaveAttribute("data-slopes", "2 | ∞ | 1");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});

test("H² playback and seeking drive follow-target flips in both directions", async ({
  page,
}) => {
  await page.goto("/?left=h2&right=farey");
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  await button(right, "Follow target").click();
  await button(right, "Next flip step").click();
  const clock = left.getByRole("slider", { name: "Scrub trajectory" });
  expect(Number(await clock.inputValue())).toBeGreaterThan(0);
  await clock.fill("0");
  await expect(right.getByTestId("flip-status")).toContainText("Step 0");
  await left.getByLabel("Playback speed", { exact: true }).selectOption("4");
  await button(left, "Play trajectory").click();
  await expect(right.getByTestId("flip-status")).not.toContainText("Step 0", {
    timeout: 4000,
  });
  await button(left, "Pause trajectory").click();
  await expect(button(right, "Play flips")).toBeVisible();
  await clock.fill("3");
  await left.getByLabel("Reverse", { exact: true }).check();
  await button(left, "Play trajectory").click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 0", {
    timeout: 4000,
  });
  if (await button(left, "Pause trajectory").isVisible())
    await button(left, "Pause trajectory").click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});
