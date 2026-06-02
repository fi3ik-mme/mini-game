#!/usr/bin/env node
import { execSync } from "child_process";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node verify-wikimedia-images.mjs File1.jpg ...");
  process.exit(1);
}

function resolve(name) {
  const enc = encodeURIComponent(name).replace(/%2C/g, "%2C").replace(/'/g, "%27");
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${name.includes("%") ? name : name.replace(/ /g, "_").replace(/'/g, "%27").replace(/,/g, "%2C")}?width=280`;
  const cmd = `curl -sL -o /dev/null -w "%{http_code}|%{url_effective}" "${url.replace(/'/g, "'\\''")}"`;
  try {
    const out = execSync(cmd, { encoding: "utf8", timeout: 15000 }).trim();
    const [code, final] = out.split("|");
    return { name, code, final };
  } catch (e) {
    return { name, code: "err", final: "" };
  }
}

for (const f of files) {
  const r = resolve(f);
  const ok = r.code === "200" && r.final.includes("upload.wikimedia.org");
  console.log(`${ok ? "OK" : "NO"} ${r.code}\t${f}`);
  if (ok) console.log(`    ${r.final}`);
}
