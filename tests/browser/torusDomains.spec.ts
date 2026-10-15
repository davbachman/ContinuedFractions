import { test, expect } from "@playwright/test";
import { torusDomainColor } from "../../src/renderers/torusDomains";

test("H² domain fills match both torus models and the selected cover lift", async ({
  page,
}, info) => {
  await page.goto("/?layout=atlas");
  const plane = page.getByRole("img", { name: /Upper half-plane/ });
  const pixel = () =>
    plane.evaluate((node) => {
      const canvas = node as HTMLCanvasElement;
      const scale = Number(canvas.dataset.scale),
        ratio = canvas.width / canvas.clientWidth;
      const x = Number(canvas.dataset.alphaX) + (0.23 - 5 / 13) * scale;
      const y = canvas.clientHeight - 32 - 1.43 * scale;
      return Array.from(
        canvas
          .getContext("2d")!
          .getImageData(Math.round(x * ratio), Math.round(y * ratio), 1, 1)
          .data,
      );
    });
  const showPlane = async () => {
    if (info.project.name === "mobile")
      await page
        .getByRole("button", { name: "01 Upper half-plane", exact: true })
        .click();
  };
  const showQuotient = async () => {
    if (info.project.name === "mobile")
      await page
        .getByRole("button", { name: "02 Modular quotient", exact: true })
        .click();
  };
  await expect(plane).toHaveAttribute("data-torus-domain-count", "0");
  await showQuotient();
  await page
    .getByRole("button", { name: "Punctured torus", exact: true })
    .click();
  await showPlane();
  await expect(plane).toHaveAttribute("data-torus-lift", "0");
  expect(
    Number(await plane.getAttribute("data-torus-domain-count")),
  ).toBeGreaterThan(20);
  const original = await pixel();
  const expected = torusDomainColor(0)
    .slice(1)
    .match(/../g)!
    .map((s) => parseInt(s, 16));
  original
    .slice(0, 3)
    .forEach((v, i) => expect(Math.abs(v - expected[i])).toBeLessThan(4));
  expect(original[3]).toBeCloseTo(46, 0);
  await page
    .getByRole("checkbox", { name: "Modular domains", exact: true })
    .check();
  await plane.screenshot({
    path: `test-results/${info.project.name}-torus-domain-fills.png`,
  });
  await showQuotient();
  await page.getByRole("button", { name: "Torus 3D", exact: true }).click();
  await showPlane();
  expect(await pixel()).toEqual(original);
  await showQuotient();
  await page.getByLabel("Cover lift", { exact: true }).selectOption("2");
  await showPlane();
  await expect(plane).toHaveAttribute("data-torus-lift", "2");
  const shifted = await pixel();
  const shiftedColor = torusDomainColor(2)
    .slice(1)
    .match(/../g)!
    .map((s) => parseInt(s, 16));
  shifted
    .slice(0, 3)
    .forEach((v, i) => expect(Math.abs(v - shiftedColor[i])).toBeLessThan(4));
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(
    page.getByRole("slider", { name: "Scrub trajectory" }),
  ).toHaveValue("0");
  await expect(
    page.getByRole("button", { name: "Undo number edit" }),
  ).toBeDisabled();
  await showQuotient();
  await page
    .getByRole("button", { name: "Modular orbifold", exact: true })
    .click();
  await showPlane();
  await expect(plane).toHaveAttribute("data-torus-domain-count", "0");
  expect((await pixel())[3]).toBe(0);
});
