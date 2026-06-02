// @ts-check
const { test, expect } = require("@playwright/test");

const URL = "http://localhost:3456/games/geo-quest/";

test("cheat modal auto-closes after activating a code", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector("#cheats-toggle", { timeout: 15000 });

    await page.locator("#cheats-toggle").click();
    await page.locator("#cheat-input").fill("кнопка далі");
    await page.locator("#cheat-submit").click();

    await expect(page.locator("#cheat-msg.ok")).toBeVisible();
    await expect(page.locator("#modal-cheats.active")).toBeVisible();
    await expect(page.locator("#modal-cheats.active")).toHaveCount(0, { timeout: 5000 });
});

test("already-activated code keeps modal open", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector("#cheats-toggle", { timeout: 15000 });

    await page.locator("#cheats-toggle").click();
    await page.locator("#cheat-input").fill("кнопка далі");
    await page.locator("#cheat-submit").click();
    await expect(page.locator("#modal-cheats.active")).toHaveCount(0, { timeout: 5000 });

    await page.locator("#cheats-toggle").click();
    await page.locator("#cheat-input").fill("кнопка далі");
    await page.locator("#cheat-submit").click();
    await expect(page.locator("#cheat-msg.ok")).toContainText("уже активовано");
    await page.waitForTimeout(3500);
    await expect(page.locator("#modal-cheats.active")).toBeVisible();
});
