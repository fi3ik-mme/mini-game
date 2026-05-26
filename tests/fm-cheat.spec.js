// @ts-check
const { test, expect } = require("@playwright/test");

const URL = "http://localhost:3456/games/first-million/";

test("cheat button is visible in the top-bar", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    await expect(page.locator("#cheat-toggle")).toBeVisible();
});

test("opening the cheat modal focuses the input and shows hint", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    await page.locator("#cheat-toggle").click();
    await expect(page.locator("#cheat-modal.active")).toBeVisible();
    await expect(page.locator("#cheat-input")).toBeFocused({ timeout: 2000 });
    await expect(page.locator(".cheat-hint")).toContainText("секретне слово");
    await expect(page.locator("#cheat-title")).toContainText("Чіткод");
});

test("wrong code shows an error and keeps subjects locked", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    await page.locator("#cheat-toggle").click();
    await page.locator("#cheat-input").fill("invalid code");
    await page.locator("#cheat-submit").click();

    await expect(page.locator("#cheat-feedback.error")).toBeVisible();
    await expect(page.locator("#cheat-input")).toHaveClass(/error/);

    // Modal still open, subjects still locked.
    await expect(page.locator("#cheat-modal.active")).toBeVisible();
    const cheats = await page.evaluate(() => JSON.parse(localStorage.getItem("fm.cheats") || "{}"));
    expect(cheats.unlockAll).toBeFalsy();
});

test("'відкрий всі' unlocks every locked tier and persists across reloads", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    // Sanity: tier-1+ subjects are locked before the cheat.
    const meme = page.locator(".subject-btn", { hasText: "Мемологія" }).first();
    await expect(meme).toHaveClass(/locked/);

    await page.locator("#cheat-toggle").click();
    await page.locator("#cheat-input").fill("Відкрий Всі"); // mixed case + extra spaces tolerated
    await page.locator("#cheat-submit").click();

    await expect(page.locator("#cheat-feedback.success")).toBeVisible();

    // Subject list is re-rendered live — no locked subjects anymore.
    await expect(page.locator(".subject-btn.locked")).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator(".subject-btn .lock-icon")).toHaveCount(0);

    const cheats = await page.evaluate(() => JSON.parse(localStorage.getItem("fm.cheats") || "{}"));
    expect(cheats.unlockAll).toBe(true);

    // Persist after reload.
    await page.reload();
    await page.waitForSelector(".subject-btn");
    await expect(page.locator(".subject-btn.locked")).toHaveCount(0);
});

test("Enter submits the code; Escape closes the modal", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    await page.locator("#cheat-toggle").click();
    const input = page.locator("#cheat-input");
    await input.fill("відкрий всі");
    await input.press("Enter");
    await expect(page.locator("#cheat-feedback.success")).toBeVisible();

    // Reset cheats and re-open to test Escape.
    await page.evaluate(() => localStorage.removeItem("fm.cheats"));
    await page.reload();
    await page.waitForSelector(".subject-btn");
    await page.locator("#cheat-toggle").click();
    await expect(page.locator("#cheat-modal.active")).toBeVisible();
    await page.locator("#cheat-input").press("Escape");
    await expect(page.locator("#cheat-modal.active")).toHaveCount(0);
});
