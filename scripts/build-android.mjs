#!/usr/bin/env node
/*
 * Programmatic Android APK build for Mini-Games using Bubblewrap.
 *
 * What this script does:
 *   1. Spins up a tiny local HTTP server so Bubblewrap can fetch the icon
 *      and manifest from disk (no need for the live site to be reachable).
 *   2. Builds a TwaManifest from manifest.webmanifest with sensible defaults
 *      for wide device coverage (min SDK 21 = Android 5.0, target SDK 34
 *      = Android 14). The runtime APK loads the production URL.
 *   3. Generates the Android (TWA) project into android/.
 *   4. Creates a signing keystore if missing.
 *   5. Runs `gradle assembleRelease` and signs the resulting APK.
 *   6. Copies the signed APK to download/mini-games.apk.
 *
 * Required env (auto-detected when possible):
 *   JAVA_HOME             path to JDK 17
 *   ANDROID_HOME          path to Android SDK
 *   BUBBLEWRAP_KEYSTORE_PASSWORD  keystore password (default: minigames)
 *   BUBBLEWRAP_KEY_PASSWORD       key password (default: minigames)
 */

import { createServer } from "node:http";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

import {
  TwaManifest,
  TwaGenerator,
  Config,
  JdkHelper,
  AndroidSdkTools,
  GradleWrapper,
  KeyTool,
  ConsoleLog,
} from "@bubblewrap/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ANDROID_DIR = path.join(PROJECT_ROOT, "android");
const DOWNLOAD_DIR = path.join(PROJECT_ROOT, "download");
const KEYSTORE_PATH = path.join(PROJECT_ROOT, "signing/release.keystore");
const KEYSTORE_ALIAS = "android";
const KEYSTORE_PASS =
  process.env.BUBBLEWRAP_KEYSTORE_PASSWORD || "minigames";
const KEY_PASS = process.env.BUBBLEWRAP_KEY_PASSWORD || "minigames";

/* -----------------------------------------------------------------------------
 * APK version source-of-truth.
 *
 * Bump APP_VERSION_CODE by 1 and APP_VERSION_NAME on every new APK release.
 * The build script writes these into:
 *   - the APK itself (Bubblewrap → AndroidManifest versionCode/versionName)
 *   - the startUrl query string (?src=apk&av=N) so the running app can know
 *     which APK version it is and notify the user when a newer one is published
 *   - release.json at the repo root, which the live site exposes so any
 *     installed APK can poll it and prompt the user to update.
 * --------------------------------------------------------------------------- */
const APP_VERSION_CODE = 10;
const APP_VERSION_NAME = "1.8.0";
const RELEASE_NOTES =
  "Нова гра «Мова» (4 клас); Перший мільйон — раунд часів дієслів; фікси пазлів Geo Quest.";

const log = new ConsoleLog("build-android");

