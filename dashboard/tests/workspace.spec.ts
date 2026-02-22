import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const open = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Exposure over time" }),
  ).toBeVisible();
};

test("region filters reconcile the portfolio and period controls respond", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByText("$925.41M").first()).toBeVisible();
  await page.getByRole("button", { name: "1M", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "1M", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Portfolio region").selectOption("APAC");
  await expect(page.getByText("8 counterparties in scope")).toBeVisible();
  await expect(page.getByText("$925.41M")).toHaveCount(0);
  await page.getByRole("button", { name: /Counterparties/ }).click();
  await expect(
    page.getByRole("heading", { name: /Counterparty portfolio/ }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await page.getByLabel("Search counterparties").fill("no such counterparty");
  await expect(
    page.getByText("No counterparties match these filters.", { exact: false }),
  ).toBeVisible();
});

test("review notes persist and dialogs support Escape", async ({ page }) => {
  await open(page);
  await page
    .getByRole("button", { name: "Review Alder Capital", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Counterparty review" });
  await expect(dialog).toBeVisible();
  await page
    .getByLabel("Analyst note")
    .fill("Review collateral coverage with the credit team.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Note saved on this device.",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Review Alder Capital", exact: true })
    .click();
  await expect(page.getByLabel("Analyst note")).toHaveValue(
    "Review collateral coverage with the credit team.",
  );
});

test("status filters and sorting produce the expected counterparties", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: /Counterparties/ }).click();
  await page.getByLabel("Filter counterparty status").selectOption("Breach");
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await page.getByRole("button", { name: "Counterparty", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Alder Capital");
  await page.getByLabel("Filter counterparty status").selectOption("Watch");
  await expect(page.locator("tbody tr")).toHaveCount(4);
});

test("scenario inputs recompute portfolio impact and invalidate old results", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Stress testing", exact: true })
    .click();
  await page.getByRole("button", { name: /Severe downturn/ }).click();
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  await expect(page.getByText(/change in expected loss/)).toBeVisible();
  await expect(page.locator(".comparison-row")).toHaveCount(5);
  await expect(
    page.locator(".comparison-row").first().locator("b").last(),
  ).not.toHaveText("$925.41M");
  await page.getByLabel("Market stress factor").fill("25");
  await expect(page.getByText("Compare scenario results")).toBeVisible();
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Custom scenario", exact: true }),
  ).toBeVisible();
});

test("model page reports the fitted scorecard and changes variable diagnostics", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Model validation", exact: true })
    .click();
  await expect(page.getByText("0.783", { exact: true })).toBeVisible();
  await expect(page.getByText(/1,680 training observations/)).toBeVisible();
  await page
    .getByRole("button", { name: /Interest coverage.*populated bins/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Interest coverage", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(7);
});

test("CSV download carries selected scope and provenance", async ({ page }) => {
  await open(page);
  await page.getByLabel("Portfolio region").selectOption("EMEA");
  await expect(page.getByText("8 counterparties in scope")).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export portfolio" }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain("Synthetic demonstration");
  expect(csv).toContain("EMEA");
  expect(csv).not.toContain("APAC");
  expect(csv.trim().split("\n")).toHaveLength(9);
});

test("API error is visible and retry recovers", async ({ page }) => {
  await page.route("**/api/portfolio?**", (route) =>
    route.fulfill({ status: 503, body: "{}" }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Portfolio unavailable" }),
  ).toBeVisible();
  await page.unroute("**/api/portfolio?**");
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(
    page.getByRole("heading", { name: "Exposure over time" }),
  ).toBeVisible();
});

test("keyboard entry and methodology dialog are accessible", async ({
  page,
}) => {
  await open(page);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "About this workspace" }).click();
  await expect(
    page.getByRole("dialog", { name: "Methodology and assumptions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close methodology" }),
  ).toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "About this workspace" }),
  ).toBeFocused();
});

for (const width of [320, 768, 1280, 1920]) {
  test(`responsive layout and accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({
      path: `../tmp/screenshots/overview-${width}.png`,
      fullPage: true,
    });
    if (width === 320) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("button", { name: "Stress testing", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Stress testing." }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    expect(errors).toEqual([]);
  });
}

for (const view of [
  "Exposures",
  "Counterparties",
  "Stress testing",
  "Model validation",
]) {
  test(`mobile ${view} view is accessible and has no page overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.goto("/#" + encodeURIComponent(view));
    await page.locator(".view-content").waitFor();
    if (view === "Model validation")
      await expect(page.getByText("0.783", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
