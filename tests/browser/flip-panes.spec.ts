import { test, expect, type Page } from "@playwright/test";
import { parseInput } from "../../src/math/continuedFraction";
import {
  targetItinerary,
  coefficientFlipPosition,
} from "../../src/math/triangulation";
const pane = (page: Page, side: string) =>
  page.getByRole("region", { name: `${side} representation`, exact: true });
const button = (page: ReturnType<typeof pane>, name: string) =>
  page.getByRole("button", { name, exact: true });
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test("visible restart and coefficient following synchronize both flip panes without replacing α", async ({
  page,
}, info) => {
  await page.goto("/?left=farey&right=triangulation");
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  const coefficient = (i: number, _value: number) =>
    page.locator(`.comparison-coefficients [data-coefficient="${i}"]`);
  await coefficient(3, 1).click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 4 / 5");
  await expect(
    page.getByRole("button", { name: "Go to selected coefficient" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Follow selected coefficient", { exact: true }),
  ).toHaveCount(0);
  await coefficient(1, 2).click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 1 / 5");
  await expect(right.getByTestId("flip-status")).toContainText("Step 1 / 5");
  await button(page.locator(".shared-playback"), "Restart flips").click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 0 / 5");
  await expect(coefficient(0, 0)).toHaveValue("0");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 1 / 5");
  await page
    .getByRole("button", { name: "Redo number edit", exact: true })
    .click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 0 / 5");
  await button(page.locator(".shared-playback"), "Play flips").click();
  await expect(
    button(page.locator(".shared-playback"), "Pause flips"),
  ).toBeVisible();
  await button(page.locator(".shared-playback"), "Restart flips").click();
  await expect(
    button(page.locator(".shared-playback"), "Play flips"),
  ).toBeVisible();
  await expect(right.getByTestId("flip-status")).toContainText("Step 0 / 5");
  await coefficient(3, 1).click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 4 / 5");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page.locator(".comparison-grid").screenshot({
    path: `test-results/${info.project.name}-flip-controls.png`,
  });
});

