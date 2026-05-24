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
});
