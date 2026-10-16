import { test, expect } from "@playwright/test";

for (const [left, right, kind] of [
  ["h2", "farey", "trajectory"],
  ["torus", "orbifold", "trajectory"],
  ["farey", "triangulation", "flips"],
  ["rectangle", "h2", "linked playback"],
]) {
  test(`${left}/${right} bounces at both ends, resumes inward, and stays paused when stopped`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/?left=${left}&right=${right}`);
    await page.getByLabel("ENDPOINT α").fill("13/20");
    await page
      .getByRole("button", { name: "Apply endpoint", exact: true })
      .click();
    const start = new Date("2026-10-16T12:00:00Z");
    await page.clock.install({ time: start });
    await page.clock.pauseAt(start);
    const nav = page.getByRole("region", { name: "Shared playback" });
    const slider = nav.getByRole("slider");
    await nav
      .getByRole("combobox", { name: /playback speed/i })
      .selectOption("4");
    const max = Number(await slider.getAttribute("max"));
    // Flip playback ends at its last recorded crossing, before the H² cutoff.
    if (kind === "flips") {
      while (
        await nav.getByRole("button", { name: "Next flip step" }).isEnabled()
      )
        await nav.getByRole("button", { name: "Next flip step" }).click();
    } else await slider.fill(String(max));
    const end = Number(await slider.inputValue());
    await nav
      .getByRole("button", { name: `Play ${kind}`, exact: true })
      .click();
    await page.clock.runFor(250);
    const inward = Number(await slider.inputValue());
    expect(inward).toBeLessThan(end);
    await nav
      .getByRole("button", { name: `Pause ${kind}`, exact: true })
      .click();
    await page.clock.runFor(200);
    expect(Number(await slider.inputValue())).toBe(inward);
    await nav
      .getByRole("button", { name: `Play ${kind}`, exact: true })
      .click();
    await page.clock.runFor(100);
    expect(Number(await slider.inputValue())).toBeLessThan(inward);
    // Cross both turning points without pausing or selecting a reverse option.
    const cycleMs = ((kind === "linked playback" ? 12 : end) / 4) * 1000;
    await page.clock.runFor(cycleMs * 2);
    await expect(
      nav.getByRole("button", { name: `Pause ${kind}`, exact: true }),
    ).toBeVisible();
    await nav
      .getByRole("button", { name: `Pause ${kind}`, exact: true })
      .click();
    const stopped = await slider.inputValue();
    await page.clock.runFor(500);
    await expect(slider).toHaveValue(stopped);
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/20");
    await expect(page.getByLabel(/^Reverse/)).toHaveCount(0);
  });
}

test("standalone dissection bounces through its exact stages", async ({
  page,
}) => {
  await page.goto("/?layout=atlas");
  const start = new Date("2026-10-16T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  await page
    .getByRole("button", { name: "Rectangle dissection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart dissection", exact: true })
    .click();
  const nav = page.getByRole("region", { name: "Rectangle stage transport" });
  await nav.getByLabel("Playback speed", { exact: true }).selectOption("4");
  await nav
    .getByRole("button", { name: "Play dissection", exact: true })
    .click();
  const diagram = page.getByRole("group", {
    name: "Rectangle dissection diagram",
  });
  for (const stage of [1, 2, 3, 4, 3, 2, 1, 0, 1]) {
    await page.clock.runFor(350);
    await expect(diagram).toHaveAttribute("data-stage", String(stage));
  }
  await nav
    .getByRole("button", { name: "Pause dissection", exact: true })
    .click();
  await page.clock.runFor(700);
  await expect(diagram).toHaveAttribute("data-stage", "1");
});

test("Undo pauses flip playback without changing the target, while automatic return keeps playing", async ({
  page,
}) => {
  await page.goto("/?left=farey&right=triangulation");
  const start = new Date("2026-10-16T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  const nav = page.getByRole("region", { name: "Shared playback" });
  const slider = nav.getByRole("slider");
  for (let i = 0; i < 2; i++)
    await nav
      .getByRole("button", { name: "Next flip step", exact: true })
      .click();
  await nav.getByRole("button", { name: "Play flips", exact: true }).click();
  await page.clock.runFor(200);
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(
    nav.getByRole("button", { name: "Play flips", exact: true }),
  ).toBeVisible();
  const stopped = await slider.inputValue();
  await page.clock.runFor(500);
  await expect(slider).toHaveValue(stopped);
  await page
    .getByRole("button", { name: "Redo number edit", exact: true })
    .click();
  await expect(
    nav.getByRole("button", { name: "Play flips", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});