test("coefficient following handles empty runs, unavailable depth, and H² time", async ({
  page,
}) => {
  await page.goto("/?left=h2&right=triangulation");
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  await page.getByLabel("ENDPOINT α").fill("2/3");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  await page.locator('.comparison-coefficients [data-coefficient="1"]').click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 1");
  await expect(right).toContainText("no flip after the boundary offsets");
  await expect(
    page.locator('.comparison-coefficients [data-coefficient="1"]'),
  ).toHaveValue("1");
  expect(
    Number(
      await page.getByRole("slider", { name: "Scrub trajectory" }).inputValue(),
    ),
  ).toBeGreaterThan(0);
  await button(page.locator(".shared-playback"), "Restart flips").click();
  await expect(
    page.getByRole("slider", { name: "Scrub trajectory" }),
  ).toHaveValue("0");
  await page.getByLabel("ENDPOINT α").fill("[0; 1000000, 1, 2]");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  await page.locator('.comparison-coefficients [data-coefficient="3"]').click();
  await expect(
    button(page.locator(".shared-playback"), "Go to selected coefficient"),
  ).toHaveCount(0);
  await expect(page.locator(".shared-playback")).toContainText(
    "beyond the generated flip path",
  );
  await expect(right.getByTestId("flip-status")).toContainText("Step 0");
  await page.getByLabel("ENDPOINT α").fill("3");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  await button(page.locator(".shared-playback"), "Restart flips").click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 0 / 0");
  await page.getByLabel("ENDPOINT α").fill("infinity");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  await expect(
    page.getByLabel("Follow selected coefficient", { exact: true }),
  ).toHaveCount(0);
  await expect(
    button(page.locator(".shared-playback"), "Go to selected coefficient"),
  ).toHaveCount(0);
});
test("paired Farey and square panes share following, coefficient runs and playback", async ({
  page,
}, info) => {
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("farey");
  await page
    .getByRole("combobox", { name: "Right representation", exact: true })
    .selectOption("triangulation");
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  const farey = left.getByRole("group", {
    name: "Poincare Disk",
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
      name: "Poincare Disk",
      exact: true,
    }),
  ).toBeHidden();
  await expect(button(right, "Explain this flip")).toHaveCount(0);
  await expect(right.getByTestId("flip-status")).toContainText("Step 0");
  await expect(
    page.getByRole("button", { name: "Manual flips", exact: true }),
  ).toHaveCount(0);
  await button(page.locator(".shared-playback"), "Next flip step").click();
  await expect(farey).toHaveAttribute(
    "data-slopes",
    (await square.getAttribute("data-slopes")) as string,
  );
  await expect(right.getByTestId("flip-run-caption")).toContainText(
    "Initial crossing",
  );
  await button(page.locator(".shared-playback"), "Next flip step").click();
  await expect(right.getByTestId("flip-run-caption")).toContainText(
    "a1 = 2 · L run · 1 of 1",
  );
  await page.locator('.comparison-coefficients [data-coefficient="3"]').click();
  await expect(left.locator('[data-selected-run="3"]')).toHaveCount(1);
  await expect(right.getByTestId("flip-status")).toContainText("Step 4");
  await button(page.locator(".shared-playback"), "Previous flip step").click();
  // Freeze the animation clock while scrolling between stacked mobile panes.
  // Advance it explicitly so terminal playback cannot race the Pause click.
  const playbackStart = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: playbackStart });
  await page.clock.pauseAt(playbackStart);
  await button(page.locator(".shared-playback"), "Play flips").click();
  await expect(
    button(page.locator(".shared-playback"), "Pause flips"),
  ).toBeVisible();
  await page.clock.runFor(1500);
  await expect(right.getByTestId("flip-status")).toContainText("Step 4", {
    timeout: 4000,
  });
  await button(page.locator(".shared-playback"), "Pause flips").click();
  await expect(
    button(page.locator(".shared-playback"), "Play flips"),
  ).toBeVisible();
  await button(page.locator(".shared-playback"), "Next flip step").click();
  await expect(right.getByTestId("flip-status")).toContainText(
    "Terminal triangle",
  );
  await expect(
    button(page.locator(".shared-playback"), "Next flip step"),
  ).toBeDisabled();
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
test("target-path navigation works from either pane; the square stays visible and cameras preserve shared slopes and undo", async ({
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
  await expect(
    left.getByLabel("Show a hole at the shared corner", { exact: true }),
  ).toHaveCount(0);
  await expect(
    left.getByLabel("Show triangulation in H²", { exact: true }),
  ).toHaveCount(0);
  await expect(
    left.getByRole("button", { name: /^Use slope .* as target$/ }),
  ).toHaveCount(0);
  await button(left, "Highlight edge 0").click();
  await expect(button(right, "Use slope 0 as target")).toBeVisible();
  await expect(square).toHaveAttribute("data-slopes", "0 | ∞ | 1");
  await right
    .getByLabel("Show a hole at the shared corner", { exact: true })
    .check();
  await expect(square.locator('circle[r="6"]')).toHaveCount(4);
  await expect(square).toHaveAttribute("data-slopes", "0 | ∞ | 1");
  await right
    .getByLabel("Show a hole at the shared corner", { exact: true })
    .uncheck();
  await expect(square.locator('circle[r="6"]')).toHaveCount(0);
  await button(
    left,
    "Next path step via Farey triangle replacing ∞ with 1/2",
  ).click();
  await expect(square).toHaveAttribute("data-slopes", "0 | 1/2 | 1");
  await button(page.locator(".shared-playback"), "Previous flip step").click();
  await expect(
    left.getByRole("group", {
      name: "Poincare Disk",
      exact: true,
    }),
  ).toHaveAttribute("data-slopes", "0 | ∞ | 1");
  await expect(button(right, "Explain this flip")).toHaveCount(0);
  await expect(
    right.getByRole("img", { name: "Universal-cover flip quadrilateral" }),
  ).toHaveCount(0);
  await expect(square).toHaveAttribute("data-slopes", "0 | ∞ | 1");
  await right.locator(".triangulation-panel").screenshot({
    path: `test-results/${info.project.name}-marked-square.png`,
  });
  await expect(square).toBeVisible();
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(square).toHaveAttribute("data-slopes", "0 | 1/2 | 1");
  await page
    .getByRole("button", { name: "Redo number edit", exact: true })
    .click();
  await expect(square).toHaveAttribute("data-slopes", "0 | ∞ | 1");
  await button(page.locator(".shared-playback"), "Next flip step").focus();
  await page.keyboard.press("Enter");
  await expect(square).toHaveAttribute("data-slopes", "0 | 1/2 | 1");
  await page.getByText("Flip history", { exact: true }).click();
  await expect(
    button(page.locator(".shared-playback"), "Extend flip itinerary"),
  ).toHaveCount(0);
  await left.locator(".triangulation-panel").screenshot({
    path: `test-results/${info.project.name}-farey-history.png`,
  });
  await button(left, "Center Farey triangle").click();
  await expect(square).toHaveAttribute("data-slopes", "0 | 1/2 | 1");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});

test("H² playback and seeking drive follow-target flips in both directions", async ({
  page,
}) => {
  await page.goto("/?left=h2&right=triangulation");
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  await left.getByText("More layers", { exact: true }).click();
  await expect(left).toContainText(
    "Current triangulation is shown automatically beside a flip view.",
  );
  await expect(
    left.getByLabel("Marked triangulation", { exact: true }),
  ).toHaveCount(0);
  await expect(
    left.getByRole("img", { name: /Upper half-plane/ }),
  ).toHaveAttribute("data-triangulation", "0 | ∞ | 1");
  await left.getByText("More layers", { exact: true }).click();
  await button(page.locator(".shared-playback"), "Next flip step").click();
  const clock = page.getByRole("slider", { name: "Scrub trajectory" });
  expect(Number(await clock.inputValue())).toBeGreaterThan(0);
  await clock.fill("0");
  await expect(right.getByTestId("flip-status")).toContainText("Step 0");
  await page.getByLabel("Playback process").selectOption("trajectory");
  await page.getByText("Playback options & events", { exact: true }).click();
  await page.getByLabel("Playback speed", { exact: true }).selectOption("4");
  await button(page.locator(".shared-playback"), "Play trajectory").click();
  await expect(right.getByTestId("flip-status")).not.toContainText("Step 0", {
    timeout: 4000,
  });
  await button(page.locator(".shared-playback"), "Pause trajectory").click();
  await expect(
    button(page.locator(".shared-playback"), "Play trajectory"),
  ).toBeVisible();
  await clock.fill("3");
  await page.getByLabel("Reverse", { exact: true }).check();
  await button(page.locator(".shared-playback"), "Play trajectory").click();
  await expect(right.getByTestId("flip-status")).toContainText("Step 0", {
    timeout: 4000,
  });
  if (
    await button(
      page.locator(".shared-playback"),
      "Pause trajectory",
    ).isVisible()
  )
    await button(page.locator(".shared-playback"), "Pause trajectory").click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page.getByLabel("ENDPOINT α").fill("phi");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  const stepCount = async () =>
    Number(
      (await right.getByTestId("flip-status").textContent())!.match(
        /Step \d+ \/ (\d+)/,
      )![1],
    );
  const before = await stepCount();

  await button(page.locator(".shared-playback"), "Extend depth +4").click();
  await expect.poll(stepCount).toBeGreaterThan(before);
});

test("typed α, coefficient edits, rectangle resize and undo rebuild the same automatic path", async ({
  page,
}) => {
  await page.goto("/?left=rectangle&right=farey");
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  const farey = right.getByRole("group", {
    name: "Poincare Disk",
    exact: true,
  });
  await page.getByLabel("ENDPOINT α").fill("13/5");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  await expect(farey).toHaveAttribute("data-slopes", "2 | ∞ | 3");
  await button(page.locator(".shared-playback"), "Next linked stage").click();

  await page.locator('.comparison-coefficients [data-coefficient="0"]').click();
  const advanced = await farey.getAttribute("data-slopes");
  await page.getByLabel("Edit coefficient a0", { exact: true }).fill("4");
  await page.getByLabel("Edit coefficient a0", { exact: true }).press("Enter");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("23/5");
  await expect(farey).toHaveAttribute("data-slopes", "4 | ∞ | 5");
  await expect(farey).toHaveAttribute("data-flip-cursor", "0");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await expect(farey).toHaveAttribute("data-slopes", advanced!);
  const handle = left.getByRole("slider", {
    name: "Resize outer rectangle aspect ratio",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("ENDPOINT α")).not.toHaveValue("13/5");
  const updated = await page.getByLabel("ENDPOINT α").inputValue();
  await expect(farey.locator("[data-target-marker] title")).toContainText(
    `Target α = ${updated}`,
  );
  await page
    .getByRole("combobox", { name: "Right representation", exact: true })
    .selectOption("triangulation");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue(updated);
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await expect(
    right.getByRole("group", {
      name: "Marked torus triangulation",
      exact: true,
    }),
  ).toHaveAttribute("data-slopes", advanced!);
});

for (const edgeSide of ["Left", "Right"]) {
  test(`coefficient clicks seek H² and ${edgeSide.toLowerCase()} edge flips automatically for either playback process`, async ({
    page,
  }) => {
    await page.goto(
      edgeSide === "Left"
        ? "/?left=triangulation&right=h2"
        : "/?left=h2&right=triangulation",
    );
    await page.getByLabel("ENDPOINT α").fill("13/20");
    await page
      .getByRole("button", { name: "Apply endpoint", exact: true })
      .click();
    const start = new Date("2026-10-16T12:00:00Z");
    await page.clock.install({ time: start });
    await page.clock.pauseAt(start);
    const spec = parseInput("13/20");
    const itinerary = targetItinerary(spec);
    const edge = pane(page, edgeSide);
    const halfPlane = page.getByRole("img", { name: /Upper half-plane/ });
    const lattice = edge.getByRole("group", {
      name: "Marked torus triangulation",
      exact: true,
    });
    const slider = page.getByRole("slider", { name: "Scrub trajectory" });
    for (const process of ["flips", "trajectory"]) {
      await page.getByLabel("Playback process").selectOption(process);
      await page
        .getByRole("button", {
          name: process === "flips" ? "Play flips" : "Play trajectory",
          exact: true,
        })
        .click();
      await page.clock.runFor(300);
      for (const term of [3, 1, 4, 0, 2]) {
        await page
          .locator(`.comparison-coefficients [data-coefficient="${term}"]`)
          .click();
        const at = coefficientFlipPosition(spec, itinerary, term)!;
        await expect(edge.getByTestId("flip-status")).toContainText(
          `Step ${at.cursor} /`,
        );
        expect(Number(await slider.inputValue())).toBeCloseTo(at.time, 2);
        await expect(halfPlane).toHaveAttribute(
          "data-triangulation",
          (await lattice.getAttribute("data-slopes"))!,
        );
        await expect(
          page.getByLabel(`Edit coefficient a${term}`, { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: /Pause (flips|trajectory)/ }),
        ).toHaveCount(0);
      }
      await page
        .getByRole("button", { name: "Undo number edit", exact: true })
        .click();
      await expect(slider).toHaveValue("0");
      await page
        .getByRole("button", { name: "Redo number edit", exact: true })
        .click();
      expect(Number(await slider.inputValue())).toBeCloseTo(
        coefficientFlipPosition(spec, itinerary, 2)!.time,
        2,
      );
    }
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/20");
    await expect(
      page.getByLabel("Follow selected coefficient", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Go to selected coefficient" }),
    ).toHaveCount(0);
  });
}
