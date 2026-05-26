// @ts-check
const { test, expect } = require("@playwright/test");

const URL = "http://localhost:3456/games/first-million/";

async function seedRichProgress(page) {
    await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem("fm.wallet", JSON.stringify({ hryvnias: 1234500 }));
        localStorage.setItem("fm.cheats", JSON.stringify({ unlockAll: true }));
        localStorage.setItem("fm.subjectStats", JSON.stringify({
            matematyka: { played: 5, won: 3, millions: 3, lastPlayed: Date.now() },
            steam:      { played: 2, won: 1, millions: 1, lastPlayed: Date.now() }
        }));
    });
    await page.reload();
    await page.waitForSelector(".subject-btn");
}

test("reset button is visible at the bottom of the subject screen", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    const btn = page.locator("#reset-progress-btn");
    await expect(btn).toBeVisible();
    await expect(btn).toContainText("Очистити прогрес");
});

test("opening reset modal shows exact hryvnias and lemons that will be lost", async ({ page }) => {
    await page.goto(URL);
    await seedRichProgress(page);

    await page.locator("#reset-progress-btn").click();
    await expect(page.locator("#reset-modal.active")).toBeVisible();
    await expect(page.locator("#reset-title")).toContainText("Очистити");
    await expect(page.locator(".reset-warning")).toContainText("Перший мільйон");
    // 1 234 500 ₴
    await expect(page.locator("#reset-loss-hryvnias")).toContainText("1");
    await expect(page.locator("#reset-loss-hryvnias")).toContainText("234");
    await expect(page.locator("#reset-loss-hryvnias")).toContainText("500");
    await expect(page.locator("#reset-loss-hryvnias")).toContainText("₴");
    // 4 lemons total (3 + 1)
    await expect(page.locator("#reset-loss-lemons")).toHaveText("4");
});

test("Cancel keeps progress untouched", async ({ page }) => {
    await page.goto(URL);
    await seedRichProgress(page);

    await page.locator("#reset-progress-btn").click();
    await page.locator("#reset-cancel").click();

    await expect(page.locator("#reset-modal.active")).toHaveCount(0);

    const state = await page.evaluate(() => ({
        wallet: localStorage.getItem("fm.wallet"),
        stats: localStorage.getItem("fm.subjectStats"),
        cheats: localStorage.getItem("fm.cheats")
    }));
    expect(state.wallet).toBeTruthy();
    expect(state.stats).toBeTruthy();
    expect(state.cheats).toBeTruthy();

    // Wallet bar still shows the seeded values.
    await expect(page.locator("#wallet-amount")).toContainText("234");
    await expect(page.locator("#basket-count")).toHaveText("4 🍋");
});

test("clicking outside the modal closes it without resetting", async ({ page }) => {
    await page.goto(URL);
    await seedRichProgress(page);

    await page.locator("#reset-progress-btn").click();
    await expect(page.locator("#reset-modal.active")).toBeVisible();

    // Click on the backdrop (outside the .modal box).
    await page.locator("#reset-modal").click({ position: { x: 5, y: 5 } });
    await expect(page.locator("#reset-modal.active")).toHaveCount(0);

    const wallet = await page.evaluate(() => JSON.parse(localStorage.getItem("fm.wallet") || "{}"));
    expect(wallet.hryvnias).toBe(1234500);
});

test("Confirm wipes wallet, lemons, stats, cheats and re-renders UI", async ({ page }) => {
    await page.goto(URL);
    await seedRichProgress(page);

    // Pre-condition: cheat unlocks made every subject playable.
    await expect(page.locator(".subject-btn.locked")).toHaveCount(0);

    await page.locator("#reset-progress-btn").click();
    await page.locator("#reset-confirm").click();

    await expect(page.locator("#reset-modal.active")).toHaveCount(0);

    // localStorage is wiped (only progress keys; preferences may remain).
    const state = await page.evaluate(() => ({
        wallet: localStorage.getItem("fm.wallet"),
        stats: localStorage.getItem("fm.subjectStats"),
        cheats: localStorage.getItem("fm.cheats")
    }));
    expect(state.wallet).toBeNull();
    expect(state.stats).toBeNull();
    expect(state.cheats).toBeNull();

    // Wallet + basket reflect zero.
    await expect(page.locator("#wallet-amount")).toHaveText("0 ₴");
    await expect(page.locator("#basket-count")).toHaveText("0 🍋");

    // Tier 1+ subjects are locked again now that the cheat is gone.
    await expect(page.locator(".subject-btn.locked").filter({ hasText: "Англійська" })).toHaveCount(1);
    await expect(page.locator(".subject-btn.locked").filter({ hasText: "Мемологія" })).toHaveCount(1);

    // "Ще не пробував" badges are back on every subject.
    const fresh = await page.locator(".subject-btn .stat-fresh").count();
    expect(fresh).toBeGreaterThan(0);
});
