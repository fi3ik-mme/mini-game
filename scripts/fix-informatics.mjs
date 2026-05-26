#!/usr/bin/env node
/**
 * Audit + rewrite for games/first-million/data/informatyka-4-klas.json.
 *
 * Problem: media SVGs were paired with questions almost at random — e.g. the
 * question "What is a printer?" shipped with a monitor SVG, "What is RAM?"
 * showed a CPU graphic, etc. About half of all 203 questions had visuals that
 * either contradicted the correct answer or had nothing to do with the topic.
 *
 * Strategy: for each question, KEEP the existing visual only when it clearly
 * matches the topic (whitelist below). Everything else gets a clean
 * `info-card` that simply restates the question + highlights the correct
 * answer — the same minimalist style already used by ~45 questions.
 *
 * Also fixes a few off-target question wordings discovered during the audit.
 */

import { readFileSync, writeFileSync } from "node:fs";

const SRC = "games/first-million/data/informatyka-4-klas.json";

const data = JSON.parse(readFileSync(SRC, "utf8"));

// 1-based indices of questions whose existing media is topically appropriate
// and should be preserved. Everything else is rebuilt as an info-card.
const KEEP_MEDIA = new Set([
    1,   // KB visual for "input text" question
    12,  // info-card (touch screen)
    13,  // KB visual for "input device = keyboard"
    17, 18, 19, 20, // already info-cards
    21,  // Windows desktop visual
    22,  // info-card (shortcut)
    23,  // trash bin visual
    24, 25, // info-cards
    27, 28, 29, // file extension visuals match
    31,  // Word doc visual for .doc question
    32,  // info-card
    34,  // .zip visual for .zip question
    35,  // .txt visual for rename file
    36,  // info-card
    38,  // 🌐 internet visual for browser question
    40,  // 🌐 internet visual for Safari
    45,  // URL visual for https://
    49, 50, // info-cards (passwords)
    51,  // SPAM visual
    52,  // internet visual for antivirus
    54, 55, 57, 58, 59, // info-cards
    60, 61, 62, 63, 64, 65, // блок-схема + info-cards
    66, 67, 68, 69, 70, 71, 72, 73, 74, 75, // Scratch group
    76,  // Word visual for text editor
    81,  // Ctrl+Z visual for Ctrl+Z
    83, 84, 85, // Ctrl modifier visual fits Ctrl+B/I/U
    87,  // info-card
    89, 90, 91, 92, // Paint tools — Paint visual fits
    94, 95, // info-cards
    96, 97, 98, 99, 100, 101, // bytes table
    103, // Enter visual for Enter question
    104, // KB visual for spacebar question (keyboard topic)
    108, // "Shift / великі літери" visual for Caps Lock — same topic
    111, // Ctrl visual for Ctrl key question
    112, // KB visual for arrow keys (keyboard topic)
    117, 118, 119, // info-cards (founders)
    120, // 🔍 search visual for Google search engine
    123, 125, 127, // info-cards
    131, // RAM visual for RAM question
    136, 138, // info-cards
    140, 141, // 💾 save, 🖨 print icons
    142, // info-card
    145, 146, // 🌐 internet for bookmarks/history
    148, 149, // info-cards
    150, // email visual for "unknown attachments" (email topic)
    153, 154, 156, 157, 158, 159, 160, // info-cards
    161, // monitor visual for eye fatigue from screens (topic match)
    162, // info-card
    164, // info-card
    166, // info-card (.ua domain)
    168, 169, // info-cards
    170, // KB visual for Windows key (keyboard topic)
    171, // PrtSc visual
    174, // info-card (pixel)
    175, // monitor visual for screen resolution (topic match)
    179, // info-card
    180, 181, // Ctrl+P, Ctrl+F visuals
    182, // info-card
    183, // 🌐 internet visual for F5 refresh
    185, 186, 187, 188, // info-cards
    190, // KB visual for keyboard layout
    191, // .jpg visual for filename extension dot (filename topic)
    192, 193, 194, // info-cards
    195, 196, // 🌐 internet for Chrome/Edge
    198, // 🔍 search visual for hashtag
    199, 200, // info-cards
    202, // .zip visual for archive question
]);

// Per-question text/answer fixes discovered during the audit.
// Keys are 1-based question indices.
const TEXT_FIXES = {
    // Q110: original asked about "довгий горизонтальний рух пальцями для табуляції"
    // — that's nonsense (sounds like a swipe gesture, not a keyboard key). Rewrite
    // to a clean keyboard question about Tab.
    110: {
        text: "Яка клавіша служить для відступу й переміщення між полями форми?",
        answers: ["Tab", "Shift", "Caps Lock", "Esc"],
        correct: 0,
    },
};

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Strip trailing question marks/colons so the topic reads cleanly inside the card.
function topicFromText(text) {
    return text.replace(/[?:…]+\s*$/g, "").trim();
}

function infoCard(question, correctAnswer) {
    const topic = escapeHtml(topicFromText(question));
    const answer = escapeHtml(correctAnswer);
    return `<div class="info-card">💻 <span style="color:#cbd5e1">${topic}</span><br><b style="color:#34d399;font-size:1.1em">${answer}</b></div>`;
}

let mediaReplaced = 0;
let textFixed = 0;

data.questions = data.questions.map((q, i) => {
    const idx = i + 1;
    let next = { ...q };

    if (TEXT_FIXES[idx]) {
        Object.assign(next, TEXT_FIXES[idx]);
        textFixed++;
    }

    if (!KEEP_MEDIA.has(idx)) {
        next.media = infoCard(next.text, next.answers[next.correct]);
        mediaReplaced++;
    }

    return next;
});

writeFileSync(SRC, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`✅ Done.`);
console.log(`   Questions:        ${data.questions.length}`);
console.log(`   Media kept as-is: ${KEEP_MEDIA.size}`);
console.log(`   Media replaced:   ${mediaReplaced}`);
console.log(`   Text rewritten:   ${textFixed}`);
