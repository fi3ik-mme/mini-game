// @ts-check
const { test, expect } = require("@playwright/test");

const URL = "http://localhost:3456/games/first-million/";

test("fresh state: each subject shows 'Ще не пробував'", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    const freshLabels = await page.locator(".subject-btn .stat-fresh").allTextContents();
    expect(freshLabels.length).toBeGreaterThan(0);
    freshLabels.forEach(t => expect(t.trim()).toBe("Ще не пробував"));

    // No play / million badges yet
    expect(await page.locator(".subject-btn .stat-millions").count()).toBe(0);
});

test("starting a subject bumps its played counter", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    await page.locator(".subject-btn").first().click();
    await page.waitForSelector(".answer-btn");

    // Force-pick a wrong answer to end the game quickly.
    const wrongIndex = await page.evaluate(() => {
        const correct = questions[currentIndex].correct;
        return correct === 0 ? 1 : 0;
    });
    await page.locator(".answer-btn").nth(wrongIndex).click();

    // Dismiss the explanation modal if it appears, then click Play again.
    const continueBtn = page.locator("#modal-continue");
    if (await continueBtn.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false)) {
        await continueBtn.click();
    }
    await page.locator("#play-again").click();

    await page.locator("#subject-screen.active").waitFor({ timeout: 5000 });
    await page.waitForSelector(".subject-btn");
    const firstBtn = page.locator(".subject-btn").first();
    const text = await firstBtn.textContent();
    expect(text).toMatch(/🎯\s*1\s+раз/);
    expect(await firstBtn.locator(".stat-millions").count()).toBe(0);
});

test("recording a million shows 🍋 × N", async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => {
        localStorage.clear();
        // Seed via the public stats API the page exposes (we test the rendered output)
        localStorage.setItem("fm.subjectStats", JSON.stringify({
            matematyka: { played: 7, won: 2, millions: 2, lastPlayed: Date.now() }
        }));
    });
    await page.reload();
    await page.waitForSelector(".subject-btn");

    // Find the Math subject and check its badges.
    const mathBtn = page.locator(".subject-btn", { hasText: "Математика" });
    await expect(mathBtn).toBeVisible();
    const text = await mathBtn.textContent();
    expect(text).toMatch(/🎯\s+7\s+разів/);
    expect(text).toMatch(/🍋\s*×\s*2/);
});
