import { test, expect } from "@playwright/test";

test.describe("Mini Games smoke tests", () => {
  test("menu lists both games", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Mini Games/i);
    await expect(page.getByRole("heading", { name: "Mini Games" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Лабіринт/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Перший мільйон/ })).toBeVisible();
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
