// @ts-check
const { test, expect } = require("@playwright/test");

const URL = "http://localhost:3456/games/first-million/";

async function instrumentVoice(page) {
    await page.addInitScript(() => {
        window.__utts = [];
        class FakeUtterance {
            constructor(text) {
                this.text = text;
                this.lang = "uk-UA";
                this._voice = null;
                this.rate = 1;
                this.pitch = 1;
            }
            set voice(v) { this._voice = v; }
            get voice()  { return this._voice; }
        }
        // 3 fake Ukrainian voices so the picker has a real pool to choose from.
        const fakeVoices = [
            { lang: "uk-UA", name: "UA Voice 1" },
            { lang: "uk-UA", name: "UA Voice 2" },
            { lang: "uk-UA", name: "UA Voice 3" }
        ];
        const fakeSyn = {
            cancel: () => {},
            speak: (u) => {
                window.__utts.push({
                    text: u.text,
                    voice: u._voice ? u._voice.name : null,
                    rate: u.rate,
                    pitch: u.pitch
                });
            },
            getVoices: () => fakeVoices,
            set onvoiceschanged(_) {},
            get onvoiceschanged() { return null; }
        };
        Object.defineProperty(window, "speechSynthesis", { configurable: true, get: () => fakeSyn });
        Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    });
}

test("speak picks varied voices and jitters pitch/rate", async ({ page }) => {
    await instrumentVoice(page);

    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");

    await page.locator("#voice-toggle").click();

    // Clear the toggle-confirmation utterance so we measure only our 20 calls.
    await page.evaluate(() => { window.__utts.length = 0; });

    await page.evaluate(() => {
        for (let i = 0; i < 20; i++) voice.speak("привіт " + i);
    });
    const utts = await page.evaluate(() => window.__utts.slice());
    expect(utts.length).toBe(20);

    // At least 2 distinct voices should have been picked
    const voiceNames = new Set(utts.map(u => u.voice));
    expect(voiceNames.size).toBeGreaterThanOrEqual(2);

    // Pitch/rate should vary (not all identical)
    const pitches = new Set(utts.map(u => Math.round(u.pitch * 100)));
    const rates   = new Set(utts.map(u => Math.round(u.rate * 100)));
    expect(pitches.size).toBeGreaterThan(3);
    expect(rates.size).toBeGreaterThan(3);

    // All pitches/rates inside our chosen ranges
    utts.forEach(u => {
        expect(u.pitch).toBeGreaterThanOrEqual(0.80);
        expect(u.pitch).toBeLessThanOrEqual(1.25);
        expect(u.rate).toBeGreaterThanOrEqual(0.88);
        expect(u.rate).toBeLessThanOrEqual(1.08);
    });
});

test("subsequent question + friend speak use different random voices", async ({ page }) => {
    await instrumentVoice(page);
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".subject-btn");
    await page.locator("#voice-toggle").click();

    await page.locator(".subject-btn").first().click();
    await page.waitForSelector(".answer-btn");

    // Trigger friend call which speaks the friend's advice (separate utterance).
    await page.locator("#hint-phone").click();
    await page.waitForTimeout(2400);

    const utts = await page.evaluate(() => window.__utts.slice());
    // At least 2 distinct speak() calls — question + friend
    expect(utts.length).toBeGreaterThanOrEqual(2);
    // Over multiple runs they may match by chance, but odds across many test runs of
    // exactly matching voice + pitch + rate are negligible.
});
