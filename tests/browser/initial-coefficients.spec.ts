import { expect, test } from "@playwright/test";
import { derive } from "../../src/math/trajectory";
import { parseInput } from "../../src/math/continuedFraction";
for (const view of ["braid", "tangle"]) {
  test(`${view} highlights a0, a1=1, and a2 through H² playback, stepping and reverse seeking`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/?left=${view}&right=h2`);
    const start = new Date("2026-10-15T10:00:00Z");
    await page.clock.install({ time: start });
    await page.clock.pauseAt(start);
    const select = async (i: number) => {
      await expect(
        page.getByLabel(`Edit coefficient a${i}`, { exact: true }),
      ).toBeVisible();
      if (view === "braid")
        await expect(
          page.locator(`[data-braid-coefficient="${i}"]`).first(),
        ).toHaveAttribute("data-selected", "true");
      else
        await expect(page.locator(".tangle-panel")).toHaveAttribute(
          "data-linked-coefficient",
          String(i),
        );
    };
    for (const alpha of ["13/20", "53/20"]) {
      await page.getByLabel("ENDPOINT α").fill(alpha);
      await page
        .getByRole("button", { name: "Apply endpoint", exact: true })
        .click();
      const crossings = derive(parseInput(alpha), 12).farey.crossings;
      const entry = crossings[0].time,
        next = crossings.find((c) => c.term === 2)!.time;
      const mid = (entry + next) / 2;
      await page
        .getByRole("button", { name: "Restart trajectory", exact: true })
        .click();
      await select(0);
      if (view === "tangle")
        await expect(page.getByTestId("tangle-run-focus")).toContainText(
          alpha === "13/20" ? "zero twists" : "H(2)",
        );
      await page
        .getByRole("button", { name: "Play trajectory", exact: true })
        .click();
      await page.clock.runFor(500);
      await select(0);
      await page.clock.runFor(Math.round((mid - 0.5) * 1000) + 40);
      await select(1);
      if (view === "tangle") {
        await expect(page.getByTestId("tangle-run-focus")).toContainText(
          "H(-1)",
        );
        expect(
          await page.locator('path[data-active-region="true"]').count(),
        ).toBeGreaterThan(0);
      }
      await page.clock.runFor(Math.round((next - mid + 0.15) * 1000));
      await select(2);
      await page
        .getByRole("button", { name: "Pause trajectory", exact: true })
        .click();
      const scrub = page.getByRole("slider", {
        name: "Scrub trajectory",
        exact: true,
      });
      await scrub.fill(String(Number(mid.toFixed(3))));
      await select(1);
      await scrub.fill("0");
      await select(0);
      await page
        .getByRole("button", { name: "Next crossing", exact: true })
        .click();
      await select(1);
      await page
        .getByRole("button", { name: "Next crossing", exact: true })
        .click();
      await select(2);
      await page
        .getByRole("button", { name: "Previous crossing", exact: true })
        .click();
      await select(1);
      await expect(page.getByLabel("ENDPOINT α")).toHaveValue(alpha);
    }
  });
}
