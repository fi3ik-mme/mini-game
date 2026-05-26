// @ts-check
const { test, expect } = require("@playwright/test");

const URL = "http://localhost:3456/games/first-million/";

test("fresh wallet shows 0 ₴ and empty basket", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    await expect(page.locator("#wallet-amount")).toHaveText("0 ₴");
    await expect(page.locator("#basket-count")).toHaveText("0 🍋");
});

test("wallet renders pre-seeded hryvnias and basket sums millions across subjects", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem("fm.wallet", JSON.stringify({ hryvnias: 1234500 }));
        localStorage.setItem("fm.subjectStats", JSON.stringify({
            matematyka: { played: 5, won: 3, millions: 3, lastPlayed: Date.now() },
            memolohiya: { played: 2, won: 1, millions: 1, lastPlayed: Date.now() }
        }));
    });
    await page.reload();
    await page.waitForSelector(".subject-btn");

    await expect(page.locator("#wallet-amount")).toContainText("1");
    await expect(page.locator("#wallet-amount")).toContainText("234");
    await expect(page.locator("#wallet-amount")).toContainText("500");
    await expect(page.locator("#wallet-amount")).toContainText("₴");
    await expect(page.locator("#basket-count")).toHaveText("4 🍋");
});

test("losing on first question with no guarantee adds 0 ₴ and hides earned block", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    await page.locator(".subject-btn").first().click();
    await page.waitForSelector(".answer-btn");

    const wrongIndex = await page.evaluate(() => {
        const correct = questions[currentIndex].correct;
        return correct === 0 ? 1 : 0;
    });
    await page.locator(".answer-btn").nth(wrongIndex).click();

    const continueBtn = page.locator("#modal-continue");
    if (await continueBtn.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false)) {
        await continueBtn.click();
    }

    await page.locator("#result-screen.active").waitFor({ timeout: 5000 });
    await expect(page.locator("#earned-block")).toBeHidden();

    const wallet = await page.evaluate(() => JSON.parse(localStorage.getItem("fm.wallet") || "{}"));
    expect(wallet.hryvnias || 0).toBe(0);
});

test("winning the million adds 1 000 000 ₴ and a lemon to the basket", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    // Click any subject to start.
    await page.locator(".subject-btn").first().click();
    await page.waitForSelector(".answer-btn");

    // Force a win by calling the public endGame() helper directly with kind="win".
    const subjectId = await page.evaluate(() => {
        endGame("win", 1000000);
        return currentSubjectId;
    });

    await page.locator("#result-screen.active").waitFor({ timeout: 5000 });
    await expect(page.locator("#earned-block")).toBeVisible();
    await expect(page.locator("#earned-amount")).toHaveText("1 000 000");
    await expect(page.locator("#earned-lemon")).toBeVisible();

    const state = await page.evaluate((id) => ({
        wallet: JSON.parse(localStorage.getItem("fm.wallet") || "{}"),
        stats: JSON.parse(localStorage.getItem("fm.subjectStats") || "{}")[id] || {}
    }), subjectId);
    expect(state.wallet.hryvnias).toBe(1000000);
    expect(state.stats.millions).toBe(1);

    // Back on the subject screen, wallet bar reflects the new totals.
    await page.locator("#play-again").click();
    await page.locator("#subject-screen.active").waitFor({ timeout: 5000 });
    await expect(page.locator("#wallet-amount")).toContainText("1");
    await expect(page.locator("#wallet-amount")).toContainText("000");
    await expect(page.locator("#basket-count")).toHaveText("1 🍋");
});
