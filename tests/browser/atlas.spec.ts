import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("loads exact default, plays, steps, edits and undoes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(
    page.getByRole("heading", { name: "One number. Many geometries." }),
  ).toBeVisible();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page
    .getByRole("button", { name: "Next Farey crossing", exact: true })
    .click();
  expect(
    Number(
      await page.getByRole("slider", { name: "Scrub trajectory" }).inputValue(),
    ),
  ).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "7/19", exact: true }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("7/19");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page.getByLabel("ENDPOINT α").fill("[0;2,2]");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("2/5");
  await page
    .getByRole("button", { name: "Select coefficient a1 = 2", exact: true })
    .click();
  await page.locator("#coefficient-input").fill("3");
  await page.getByRole("button", { name: "Apply coefficient" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("2/7");
  expect(errors).toEqual([]);
});
test("scene share, download, load, validation and local persistence", async ({
  page,
}) => {
  await page.getByRole("button", { name: "√2", exact: true }).click();
  await page
    .getByRole("button", { name: "Next Farey crossing", exact: true })
    .click();
  await page.getByRole("button", { name: "Share scene" }).click();
  const url = page.url();
  expect(url).toContain("#scene=");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download scene" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("continued-fractions-scene.json");
  await page.goto(url);
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("√2");
  await page.getByLabel("ENDPOINT α").fill("1/0");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await expect(page.getByRole("alert")).toContainText("finite endpoint");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":9}'),
    });
  await expect(page.getByRole("alert")).toContainText("version 1");
  const path = await file.path();
  if (path) {
    await page.locator("input[type=file]").setInputFiles(path);
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("√2");
  }
});
test("quotient, inspection, accessible guide, and no page overflow", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "02 Modular quotient" }).click();
  await page.getByRole("button", { name: "Schematic 3D" }).click();
  await expect(
    page.getByRole("slider", { name: "Rotate schematic surface" }),
  ).toBeVisible();
  await page
    .getByRole("slider", { name: "Rotate schematic surface" })
    .fill("1.2");
  await page.getByRole("button", { name: "Folded domain" }).click();
  await page.getByText("Inspect transformation").click();
  await expect(page.getByText("z ↦ (az + b)/(cz + d)")).toBeVisible();
  await page.locator("#inspect-rational").selectOption("1/2");
  await expect(
    page.getByText("Ford circle 1/2", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await page
    .getByRole("button", { name: "Use this endpoint", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("1/2");
  await page.getByRole("button", { name: "Field guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-atlas.png`,
    fullPage: true,
  });
});
test("keyboard and reduced motion preserve explicit playback controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("h1").click();
  await page.keyboard.press("ArrowRight");
  expect(
    Number(
      await page.getByRole("slider", { name: "Scrub trajectory" }).inputValue(),
    ),
  ).toBeGreaterThan(0);
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
});
test("integer inputs, alternate expressions, and mobile panel changes remain stable", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("button", { name: "Select coefficient a4 = 2", exact: true })
    .click();
  await page.getByLabel("ENDPOINT α").fill("3");
  await page.getByRole("button", { name: "Apply endpoint" }).click();
  await expect(
    page.getByText("On a Farey edge", { exact: true }),
  ).toBeVisible();
  await page.locator("#coefficient-input").fill("-2");
  await page.getByRole("button", { name: "Apply coefficient" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("-2");
  await page.getByRole("button", { name: "5/13", exact: true }).click();
  await page.getByLabel("Alternate ending", { exact: false }).check();
  await expect(
    page.getByRole("button", {
      name: "Select coefficient a5 = 1",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel("Alternate ending", { exact: false }).uncheck();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "02 Modular quotient" }).click();
    await expect(
      page.getByRole("button", { name: "Folded domain" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "01 Upper half-plane" }).click();
    await expect(
      page.getByRole("img", { name: /Upper half-plane/ }),
    ).toBeVisible();
  }
  await page.getByRole("slider", { name: "Scrub trajectory" }).fill("2.6");
  await page.locator("h1").click();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-default.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
