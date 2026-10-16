import { test, expect, type Page } from "@playwright/test";
import { parseInput } from "../../src/math/continuedFraction";
import { derive } from "../../src/math/trajectory";
import { coefficientInterval } from "../../src/math/coefficientTimeline";
const pane = (page: Page, side: string) =>
  page.getByRole("region", { name: `${side} representation`, exact: true });
const diagram = (page: Page) =>
  page.getByRole("group", { name: "Rectangle dissection diagram" });
const clock = (page: Page) =>
  page.getByRole("slider", { name: "Sequence progress" });
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
  await number(page, "13/5");
  await number(page, "5/13");
  await page
    .getByRole("button", { name: "Highlight coefficient a1 = 2", exact: true })
    .click();
  const right = pane(page, "Right"),
    left = pane(page, "Left");
  const disk = right.getByRole("group", { name: "Poincare Disk", exact: true });
  await expect(disk.locator("[data-dual-flip-path]")).toHaveCount(0);
  await clock(page).fill("0.3");
  await expect(disk).toHaveAttribute("data-flip-cursor", "3");
  await clock(page).fill("0.15");
  await expect(disk).toHaveAttribute("data-flip-cursor", "1");
  await expect(diagram(page)).toHaveAttribute("data-stage", "1");
  await page.getByText("Linked playback options", { exact: true }).click();
  await page.getByLabel("Linked playback speed").selectOption("1");
  await page
    .getByRole("button", { name: "Play linked playback", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause linked playback", exact: true }),
  ).toBeVisible();
  await expect(diagram(page)).toHaveAttribute("data-stage", "2", {
    timeout: 5000,
  });
  await page
    .getByRole("button", { name: "Pause linked playback", exact: true })
    .click();
  const stopped = await clock(page).inputValue();
  await page.waitForTimeout(180);
  await expect(clock(page)).toHaveValue(stopped);
  const pausedStage = Number(await diagram(page).getAttribute("data-stage"));
  await page
    .getByRole("button", { name: "Previous linked stage", exact: true })
    .click();
  await expect(diagram(page)).toHaveAttribute(
    "data-stage",
    String(pausedStage - 1),
  );
  await page.locator('.comparison-coefficients [data-coefficient="4"]').click();
  await clock(page).fill("1");
  await expect(disk).toHaveAttribute("data-flip-cursor", "5");
  await expect(page.getByTestId("linked-run-status")).toContainText(
    "Rational dissection complete",
  );
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(page.getByLabel("Synchronize by coefficient")).toHaveCount(0);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
  await page
    .getByRole("button", { name: "Redo number edit", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page
    .getByRole("combobox", { name: "Right representation", exact: true })
    .selectOption("triangulation");
  await page.getByRole("button", { name: "Restart linked playback" }).click();
  await clock(page).fill("0.15");
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

for (const view of ["h2", "farey", "orbifold", "torus"]) {
  test(`rectangle clock drives ${view}, including zero runs and edits`, async ({
    page,
  }, info) => {
    await page.goto(`/?left=rectangle&right=${view}`);
    await number(page, "1/2");
    await page
      .getByRole("button", {
        name: "Highlight coefficient a1 = 2",
        exact: true,
      })
      .click();
    await expect(diagram(page)).toHaveAttribute("data-stage", "1");
    await expect(page.getByTestId("linked-run-status")).toContainText(
      "No flips",
    );
    const time = page.getByTestId("linked-time");
    const entry = await time.textContent();
    await clock(page).fill("1");
    await expect(time).toHaveText("t = 12.000");
    await page.getByRole("button", { name: "Restart linked playback" }).click();
    await expect(diagram(page)).toHaveAttribute("data-stage", "0");
    await expect(page.getByTestId("linked-run-status")).toContainText(
      "orientation change; no squares removed",
    );
    await clock(page).fill("0.25");
    await expect(time).not.toHaveText(entry!);
    await clock(page).fill("1");
    await expect(time).toHaveText("t = 12.000");
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
      await expect(
        page.getByRole("region", { name: "Shared playback" }),
      ).toContainText("Coefficient runs");
      await page.locator(".comparison-workspace").screenshot({
        path: `test-results/${info.project.name}-linked-torus.png`,
      });
    }
    await number(page, "13/5");
    await expect(page.getByLabel("Synchronize by coefficient")).toHaveCount(0);
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
    await page
      .locator('.comparison-coefficients [data-coefficient="2"]')
      .click();
    await expect(diagram(page)).toHaveAttribute("data-stage", "2");
    await pane(page, "Right").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(diagram(page)).toHaveAttribute("data-stage", "1");
    if (view !== "h2" && view !== "farey") {
      const right = pane(page, "Right");
      await page
        .locator('.comparison-coefficients [data-coefficient="2"]')
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
      await expect(page.getByLabel("Synchronize by coefficient")).toHaveCount(
        0,
      );
      await expect(
        page.getByRole("button", { name: "Play linked playback", exact: true }),
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
    const next = page.getByRole("button", {
      name: "Next linked stage",
      exact: true,
    });
    for (let i = 0; i < 96 && (await next.isEnabled()); i++) await next.click();
    await clock(page).fill("1");
    await expect(page.getByTestId("linked-run-status")).toContainText(
      "sequence is incomplete",
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
  await page
    .getByRole("button", { name: "Highlight coefficient a1 = 7", exact: true })
    .click();
  await page.getByText("Linked playback options", { exact: true }).click();
  await page.getByLabel("Linked playback speed").selectOption("2");
  const right = pane(page, "Right");
  const start = await page.getByTestId("linked-time").textContent();
  await page
    .getByRole("button", { name: "Play linked playback", exact: true })
    .click();
  await expect(page.getByTestId("linked-time")).not.toHaveText(start!);
  await expect(page.getByTestId("linked-run-status")).toContainText(
    /(?:[1-5]) of 5 flips/,
  );
  await page
    .getByRole("button", { name: "Pause linked playback", exact: true })
    .click();
  await page.getByLabel("Reverse linked playback", { exact: true }).check();
  await page
    .getByRole("button", { name: "Play linked playback", exact: true })
    .click();
  await expect(diagram(page)).toHaveAttribute("data-stage", "0", {
    timeout: 6000,
  });
  await expect(
    page.getByRole("button", { name: "Play linked playback", exact: true }),
  ).toBeVisible({ timeout: 6000 });
  await expect(clock(page)).toHaveValue("0");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("1/7");
});

test("rectangle playback emphasizes canonical tangle regions", async ({
  page,
}, info) => {
  await page.goto("/?left=rectangle&right=tangle");
  const left = pane(page, "Left"),
    right = pane(page, "Right");
  await page
    .getByRole("button", { name: "Restart linked playback", exact: true })
    .click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "Next linked stage", exact: true })
      .click();
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
  await page
    .getByRole("button", { name: "Previous linked stage", exact: true })
    .click();
  await expect(right.getByTestId("tangle-run-focus")).toContainText(
    "a3 → signed region",
  );
  await page
    .locator(".comparison-grid")
    .screenshot({ path: `test-results/${info.project.name}-tangle-step.png` });
  await page
    .getByRole("button", { name: "Restart linked playback", exact: true })
    .click();
  await expect(right.getByTestId("tangle-run-focus")).toContainText(
    "zero twists",
  );
  await expect(right.locator('path[data-active-region="true"]')).toHaveCount(0);
  await right.locator(".tangle-expression summary").click();
  await right
    .getByRole("button", { name: "Add +1 endpoint twist", exact: true })
    .click();
  await expect(right.getByTestId("tangle-run-focus")).toHaveCount(0);
  await expect(right).toContainText("Custom signed construction");
});

test("one slider traverses the whole sequence and coefficient clicks jump to its intervals", async ({
  page,
}, info) => {
  await page.goto("/?left=rectangle&right=h2&leftLift=0&rightLift=0");
  await number(page, "13/20");
  const start = new Date("2026-10-16T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  const crossings = derive(parseInput("13/20"), 12).farey.crossings;
  const starts = [0, 1, 2, 3, 4].map(
    (term) => coefficientInterval(crossings, term, 12)!.start,
  );
  for (const term of [4, 1, 3, 0, 2]) {
    await page
      .locator(`.comparison-coefficients [data-coefficient="${term}"]`)
      .click();
    expect(Number(await clock(page).inputValue())).toBeCloseTo(
      starts[term] / 12,
      2,
    );
    await expect(diagram(page)).toHaveAttribute("data-stage", String(term));
    await expect(
      page.getByLabel(`Edit coefficient a${term}`, { exact: true }),
    ).toBeVisible();
  }
  // Scrubbing into the zero-crossing a1 must select it while H² moves.
  await clock(page).fill("0.15");
  await expect(diagram(page)).toHaveAttribute("data-stage", "1");
  await expect(page.getByTestId("linked-run-status")).toContainText("No flips");
  await page.getByRole("button", { name: "Restart linked playback" }).click();
  await page.getByText("Linked playback options", { exact: true }).click();
  await page.getByLabel("Linked playback speed").selectOption("2");
  for (const reverse of [false, true]) {
    if (reverse)
      await page.getByLabel("Reverse linked playback", { exact: true }).check();
    await page
      .getByRole("button", { name: "Play linked playback", exact: true })
      .click();
    let previous = reverse ? 1 : 0;
    const seen = new Set<number>();
    for (let i = 0; i < 26; i++) {
      await page.clock.runFor(250);
      const progress = Number(await clock(page).inputValue());
      if (reverse) expect(progress).toBeLessThanOrEqual(previous);
      else expect(progress).toBeGreaterThanOrEqual(previous);
      previous = progress;
      const term = Number(await diagram(page).getAttribute("data-stage"));
      seen.add(term);
      await expect(
        page.getByLabel(`Edit coefficient a${term}`, { exact: true }),
      ).toBeVisible();
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
    await expect(clock(page)).toHaveValue(reverse ? "0" : "1");
    await expect(
      page.getByRole("button", { name: "Play linked playback", exact: true }),
    ).toBeVisible();
  }
  await page.locator('.comparison-coefficients [data-coefficient="3"]').click();
  await page.screenshot({
    path: `test-results/${info.project.name}-sequence-progress.png`,
    fullPage: true,
  });
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/20");
});

for (const view of ["h2", "farey"]) {
  test(`smooth ${view} playback moves during a1=1 and survives coefficient boundaries`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/?left=rectangle&right=${view}`);
    await number(page, "13/20");
    await page.getByText("Linked playback options", { exact: true }).click();
    await page.getByLabel("Linked playback speed").selectOption("2");
    const time = async () =>
      Number(
        (await page.getByTestId("linked-time").textContent())!.replace(
          "t = ",
          "",
        ),
      );
    const play = page.getByRole("button", {
      name: "Play linked playback",
      exact: true,
    });
    const pause = page.getByRole("button", {
      name: "Pause linked playback",
      exact: true,
    });
    // Real RAF scheduling exercises React commits overlapping animation frames.
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    for (const reverse of [false, true]) {
      if (reverse)
        await page
          .getByLabel("Reverse linked playback", { exact: true })
          .check();
      else
        await page
          .getByRole("button", { name: "Restart linked playback" })
          .click();
      await play.click();
      await expect(diagram(page)).toHaveAttribute("data-stage", "1", {
        timeout: 30000,
      });
      const before = await time();
      await page.waitForTimeout(180);
      const after = await time();
      if (reverse) expect(after).toBeLessThan(before);
      else expect(after).toBeGreaterThan(before);
      await expect(pause).toBeVisible();
      await expect(clock(page)).toHaveValue(reverse ? "0" : "1", {
        timeout: 20000,
      });
      await expect(play).toBeVisible();
    }
    await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/20");
  });
}

for (const alpha of ["13/20", "5/13"]) {
  test(`${alpha}: equal elapsed times give equal hyperbolic motion across coefficient boundaries`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/?left=rectangle&right=h2");
    await number(page, alpha);
    const start = new Date("2026-10-16T12:00:00Z");
    await page.clock.install({ time: start });
    await page.clock.pauseAt(start);
    await page.getByRole("button", { name: "Restart linked playback" }).click();
    await page.getByText("Linked playback options", { exact: true }).click();
    for (const reverse of [false, true]) {
      const speed = reverse ? 2 : 1;
      await page
        .getByLabel("Linked playback speed")
        .selectOption(String(speed));
      await page
        .getByLabel("Reverse linked playback", { exact: true })
        .setChecked(reverse);
      await page
        .getByRole("button", { name: "Play linked playback", exact: true })
        .click();
      for (let i = 1; i <= 24 / speed; i++) {
        await page.clock.runFor(500);
        const expectedTime = reverse ? 12 - (i * speed) / 2 : (i * speed) / 2;
        const time = Number(
          (await page.getByTestId("linked-time").textContent())!.replace(
            "t = ",
            "",
          ),
        );
        expect(Math.abs(time - expectedTime)).toBeLessThan(0.065 * speed);
        expect(
          Math.abs(Number(await clock(page).inputValue()) - expectedTime / 12),
        ).toBeLessThan(0.006 * speed);
      }
      await page.clock.runFor(100);
      await expect(clock(page)).toHaveValue(reverse ? "0" : "1");
      await expect(
        page.getByRole("button", { name: "Play linked playback", exact: true }),
      ).toBeVisible();
    }
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue(alpha);
  });
}

test("2/7 completes exactly and Play restarts from the beginning", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?left=rectangle&right=h2");
  await number(page, "2/7");
  const start = new Date("2026-10-16T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  await clock(page).fill("1");
  await expect(page.getByTestId("linked-run-status")).toContainText(
    "Rational dissection complete",
  );
  await page
    .getByRole("button", { name: "Play linked playback", exact: true })
    .click();
  await page.clock.runFor(500);
  expect(Number(await clock(page).inputValue())).toBeGreaterThan(0.03);
  expect(Number(await clock(page).inputValue())).toBeLessThan(0.05);
  await expect(diagram(page)).toHaveAttribute("data-stage", "0");
});
