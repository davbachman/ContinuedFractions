import { expect, type Locator, type Page } from "@playwright/test";

export async function dragSurface(
  page: Page,
  surface: Locator,
  touch: boolean,
) {
  await surface.scrollIntoViewIfNeeded();
  const before = await surface.getAttribute("data-rotation");
  const pathBefore = await surface
    .locator("path:not(defs *)")
    .first()
    .getAttribute("d");
  const box = (await surface.boundingBox())!;
  const width = Math.min(box.width, page.viewportSize()!.width - box.x - 10);
  const x = box.x + width * 0.3,
    y = box.y + box.height * 0.5;
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 5; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + width * 0.06 * i, y }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + width * 0.3, y, { steps: 5 });
    await page.mouse.up();
  }
  await expect(surface).not.toHaveAttribute("data-rotation", before!);
  await expect(surface.locator("path:not(defs *)").first()).not.toHaveAttribute(
    "d",
    pathBefore!,
  );
  const angle = Number(await surface.getAttribute("data-rotation"));
  const delta = Math.atan2(
    Math.sin(angle - Number(before)),
    Math.cos(angle - Number(before)),
  );
  expect(delta).toBeCloseTo((-width * 0.3 * 2 * Math.PI) / box.width, 2);
  const rollBefore = Number(await surface.getAttribute("data-roll"));
  const turnedPath = await surface
    .locator("path:not(defs *)")
    .first()
    .getAttribute("d");
  const scrollBefore = await page.evaluate(() => scrollY);
  const dy = Math.min(45, box.height * 0.15);
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 5; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y + (dy * i) / 5 }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + dy, { steps: 5 });
    await page.mouse.up();
  }
  await expect(surface).not.toHaveAttribute("data-roll", String(rollBefore));
  expect(Number(await surface.getAttribute("data-roll"))).toBeCloseTo(
    rollBefore - (dy * 2 * Math.PI) / box.height,
    2,
  );
  await expect(surface).toHaveAttribute("data-rotation", String(angle));
  await expect(surface.locator("path:not(defs *)").first()).not.toHaveAttribute(
    "d",
    turnedPath!,
  );
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  return String(angle);
}