function detectJdkHome() {
  // Bubblewrap appends `/Contents/Home/` on macOS, so we pass the `.jdk` bundle
  // root (not the inner Contents/Home directory).
  // On Windows, Bubblewrap shells out to java without quoting JAVA_HOME, so
  // prefer a path without spaces (e.g. C:\jdk-21 junction) when available.
  const noSpaceCandidates = ["C:\\jdk-21", "C:\\jdk-17"];
  if (process.env.BUBBLEWRAP_JDK_PATH) return process.env.BUBBLEWRAP_JDK_PATH;
  for (const c of noSpaceCandidates) if (existsSync(c)) return c;
  if (process.env.JAVA_HOME) {
    return process.platform === "darwin" &&
      process.env.JAVA_HOME.endsWith("/Contents/Home")
      ? process.env.JAVA_HOME.replace(/\/Contents\/Home\/?$/, "")
      : process.env.JAVA_HOME;
  }
  const candidates = [
    "/usr/local/opt/openjdk@17/libexec/openjdk.jdk",
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk",
    "/Library/Java/JavaVirtualMachines/openjdk-17.jdk",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(
    "JDK 17 not found. Install: brew install openjdk@17 (or set JAVA_HOME)",
  );
}

function detectAndroidHome() {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  if (process.env.ANDROID_SDK_ROOT) return process.env.ANDROID_SDK_ROOT;
  const candidates = [
    path.join(os.homedir(), "Android/sdk"),
    path.join(os.homedir(), "Library/Android/sdk"),
    path.join(os.homedir(), "AppData/Local/Android/Sdk"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(
    "Android SDK not found. See README → Building the Android binary.",
  );
}

async function startLocalServer(rootDir) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".css": "text/css",
  };
  const server = createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (urlPath === "/" || urlPath === "") urlPath = "/index.html";
      const filePath = path.join(rootDir, urlPath);
      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
      res.end(data);
    } catch (err) {
      res.statusCode = 404;
      res.end("404");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function buildTwaManifest(baseUrl) {
  const webManifestPath = path.join(PROJECT_ROOT, "manifest.webmanifest");
  const webManifest = JSON.parse(await fs.readFile(webManifestPath, "utf8"));

  const webManifestUrl = new URL(`${baseUrl}/manifest.webmanifest`);
  const local = TwaManifest.fromWebManifestJson(webManifestUrl, webManifest);

  local.packageId = "io.github.fi3ikmme.minigames";
  local.host = "fi3ik-mme.github.io";
  // The query string lets the running PWA detect that it is being opened by
  // the installed APK (src=apk) and which version (av=N), so the menu page
  // can poll release.json and offer an update when a newer APK is published.
  local.startUrl = `/mini-game/?src=apk&av=${APP_VERSION_CODE}`;
  local.name = "Міні-Ігри";
  local.launcherName = "Міні-Ігри";
  local.appVersionName = APP_VERSION_NAME;
  local.appVersionCode = APP_VERSION_CODE;
  local.minSdkVersion = 21;
  local.fallbackType = "webview";
  local.display = "standalone";
  local.orientation = "portrait";
  local.enableNotifications = false;
  local.enableSiteSettingsShortcut = true;
  local.signingKey = {
    path: KEYSTORE_PATH,
    alias: KEYSTORE_ALIAS,
  };
  local.iconUrl = `${baseUrl}/icon.svg`;
  local.maskableIconUrl = `${baseUrl}/icon.svg`;
  local.generatorApp = "mini-game/scripts/build-android.mjs";

  for (const sc of local.shortcuts) {
    if (sc.chosenIconUrl?.startsWith("./")) {
      sc.chosenIconUrl = `${baseUrl}/${sc.chosenIconUrl.slice(2)}`;
    }
  }

  const err = local.validate();
  if (err) throw new Error(`TwaManifest invalid: ${err}`);
  return local;
}

async function ensureKeystore(jdkHelper) {
  if (existsSync(KEYSTORE_PATH)) {
    log.info(`Reusing existing keystore: ${KEYSTORE_PATH}`);
    return;
  }
  await fs.mkdir(path.dirname(KEYSTORE_PATH), { recursive: true });
  log.info(`Generating new keystore: ${KEYSTORE_PATH}`);
  const keyTool = new KeyTool(jdkHelper, log);
  await keyTool.createSigningKey(
    {
      path: KEYSTORE_PATH,
      alias: KEYSTORE_ALIAS,
      keypassword: KEY_PASS,
      password: KEYSTORE_PASS,
      fullName: "Mini Games",
      organizationalUnit: "Mini Games",
      organization: "Mini Games",
      country: "UA",
    },
    false,
  );
}

async function main() {
  const jdkPath = detectJdkHome();
  const sdkPath = detectAndroidHome();
  log.info(`JAVA_HOME=${jdkPath}`);
  log.info(`ANDROID_HOME=${sdkPath}`);

  const config = new Config(jdkPath, sdkPath);
  const jdkHelper = new JdkHelper(process, config);
  const androidSdkTools = await AndroidSdkTools.create(
    process,
    config,
    jdkHelper,
    log,
  );

  if (!(await androidSdkTools.checkBuildTools())) {
    log.info("Installing Android build-tools…");
    await androidSdkTools.installBuildTools();
  }

  await fs.mkdir(ANDROID_DIR, { recursive: true });
  await fs.mkdir(DOWNLOAD_DIR, { recursive: true });

  const { server, baseUrl } = await startLocalServer(PROJECT_ROOT);
  log.info(`Local server serving project at ${baseUrl}`);

  try {
    const twaManifest = await buildTwaManifest(baseUrl);

    log.info(`Generating Android project in ${ANDROID_DIR}`);
    const generator = new TwaGenerator();
    await generator.removeTwaProject(ANDROID_DIR).catch(() => {});
    await generator.createTwaProject(ANDROID_DIR, twaManifest, log);
    await twaManifest.saveToFile(path.join(ANDROID_DIR, "twa-manifest.json"));

    await ensureKeystore(jdkHelper);

    log.info("Running gradle assembleRelease…");
    const gradle = new GradleWrapper(process, androidSdkTools, ANDROID_DIR);
    await gradle.assembleRelease();

    const unsignedApk = path.join(
      ANDROID_DIR,
      "app/build/outputs/apk/release/app-release-unsigned.apk",
    );
    const alignedApk = path.join(ANDROID_DIR, "app-release-unsigned-aligned.apk");
    const signedApk = path.join(ANDROID_DIR, "app-release-signed.apk");
    await fs.copyFile(unsignedApk, alignedApk);
    await androidSdkTools.zipalignOnlyVerification(alignedApk);

    log.info("Signing APK…");
    await androidSdkTools.apksigner(
      `"${KEYSTORE_PATH}"`,
      `"${KEYSTORE_PASS}"`,
      KEYSTORE_ALIAS,
      `"${KEY_PASS}"`,
      alignedApk,
      signedApk,
    );

    const finalApk = path.join(DOWNLOAD_DIR, "mini-games.apk");
    await fs.copyFile(signedApk, finalApk);

    const size = (await fs.stat(finalApk)).size;

    // Publish release.json at the repo root so the deployed site exposes the
    // current native version. Installed APKs poll it and offer an update when
    // versionCode is higher than their baked-in `av`.
    const releaseManifest = {
      versionCode: APP_VERSION_CODE,
      versionName: APP_VERSION_NAME,
      downloadUrl: "./download/mini-games.apk",
      sizeBytes: size,
      notes: RELEASE_NOTES,
      publishedAt: new Date().toISOString(),
      packageId: twaManifest.packageId,
      minSdkVersion: twaManifest.minSdkVersion,
    };
    await fs.writeFile(
      path.join(PROJECT_ROOT, "release.json"),
      JSON.stringify(releaseManifest, null, 2) + "\n",
    );

    log.info(
      `Done. APK: ${path.relative(PROJECT_ROOT, finalApk)} (${(
        size / 1024
      ).toFixed(0)} KB), version ${APP_VERSION_NAME} (code ${APP_VERSION_CODE})`,
    );
    log.info(`release.json written to ${path.relative(PROJECT_ROOT, path.join(PROJECT_ROOT, "release.json"))}`);
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
