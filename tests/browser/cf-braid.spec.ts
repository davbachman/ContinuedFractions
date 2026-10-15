import { test, expect, type Page } from "@playwright/test";
const pane = (page: Page, side: string) =>
  page.getByRole("region", { name: `${side} representation`, exact: true });
const number = async (page: Page, value: string) => {
  await page.getByLabel("ENDPOINT α").fill(value);
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
};
const braid = (page: Page) =>
  page.getByRole("group", {
    name: "Continued-fraction four-plat diagram",
    exact: true,
  });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?left=symbolic&right=braid");
});

test("vertical CF boxes select and edit the shared coefficient, with undo and responsive layouts", async ({
  page,
}, info) => {
  const right = pane(page, "Right"),
    left = pane(page, "Left");
  await expect(braid(page)).toHaveAttribute("data-fraction", "5/13");
  await expect(braid(page).locator("[data-braid-coefficient]")).toHaveCount(5);
  expect(
    await braid(page)
      .locator("[data-twist-pair]")
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-twist-pair")),
      ),
  ).toEqual(["1–2", "2–3", "1–2", "2–3", "1–2"]);
  await expect(braid(page).locator("[data-plat-cap]")).toHaveCount(4);
  await right
    .getByRole("button", {
      name: "Select braid coefficient a2 = 1",
      exact: true,
    })
    .click();
  await expect(
    left.getByRole("button", {
      name: "Select coefficient a2 = 1",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await right.getByLabel("Braid coefficient a2", { exact: true }).fill("3");
  await right
    .getByRole("button", { name: "Apply braid coefficient", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("11/25");
  await expect(braid(page)).toHaveAttribute("data-fraction", "11/25");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(braid(page)).toHaveAttribute("data-fraction", "5/13");
  await left
    .getByRole("button", { name: "Select coefficient a3 = 1", exact: true })
    .click();
  await expect(
    braid(page).locator('[data-braid-coefficient="3"]'),
  ).toHaveAttribute("data-selected", "true");
  await right
    .getByRole("button", {
      name: "Select braid coefficient a1 = 2",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    right.getByLabel("Braid coefficient a1", { exact: true }),
  ).toHaveValue("2");
  await right
    .locator(".cf-braid-panel")
    .screenshot({ path: `test-results/${info.project.name}-cf-braid.png` });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.reload();
  await expect(pane(page, "Right")).toHaveAttribute(
    "data-representation",
    "braid",
  );
  await expect(braid(page)).toHaveAttribute("data-fraction", "5/13");
});

test("split endings keep coefficient identity and rectangle playback highlights the braid", async ({
  page,
}) => {
  await number(page, "13/5");
  const right = pane(page, "Right");
  await expect(right.getByTestId("braid-ending")).toContainText(
    "Both final boxes belong to a3",
  );
  await right
    .getByRole("button", {
      name: "Select braid coefficient a3 = 2 (split ending)",
      exact: true,
    })
    .last()
    .click();
  await expect(braid(page).locator('[data-selected="true"]')).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("rectangle");
  await pane(page, "Left")
    .getByRole("button", { name: "Restart dissection", exact: true })
    .click();
  await expect(
    braid(page).locator('[data-braid-coefficient="0"]'),
  ).toHaveAttribute("data-selected", "true");
  await pane(page, "Left")
    .getByRole("button", { name: "Next stage", exact: true })
    .click();
  await expect(
    braid(page).locator('[data-braid-coefficient="1"]'),
  ).toHaveAttribute("data-selected", "true");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("13/5");
});

test("irrationals explicitly use the selected convergent, and conversion, edits and undo remain shared", async ({
  page,
}) => {
  await number(page, "phi");
  const right = pane(page, "Right");
  await expect(right.getByText(/Finite rational approximation/)).toContainText(
    "does not represent the exact irrational",
  );
  await right.getByLabel("Braid convergent", { exact: true }).selectOption("4");
  await expect(braid(page)).toHaveAttribute("data-fraction", "8/5");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await right
    .getByRole("button", { name: "Use braid convergent as α", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("8/5");
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await right.getByLabel("Braid coefficient a1", { exact: true }).fill("3");
  await right
    .getByRole("button", { name: "Apply braid coefficient", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).not.toHaveValue("φ");
  await expect(right.getByText(/Finite rational approximation/)).toBeVisible();
  await page
    .getByRole("button", { name: "Undo number edit", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
});

test("zero, infinity, negative and large inputs have honest topology and bounded rendering", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [value, components, name] of [
    ["0", "2", "unlink"],
    ["infinity", "1", "Unknot"],
    ["3", "1", "Right-handed trefoil"],
    ["-3", "1", "Left-handed trefoil"],
    ["5/2", "1", "Figure-eight"],
    ["2", "2", "Hopf"],
  ]) {
    await number(page, value);
    await expect(braid(page)).toHaveAttribute("data-components", components);
    await expect(pane(page, "Right").locator(".braid-closure")).toContainText(
      name,
    );
  }
  await number(page, "1/10000000000000000000000000000000000000003");
  await expect(pane(page, "Right").locator(".topology-limit")).toContainText(
    "Counts and connectivity stay exact",
  );
  expect(await braid(page).locator("path").count()).toBeLessThan(50);
  await page
    .getByRole("combobox", { name: "Left representation", exact: true })
    .selectOption("tangle");
  await expect(pane(page, "Left")).toContainText(
    "1/10000000000000000000000000000000000000003",
  );
  await page.setViewportSize({
    width: info.project.name === "mobile" ? 412 : 1100,
    height: 950,
  });
  await expect(braid(page)).toHaveAttribute(
    "data-fraction",
    "1/10000000000000000000000000000000000000003",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
