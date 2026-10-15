import { expect, type Locator, type Page } from "@playwright/test";

export async function dragSurface(
  page: Page,
  surface: Locator,
  touch: boolean,
) {
  await surface.scrollIntoViewIfNeeded();
  const before = await surface.getAttribute("data-rotation");
  const pathBefore = await surface.locator("path").first().getAttribute("d");
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
  await expect(surface.locator("path").first()).not.toHaveAttribute(
    "d",
    pathBefore!,
  );
  return (await surface.getAttribute("data-rotation"))!;
}
