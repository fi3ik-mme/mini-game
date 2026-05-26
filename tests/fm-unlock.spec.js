// @ts-check
const { test, expect } = require("@playwright/test");

const URL = "http://localhost:3456/games/first-million/";

const FREE_SUBJECTS = ["Математика", "Українська мова", "Я досліджую світ"];
const ONE_LEMON_SUBJECTS = ["Англійська мова", "Іспанська мова", "Інформатика"];
const THREE_LEMON_SUBJECTS = ["Мистецтво", "STEAM"];
const ALL_SUBJECTS_MEME = "Мемологія";

async function seed(page, stats) {
    await page.evaluate((s) => {
        localStorage.clear();
        if (s) localStorage.setItem("fm.subjectStats", JSON.stringify(s));
    }, stats || null);
    await page.reload();
    await page.waitForSelector(".subject-btn");
}

test("subjects render in ascending-difficulty order", async ({ page }) => {
    await page.goto(URL);
    await seed(page, null);

    const titles = await page.locator(".subject-btn strong").allTextContents();
    const trimmed = titles.map(t => t.replace(/[\s🍋🏆🔒]/g, "").trim());

    // Free tier first
    expect(trimmed.slice(0, 3).sort()).toEqual(["Математика", "Українськамова", "ЯдосліджуюсвітЄ".replace("Є", "")].sort().map(x => x));
    // 1-lemon tier next
    expect(trimmed.slice(3, 6).sort()).toEqual(["Англійськамова", "Іспанськамова", "Інформатика"].sort());
    // 3-lemon tier
    expect(trimmed.slice(6, 8).sort()).toEqual(["STEAM", "Мистецтво"].sort());
    // every-subject tier last
    expect(trimmed[8]).toBe("Мемологія");
});

test("fresh state: free unlocked, others locked with proper tier emoji", async ({ page }) => {
    await page.goto(URL);
    await seed(page, null);

    for (const t of FREE_SUBJECTS) {
        const btn = page.locator(".subject-btn", { hasText: t }).first();
        await expect(btn).not.toHaveClass(/locked/);
        // No tier badge in free titles
        await expect(btn.locator("strong")).not.toContainText("🍋");
        await expect(btn.locator("strong")).not.toContainText("🏆");
    }
    for (const t of ONE_LEMON_SUBJECTS) {
        const btn = page.locator(".subject-btn", { hasText: t }).first();
        await expect(btn).toHaveClass(/locked/);
        await expect(btn.locator("strong")).toContainText("🍋");
        await expect(btn.locator(".lock-icon")).toBeVisible();
    }
    for (const t of THREE_LEMON_SUBJECTS) {
        const btn = page.locator(".subject-btn", { hasText: t }).first();
        await expect(btn).toHaveClass(/locked/);
        // 3 lemons in title
        const titleText = await btn.locator("strong").textContent();
        const lemonCount = (titleText.match(/🍋/g) || []).length;
        expect(lemonCount).toBe(3);
    }
    const memeBtn = page.locator(".subject-btn", { hasText: ALL_SUBJECTS_MEME }).first();
    await expect(memeBtn).toHaveClass(/locked/);
    await expect(memeBtn.locator("strong")).toContainText("🏆");
});

test("clicking a locked subject opens the locked modal with progress, does NOT start a game", async ({ page }) => {
    await page.goto(URL);
    await seed(page, null);

    const btn = page.locator(".subject-btn", { hasText: "Англійська мова" }).first();
    await btn.click();

    await expect(page.locator("#locked-modal.active")).toBeVisible();
    await expect(page.locator("#locked-title")).toContainText("заблокована");
    await expect(page.locator("#locked-message")).toContainText("Англійська");
    await expect(page.locator("#locked-message")).toContainText("1");
    await expect(page.locator(".locked-progress-value")).toContainText("0 / 1");

    // Game should NOT have started.
    await expect(page.locator("#game-screen.active")).toHaveCount(0);

    await page.locator("#locked-close").click();
    await expect(page.locator("#locked-modal.active")).toHaveCount(0);
});

test("≥1 lemon unlocks tier-1 subjects but not tier-2", async ({ page }) => {
    await page.goto(URL);
    await seed(page, {
        matematyka: { played: 3, won: 1, millions: 1, lastPlayed: Date.now() }
    });

    for (const t of ONE_LEMON_SUBJECTS) {
        const btn = page.locator(".subject-btn", { hasText: t }).first();
        await expect(btn).not.toHaveClass(/locked/);
    }
    for (const t of THREE_LEMON_SUBJECTS) {
        const btn = page.locator(".subject-btn", { hasText: t }).first();
        await expect(btn).toHaveClass(/locked/);
    }
    const meme = page.locator(".subject-btn", { hasText: ALL_SUBJECTS_MEME }).first();
    await expect(meme).toHaveClass(/locked/);
});

test("≥3 lemons unlocks tier-2; Memology still locked", async ({ page }) => {
    await page.goto(URL);
    await seed(page, {
        matematyka: { played: 5, won: 3, millions: 3, lastPlayed: Date.now() }
    });

    for (const t of THREE_LEMON_SUBJECTS) {
        const btn = page.locator(".subject-btn", { hasText: t }).first();
        await expect(btn).not.toHaveClass(/locked/);
    }
    const meme = page.locator(".subject-btn", { hasText: ALL_SUBJECTS_MEME }).first();
    await expect(meme).toHaveClass(/locked/);
});

test("Memology unlock requires ≥1 lemon in every other subject", async ({ page }) => {
    await page.goto(URL);
    const stats = {};
    for (const id of [
        "matematyka", "ukrayinska-mova", "ya-doslidzhuyu-svit",
        "anhliyska-mova", "ispanska-mova", "informatyka",
        "mystetstvo", "steam"
    ]) {
        stats[id] = { played: 1, won: 1, millions: 1, lastPlayed: Date.now() };
    }
    await seed(page, stats);

    const meme = page.locator(".subject-btn", { hasText: ALL_SUBJECTS_MEME }).first();
    await expect(meme).not.toHaveClass(/locked/);
});

test("Memology lock modal shows checklist of all other subjects", async ({ page }) => {
    await page.goto(URL);
    await seed(page, {
        matematyka: { played: 2, won: 1, millions: 1, lastPlayed: Date.now() },
        steam:      { played: 1, won: 1, millions: 1, lastPlayed: Date.now() }
    });

    const meme = page.locator(".subject-btn", { hasText: ALL_SUBJECTS_MEME }).first();
    await meme.click();

    await expect(page.locator("#locked-modal.active")).toBeVisible();
    // Two of eight done.
    await expect(page.locator(".locked-progress-value")).toContainText("2 / 8");
    // Math + STEAM rendered as done; English as todo.
    const doneItems = page.locator(".locked-checklist-item.done");
    const todoItems = page.locator(".locked-checklist-item.todo");
    await expect(doneItems).toHaveCount(2);
    await expect(todoItems).toHaveCount(6);
    await expect(doneItems.filter({ hasText: "Математика" })).toHaveCount(1);
    await expect(todoItems.filter({ hasText: "Англійська" })).toHaveCount(1);
});
