import { test, expect, type Page } from "@playwright/test";
const pane = (page: Page, side = "Left") =>
  page.getByRole("region", { name: `${side} representation`, exact: true });
const choose = (page: Page, kind: string, side = "Left") =>
  page
    .getByRole("combobox", { name: `${side} representation`, exact: true })
    .selectOption(kind);
const number = async (page: Page, value: string) => {
  await page.getByLabel("ENDPOINT α").fill(value);
  await page
    .getByRole("button", { name: "Apply endpoint", exact: true })
    .click();
};
const prefix = (page: Page, index: number, side = "Left") =>
  pane(page, side)
    .getByRole("slider", { name: "Selected prefix", exact: true })
    .fill(String(index));
test.beforeEach(async ({ page }) => {
  await page.goto("/?left=matrices&right=matrices");
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("matrix selections share coefficient editing and undo", async ({
  page,
}) => {
  await prefix(page, 1);
  await expect(
    pane(page, "Right").getByRole("slider", { name: "Selected prefix" }),
  ).toHaveValue("1");
  await page.locator(".strip-edit summary").click();
  await page.getByLabel("Shared coefficient value").fill("3");
  await page
    .locator(".strip-edit")
    .getByRole("button", { name: "Apply coefficient" })
    .click();
  await expect(pane(page).getByTestId("matrix-details")).toContainText(
    "(1, 3)",
  );
  await expect(page.getByLabel("ENDPOINT α")).not.toHaveValue("5/13");
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  await expect(pane(page).getByTestId("matrix-details")).toContainText(
    "(1, 2)",
  );
});

test("matrix columns track selections in both panes", async ({
  page,
}, info) => {
  await choose(page, "matrices");
  await choose(page, "matrices", "Right");
  await number(page, "13/5");
  await pane(page)
    .getByRole("button", { name: "Select matrix factor a3", exact: true })
    .click();
  await expect(pane(page).getByTestId("matrix-details")).toContainText(
    "(13, 5)",
  );
  await expect(pane(page).getByTestId("matrix-details")).toContainText(
    "(5, 2)",
  );
  await expect(pane(page, "Right").getByTestId("matrix-details")).toContainText(
    "(13, 5)",
  );
  await pane(page, "Right")
    .getByRole("button", { name: "Select matrix factor a2", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    pane(page).getByRole("slider", { name: "Selected prefix" }),
  ).toHaveValue("2");
  await expect(pane(page).getByTestId("matrix-details")).toContainText("= -1");
  await page.locator(".comparison-grid").screenshot({
    path: `test-results/${info.project.name}-matrices.png`,
  });
});

test("deep irrational prefixes remain exact and can be explicitly applied and undone", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await choose(page, "matrices", "Right");
  await page.getByRole("button", { name: "φ", exact: true }).click();
  const extend = pane(page).getByRole("button", {
    name: "Extend prefixes",
    exact: true,
  });
  const before = Number(
    await pane(page)
      .getByRole("slider", { name: "Selected prefix" })
      .getAttribute("max"),
  );
  await extend.click();
  await expect(
    pane(page).getByRole("slider", { name: "Selected prefix" }),
  ).toHaveAttribute("max", String(before + 8));
  for (let i = 0; i < 12 && (await extend.isEnabled()); i++)
    await extend.click();
  await expect(extend).toBeDisabled();
  await prefix(page, 95);
  await expect(
    pane(page).getByText(/96 prefixes displayed; infinite expansion continues/),
  ).toBeVisible();
  const firstConvergent = await pane(page, "Right")
    .locator(".prefix-selection > strong")
    .textContent();
  await expect(
    pane(page, "Right").getByRole("slider", { name: "Selected prefix" }),
  ).toHaveValue("95");
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await page.locator(".comparison-grid").screenshot({
    path: `test-results/${info.project.name}-deep-matrices.png`,
  });
  await pane(page)
    .getByRole("button", { name: "Use convergent as target", exact: true })
    .click();
  await expect(page.getByLabel("ENDPOINT α")).not.toHaveValue("φ");
  await expect(
    pane(page, "Right").locator(".prefix-selection > strong"),
  ).toHaveText(firstConvergent!);
  await page.getByRole("button", { name: "Undo number edit" }).click();
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("φ");
  await prefix(page, 95);
  await expect(
    pane(page, "Right").locator(".prefix-selection > strong"),
  ).toHaveText(firstConvergent!);
  expect(errors).toEqual([]);
});

test("matrix views handle integers, negatives, zero, infinity, and keyboard navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const kind of ["matrices"]) {
    await choose(page, kind);
    await choose(page, kind, "Right");
    for (const value of ["0", "-13/5", "3", "1/2", "sqrt2", "infinity"]) {
      await number(page, value);
      if (value === "infinity")
        await expect(pane(page).locator(".view-unavailable")).toBeVisible();
      else
        await expect(
          pane(page).getByRole("slider", { name: "Selected prefix" }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      expect(
        await page
          .locator("[id]")
          .evaluateAll(
            (nodes) => new Set(nodes.map((n) => n.id)).size === nodes.length,
          ),
      ).toBe(true);
    }
  }
  await number(page, "5/13");
  await page.getByRole("button", { name: "Swap sides ⇄" }).click();
  await prefix(page, 0);
  await pane(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    pane(page, "Right").getByRole("slider", { name: "Selected prefix" }),
  ).toHaveValue("1");
  await page.setViewportSize({ width: 480, height: 800 });
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
  expect(errors).toEqual([]);
});

test("prefix selection links Farey runs without changing time and persists view choices", async ({
  page,
}) => {
  await choose(page, "orbifold", "Right");
  await prefix(page, 2);
  await expect(
    pane(page, "Right").locator('[data-selected-run="2"]').first(),
  ).toBeVisible();
  await expect(
    pane(page, "Right").getByRole("slider", { name: "Scrub trajectory" }),
  ).toHaveValue("0");
  await expect(
    page.getByRole("status", { name: "Connection between views" }),
  ).toContainText("Prefix depth is not hyperbolic time");
  await page.reload();
  await expect(pane(page)).toHaveAttribute("data-representation", "matrices");
  await expect(pane(page, "Right")).toHaveAttribute(
    "data-representation",
    "orbifold",
  );
  await expect(page.getByLabel("ENDPOINT α")).toHaveValue("5/13");
});

test("large coefficients keep exact data without invalid SVG geometry or page overflow", async ({
  page,
}) => {
  await number(page, `1/${"1" + "0".repeat(60)}`);
  await prefix(page, 1);
  for (const kind of ["matrices"]) {
    await choose(page, kind);
    await expect(pane(page).locator(".prefix-selection > strong")).toHaveText(
      `1/${"1" + "0".repeat(60)}`,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(
      await pane(page)
        .locator("svg *")
        .evaluateAll((nodes) =>
          nodes.every((n) =>
            ["d", "points", "x", "y", "cx", "cy", "x1", "x2", "y1", "y2"].every(
              (a) => !/NaN|Infinity/.test(n.getAttribute(a) ?? ""),
            ),
          ),
        ),
    ).toBe(true);
  }
});
