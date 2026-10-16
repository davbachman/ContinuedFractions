import { expect, test } from "@playwright/test";
import { parseInput } from "../../src/math/continuedFraction";
import { derive } from "../../src/math/trajectory";
import { fareyEdgeId, fareyEdgeStyle } from "../../src/renderers/fareyColors";
import { stageColor } from "../../src/renderers/dissectionColors";

for (const diskSide of ["Left", "Right"]) {
  test(`Farey edges and coefficient highlights agree with the disk on the ${diskSide.toLowerCase()}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(
      diskSide === "Left" ? "/?left=farey&right=h2" : "/?left=h2&right=farey",
    );
    const diskPane = page.getByRole("region", {
      name: `${diskSide} representation`,
      exact: true,
    });
    const h2Pane = page.getByRole("region", {
      name: `${diskSide === "Left" ? "Right" : "Left"} representation`,
      exact: true,
    });
    const disk = diskPane.getByRole("group", {
      name: "Poincare Disk",
      exact: true,
    });
    const canvas = h2Pane.getByRole("img", { name: /Upper half-plane/ });
    for (const pane of [diskPane, h2Pane]) {
      await pane.getByLabel("Ford circles", { exact: true }).uncheck();
      await pane.getByText("More layers", { exact: true }).click();
      await pane.getByLabel("Trajectory", { exact: true }).uncheck();
      await pane.getByLabel("Convergents", { exact: true }).uncheck();
    }
    const pixels = () =>
      canvas.evaluate((element) => {
        const node = element as HTMLCanvasElement;
        const data = node
          .getContext("2d")!
          .getImageData(0, 0, node.width, node.height).data;
        let count = 0;
        for (let i = 0; i < data.length; i += 4)
          if (data[i] === 101 && data[i + 1] === 137 && data[i + 2] === 171)
            count++;
        return count;
      });
    await page.getByRole("slider", { name: "Scrub trajectory" }).fill("3");
    await page
      .locator('.comparison-coefficients [data-coefficient="2"]')
      .click();
    const expected = derive(parseInput("5/13"), 12)
      .farey.crossings.filter((c) => c.term === 2)
      .map((c) => fareyEdgeId(c.left, c.right))
      .sort();
    expect(
      await disk
        .locator("[data-highlighted-farey-edge]")
        .evaluateAll((nodes) =>
          nodes
            .map((n) => n.getAttribute("data-highlighted-farey-edge"))
            .sort(),
        ),
    ).toEqual(expected);
    await expect(disk.locator('[data-farey-run="2"]')).toHaveAttribute(
      "stroke",
      stageColor(2),
    );
    await expect(disk.locator('[data-farey-run="2"]')).toHaveAttribute(
      "stroke-width",
      String(fareyEdgeStyle.selectedWidth),
    );
    await expect(disk.locator("[data-disk-farey]")).toHaveAttribute(
      "stroke",
      fareyEdgeStyle.color,
    );
    expect(
      await disk
        .locator("[data-farey-edge]")
        .evaluateAll(
          (nodes) =>
            nodes.length ===
            new Set(nodes.map((n) => n.getAttribute("data-farey-edge"))).size,
        ),
    ).toBe(true);
    await expect.poll(pixels).toBeGreaterThan(0);
    await h2Pane.getByLabel("Farey edges", { exact: true }).uncheck();
    await expect.poll(pixels).toBe(0);
    await expect(disk.locator("[data-highlighted-farey-edge]")).toHaveCount(
      expected.length,
    );
    await diskPane.getByLabel("Farey edges", { exact: true }).uncheck();
    await expect(disk.locator("[data-highlighted-farey-edge]")).toHaveCount(0);
    await expect(disk.locator("[data-current-farey-triangle]")).toHaveAttribute(
      "stroke",
      "none",
    );
    for (const pane of [diskPane, h2Pane])
      await pane.getByLabel("Farey edges", { exact: true }).check();
    await expect.poll(pixels).toBeGreaterThan(0);
    await page.screenshot({
      path: `test-results/${info.project.name}-${diskSide}-farey-edge-colors.png`,
      fullPage: true,
    });
    await page
      .getByRole("combobox", {
        name: `${diskSide === "Left" ? "Right" : "Left"} representation`,
        exact: true,
      })
      .selectOption("triangulation");
    await expect(disk.locator("[data-highlighted-farey-edge]")).toHaveCount(0);
    await expect(disk.locator("[data-disk-edge]")).toHaveCount(3);
    await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  });
}
