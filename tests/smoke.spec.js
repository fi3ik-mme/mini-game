import { test, expect } from "@playwright/test";

test.describe("Mini Games smoke tests", () => {
  test("menu lists both games", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Міні-Ігри/);
    await expect(page.getByRole("heading", { name: "Міні-Ігри" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Лабіринт/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Перший мільйон/ })).toBeVisible();
  });

  test("PWA assets are reachable and manifest is valid", async ({ page, request }) => {
    const manifestRes = await request.get("/manifest.webmanifest");
    expect(manifestRes.ok()).toBeTruthy();
    const manifest = await manifestRes.json();
    expect(manifest.name).toContain("Міні-Ігри");
    expect(manifest.lang).toBe("uk");
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);

    const swRes = await request.get("/sw.js");
    expect(swRes.ok()).toBeTruthy();
    const swText = await swRes.text();
    expect(swText).toContain("CACHE_NAME");
    expect(swText).toMatch(/addEventListener\(["']fetch["']/);

    const iconRes = await request.get("/icon.svg");
    expect(iconRes.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest$/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#1a1a2e");
    await expect(page.locator("#share-btn")).toBeVisible();
  });

  test("maze game loads and player moves", async ({ page }) => {
    await page.goto("/games/maze/index.html");
    await expect(page).toHaveTitle(/Maze Game/i);
    await expect(page.locator("#player")).toBeVisible();
    await expect(page.locator("#goal")).toBeVisible();

    const player = page.locator("#player");
    const startPos = await player.evaluate(el => el.style.left + el.style.top);

    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let moved = false;
    for (const key of keys) {
      await page.keyboard.press(key);
      await page.waitForTimeout(150);
      const pos = await player.evaluate(el => el.style.left + el.style.top);
      if (pos !== startPos) {
        moved = true;
        break;
      }
    }

    expect(moved).toBe(true);
  });

  test("first million loads subjects and starts quiz", async ({ page }) => {
    await page.goto("/games/first-million/index.html");
    await expect(page.getByRole("heading", { name: /Перший мільйон/ })).toBeVisible();

    const mathBtn = page.locator(".subject-btn").filter({ hasText: "Математика" });
    await expect(mathBtn).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".subject-btn").filter({ hasText: "Українська мова" })).toBeVisible();

    await mathBtn.click();
    await expect(page.locator("#question-text")).not.toHaveText("Завантаження...");
    await expect(page.locator(".answer-btn")).toHaveCount(4);
    await expect(page.getByText(/Питання 1 з 15/)).toBeVisible();
  });

  test("english subject loads with 300-question pool and renders a quiz", async ({ page }) => {
    await page.goto("/games/first-million/index.html");

    const englishBtn = page.locator(".subject-btn").filter({ hasText: "Англійська мова" });
    await expect(englishBtn).toBeVisible({ timeout: 10000 });
    await englishBtn.click();

    await expect(page.locator("#question-text")).not.toHaveText("Завантаження...");
    await expect(page.locator(".answer-btn")).toHaveCount(4);
    await expect(page.getByText(/Питання 1 з 15/)).toBeVisible();

    const res = await page.request.get("/games/first-million/data/anhliyska-mova-4-klas.json");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.questions)).toBe(true);
    expect(data.questions.length).toBe(300);

    for (const q of data.questions) {
      expect(typeof q.text).toBe("string");
      expect(q.text.length).toBeGreaterThan(0);
      expect(Array.isArray(q.answers)).toBe(true);
      expect(q.answers.length).toBe(4);
      expect(new Set(q.answers).size).toBe(4);
      expect(Number.isInteger(q.correct)).toBe(true);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(4);
    }
  });

  test("Я досліджую світ: every question has explanation; modal opens after answer", async ({ page }) => {
    await page.goto("/games/first-million/index.html");

    const res = await page.request.get("/games/first-million/data/ya-doslidzhuyu-svit-4-klas.json");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.questions)).toBe(true);
    expect(data.questions.length).toBeGreaterThanOrEqual(100);

    for (const q of data.questions) {
      expect(typeof q.text).toBe("string");
      expect(q.text.length).toBeGreaterThan(0);
      expect(Array.isArray(q.answers)).toBe(true);
      expect(q.answers.length).toBe(4);
      expect(new Set(q.answers).size).toBe(4);
      expect(Number.isInteger(q.correct)).toBe(true);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(4);
      expect(typeof q.explanation).toBe("string");
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(typeof q.media).toBe("string");
      expect(q.media.length).toBeGreaterThan(0);
    }

    const base64Images = data.questions.filter(q =>
      typeof q.media === "string" && q.media.includes('data:image/svg+xml;base64,')
    );
    expect(base64Images.length).toBeGreaterThanOrEqual(20);

    const subjBtn = page.locator(".subject-btn").filter({ hasText: "Я досліджую світ" });
    await expect(subjBtn).toBeVisible({ timeout: 10000 });
    await subjBtn.click();

    await expect(page.locator("#question-text")).not.toHaveText("Завантаження...");
    await expect(page.locator(".answer-btn")).toHaveCount(4);

    await page.locator(".answer-btn").first().click();

    await expect(page.locator("#explanation-modal")).toHaveClass(/active/);
    await expect(page.locator("#modal-title")).toBeVisible();
    await expect(page.locator("#modal-explanation")).not.toBeEmpty();
    await expect(page.locator("#modal-continue")).toBeVisible();

    await page.locator("#modal-continue").click();
    await expect(page.locator("#explanation-modal")).not.toHaveClass(/active/);
  });

  const allSubjects = [
    { title: "Інформатика", file: "informatyka-4-klas.json", min: 200 },
    { title: "Мистецтво", file: "mystetstvo-4-klas.json", min: 100 },
    { title: "STEAM", file: "steam-4-klas.json", min: 300 },
    { title: "Іспанська мова", file: "ispanska-mova-4-klas.json", min: 300 }
  ];

  for (const subj of allSubjects) {
    test(`${subj.title} subject loads with ${subj.min}+ questions and all are valid`, async ({ page }) => {
      await page.goto("/games/first-million/index.html");

      const btn = page.locator(".subject-btn").filter({ hasText: subj.title });
      await expect(btn).toBeVisible({ timeout: 10000 });
      await btn.click();

      await expect(page.locator("#question-text")).not.toHaveText("Завантаження...");
      await expect(page.locator(".answer-btn")).toHaveCount(4);
      await expect(page.getByText(/Питання 1 з 15/)).toBeVisible();

      const res = await page.request.get(`/games/first-million/data/${subj.file}`);
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBeGreaterThanOrEqual(subj.min);

      for (const q of data.questions) {
        expect(typeof q.text).toBe("string");
        expect(q.text.length).toBeGreaterThan(0);
        expect(Array.isArray(q.answers)).toBe(true);
        expect(q.answers.length).toBe(4);
        expect(new Set(q.answers).size).toBe(4);
        expect(Number.isInteger(q.correct)).toBe(true);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThan(4);
      }
    });
  }
});
