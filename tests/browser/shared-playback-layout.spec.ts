import { expect, test } from "@playwright/test";
for (const [left, right, clock, play, reset] of [
  [
    "rectangle",
    "h2",
    "Sequence progress",
    "Play linked playback",
    "Restart linked playback",
  ],
  ["h2", "farey", "Scrub trajectory", "Play trajectory", "Restart trajectory"],
  ["farey", "triangulation", "Scrub trajectory", "Play flips", "Restart flips"],
  [
    "rectangle",
    "braid",
    "Dissection stage",
    "Play dissection",
    "Restart dissection",
  ],
]) {
  test(`${left}/${right}: alpha then slider with Play and Reset on its right`, async ({
    page,
  }, info) => {
    await page.goto(`/?left=${left}&right=${right}&leftLift=0&rightLift=0`);
    const nav = page.getByRole("region", {
      name: "Shared playback",
      exact: true,
    });
    const slider = nav.getByRole("slider", { name: clock, exact: true });
    const playButton = nav.getByRole("button", { name: play, exact: true });
    const resetButton = nav.getByRole("button", { name: reset, exact: true });
    await expect(playButton).toBeVisible();
    await expect(resetButton).toHaveText(/Reset/);
    await expect(page.getByLabel("Synchronize by coefficient")).toHaveCount(0);
    await expect(
      page.locator(".comparison-pane").getByRole("button", {
        name: /^(Play|Pause|Restart) (trajectory|linked playback|flips|dissection)$/,
      }),
    ).toHaveCount(0);
    const alpha = (await page.locator(".comparison-strip").boundingBox())!;
    const bar = (await nav.boundingBox())!;
    const panes = (await page.locator(".comparison-grid").boundingBox())!;
    const scrub = (await slider.boundingBox())!;
    const button = (await playButton.boundingBox())!;
    const restart = (await resetButton.boundingBox())!;
    expect(bar.y).toBeGreaterThanOrEqual(alpha.y + alpha.height);
    expect(panes.y).toBeGreaterThanOrEqual(bar.y + bar.height);
    expect(button.x).toBeGreaterThan(scrub.x + scrub.width);
    expect(restart.x).toBeGreaterThan(button.x);
    expect(restart.width).toBeGreaterThanOrEqual(44);
    expect(restart.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/${info.project.name}-${left}-${right}-playback-layout.png`,
      fullPage: true,
    });
  });
}

test("rectangle/H² synchronization stays automatic after coefficient clicks, edits, view switches and undo", async ({
  page,
}) => {
  await page.goto("/?left=rectangle&right=h2&leftLift=0&rightLift=0");
  await expect(
    page.getByRole("button", { name: "Undo number edit" }),
  ).toBeDisabled();
  await page.getByLabel("ENDPOINT α").fill("13/20");
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
  await page.getByRole("button", { name: "Restart linked playback" }).click();
  await page.getByRole("slider", { name: "Sequence progress" }).fill("0.1");
  await page.getByRole("button", { name: "Next linked stage" }).click();
  await expect(
    page.getByLabel("Edit coefficient a1", { exact: true }),
  ).toHaveValue("1");
  await expect(page.getByTestId("linked-run-status")).toContainText("No flips");
  await page
    .getByRole("button", { name: "Highlight coefficient a2 = 1", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Rectangle dissection diagram" }),
  ).toHaveAttribute("data-stage", "2");
  await page
    .getByRole("combobox", { name: "Right representation", exact: true })
    .selectOption("farey");
  await expect(
    page.getByRole("button", { name: "Play linked playback" }),
  ).toBeVisible();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/20");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(
    page.getByRole("button", { name: "Play linked playback" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Undo number edit" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Redo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/20");
  await expect(
    page.getByRole("button", { name: "Play linked playback" }),
  ).toBeVisible();
});
