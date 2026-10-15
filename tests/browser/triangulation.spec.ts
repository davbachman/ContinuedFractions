import { test, expect } from "@playwright/test";
import { initialScene, serialize } from "../../src/state";
import { initialTriangulation } from "../../src/math/triangulation";
import { rational } from "../../src/math/rational";
const button = (page: any, name: string) =>
  page.getByRole("button", { name, exact: true });
test.beforeEach(async ({ page }) => {
  await page.goto("/?layout=atlas");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByText("Edge actions, history & display options", { exact: true })
    .click();
});
test("all edge classes and Farey neighbors flip bidirectionally without replacing the target", async ({
  page,
}, info) => {
  const torus = page.getByRole("group", {
      name: "Marked torus triangulation",
      exact: true,
      includeHidden: true,
    }),
    farey = page.getByRole("group", {
      name: "Interactive Farey triangles",
      exact: true,
      includeHidden: true,
    });
  await button(page, "Flip edge 1").click();
  await expect(torus).toHaveAttribute("data-slopes", "0 | ∞ | -1");
  await expect(farey).toHaveAttribute("data-slopes", "0 | ∞ | -1");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await button(page, "Undo shared edit").click();
  await expect(torus).toHaveAttribute("data-slopes", "0 | ∞ | 1");
  await button(page, "Redo shared edit").click();
  await button(page, "Flip edge -1").click();
  await expect(torus).toHaveAttribute("data-slopes", "0 | ∞ | 1");
  // Top boundary copy is the same class as the bottom boundary.
  const copy = torus
    .getByRole("button", { name: "Flip torus edge 0", exact: true })
    .locator('path[stroke="transparent"]')
    .nth(1);
  await torus.scrollIntoViewIfNeeded();
  const boundary = (await copy.boundingBox())!;
  if (info.project.name === "mobile")
    await page.touchscreen.tap(
      boundary.x + boundary.width / 2,
      boundary.y + boundary.height / 2,
    );
  else
    await page.mouse.click(
      boundary.x + boundary.width / 2,
      boundary.y + boundary.height / 2,
    );
  await expect(torus).toHaveAttribute("data-slopes", "2 | ∞ | 1");
  await button(page, "Reset triangulation").click();
  await torus
    .getByRole("button", { name: "Flip torus edge ∞", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(torus).toHaveAttribute("data-slopes", "0 | 1/2 | 1");
  await button(page, "Reset triangulation").click();
  await button(page, "Farey triangles").click();
  await button(page, "Flip via Farey triangle replacing 1 with -1").click();
  await button(page, "Marked square").click();
  await expect(torus).toHaveAttribute("data-slopes", "0 | ∞ | -1");
  await expect(page.getByTestId("flip-operation-caption")).toContainText(
    "replace 1 with -1",
  );
  await button(page, "Use slope -1 as target").click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("-1");
  await expect(torus).toHaveAttribute("data-slopes", "0 | ∞ | -1");
  await button(page, "Undo shared edit").click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});
test("the existing H² viewer selects a neighboring Farey triangle", async ({
  page,
}) => {
  await page.getByLabel("Show triangulation in H²", { exact: true }).check();
  const canvas = page.getByRole("img", { name: /Upper half-plane/ });
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!,
    scale = Number(await canvas.getAttribute("data-scale")),
    alphaX = Number(await canvas.getAttribute("data-alpha-x"));
  await page.mouse.click(
    box.x + alphaX + (0.5 - 5 / 13) * scale,
    box.y + box.height - 32 - 0.35 * scale,
  );
  await expect(canvas).toHaveAttribute("data-triangulation", "0 | 1/2 | 1");
  await expect(
    page.getByRole("group", {
      name: "Marked torus triangulation",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("data-slopes", "0 | 1/2 | 1");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});
test("target following stops at a rational cusp triangle and extends irrational itineraries", async ({
  page,
}) => {
  await button(page, "Follow target").click();
  for (let i = 0; i < 5; i++) await button(page, "Next flip step").click();
  await expect(page.getByTestId("flip-status")).toContainText(
    "Terminal triangle incident to the rational target cusp",
  );
  await expect(button(page, "Next flip step")).toBeDisabled();
  await expect(
    page.getByRole("img", { name: /Upper half-plane/ }),
  ).toHaveAttribute("data-selected-term", "4");
  const lastTime = await page
    .getByRole("slider", { name: "Scrub trajectory", exact: true })
    .inputValue();
  await page
    .getByRole("slider", { name: "Scrub trajectory", exact: true })
    .fill("0");
  await expect(page.getByTestId("flip-status")).toContainText("Step 0");
  await page
    .getByRole("slider", { name: "Scrub trajectory", exact: true })
    .fill(lastTime);
  await expect(page.getByTestId("flip-status")).toContainText(
    "Terminal triangle",
  );
  await button(page, "Previous flip step").click();
  await expect(page.getByTestId("flip-status")).not.toContainText(
    "Terminal triangle",
  );
  await button(page, "φ").click();
  await expect(page.getByTestId("flip-status")).toContainText("Step 0");
  const before = await page.locator(".flip-history button").count();
  await button(page, "Extend flip itinerary").click();
  expect(await page.locator(".flip-history button").count()).toBeGreaterThan(
    before,
  );
  await button(page, "Play flips").click();
  await expect(page.getByTestId("flip-status")).toContainText("Step 1", {
    timeout: 4000,
  });
  await button(page, "Pause flips").click();
  await page.locator(".flip-history button").last().click();
  await expect(page.getByTestId("flip-status")).toContainText(
    "Infinite itinerary",
  );
  await page.getByLabel("ENDPOINT α").fill("3");
  await button(page, "Apply endpoint").click();
  await expect(page.getByTestId("flip-status")).toContainText(
    "ray lies on a Farey edge",
  );
  await expect(button(page, "Next flip step")).toBeDisabled();
});
test("wrapped edges, model and camera changes, path navigation and persistence preserve exact slopes", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const torus = page.getByRole("group", {
    name: "Marked torus triangulation",
    exact: true,
    includeHidden: true,
  });
  for (const slope of ["0", "∞", "1", "2"])
    await button(page, `Flip edge ${slope}`).click();
  await expect(torus).toHaveAttribute("data-slopes", "8/5 | 3/2 | 5/3");
  await page.getByLabel("Puncture at vertex", { exact: true }).check();
  await button(page, "Explain this flip").click();
  await page.getByLabel("Tiled-plane inset", { exact: true }).check();
  await page.getByLabel("Tiled-plane inset", { exact: true }).uncheck();
  await button(page, "Center Farey triangle").click();
  await button(page, "Fixed-basis patch").click();
  await button(page, "Affine patch close-up").click();
  await page.setViewportSize({
    width: info.project.name === "mobile" ? 412 : 1100,
    height: 950,
  });
  await expect(torus).toHaveAttribute("data-slopes", "8/5 | 3/2 | 5/3");
  await button(page, "Previous flip step").click();
  await button(page, "Next flip step").click();
  await expect(torus).toHaveAttribute("data-slopes", "8/5 | 3/2 | 5/3");
  await button(page, "Back to diagram").click();
  await page
    .locator(".triangulation-grid")
    .screenshot({ path: `test-results/${info.project.name}-marked-flips.png` });
  await button(page, "Explain this flip").click();
  await page.getByLabel("Tiled-plane inset", { exact: true }).check();
  await page
    .locator(".flip-patch")
    .screenshot({ path: `test-results/${info.project.name}-flip-patch.png` });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("cf-atlas-scene") || "{}").scene
            ?.triangulation?.cursor,
      ),
    )
    .toBe(4);
  await page.reload();
  await expect(torus).toHaveAttribute("data-slopes", "8/5 | 3/2 | 5/3");
  expect(errors).toEqual([]);
});
test("large exact slopes disclose wrap limits while keyboard flip controls remain available", async ({
  page,
}) => {
  const n = 10n ** 80n;
  const scene = {
    ...initialScene,
    triangulation: {
      ...initialTriangulation,
      start: [
        rational(n),
        rational(n + 1n),
        rational(2n * n + 1n, 2n),
      ] as const,
    },
  };
  await page.locator("input[type=file]").setInputFiles({
    name: "large-triangulation.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(scene)),
  });
  await expect(page.locator(".triangulation-panel")).toContainText(
    "Wrap display limit",
  );
  await button(page, "Center Farey triangle").click();
  await expect(page.getByTestId("triangulation-slope-0")).toHaveText(String(n));
  await page.locator(".flip-slope-strip button").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("triangulation-slope-0")).not.toHaveText(
    String(n),
  );
  await button(page, "Undo shared edit").click();
  await expect(page.getByTestId("triangulation-slope-0")).toHaveText(String(n));
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("flip animation highlights the old incident triangles before revealing the new wrapped edge", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await button(page, "Flip edge 0").click();
  await expect(page.locator(".flip-animating")).toHaveCount(1);
  await expect(page.locator(".flip-incident-triangles")).toHaveCount(1);
  await expect(page.locator(".flip-animating")).toHaveCount(0, {
    timeout: 2500,
  });
  await expect(
    page.getByRole("button", { name: "Flip torus edge 2", exact: true }),
  ).toBeVisible();
  await button(page, "Undo shared edit").click();
  await expect(
    page.getByRole("group", {
      name: "Marked torus triangulation",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("data-slopes", "0 | ∞ | 1");
});
