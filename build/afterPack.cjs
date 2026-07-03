const fs = require("node:fs");
const path = require("node:path");

const KEEP_LANGS = new Set(["zh_CN", "zh_TW", "en_US", "en_GB", "en", "zh"]);

const shouldKeep = (dirName) => {
  const base = dirName.replace(/\.lproj$/, "");
  if (KEEP_LANGS.has(base)) return true;
  const lang = base.replace(/_(FEMININE|MASCULINE|NEUTER)$/, "");
  return KEEP_LANGS.has(lang);
};

const pruneLproj = (dir) => {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".lproj") || shouldKeep(entry)) continue;
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    removed++;
  }
  return removed;
};

const pruneWindowsLocales = (dir) => {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".pak")) continue;
    const lang = entry.replace(/\.pak$/, "");
    if (KEEP_LANGS.has(lang)) continue;
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    removed++;
  }
  return removed;
};

exports.default = async (context) => {
  const appOutDir = context.appOutDir;
  let removed = 0;

  if (process.platform === "darwin") {
    const fwRes = path.join(
      appOutDir,
      "Redix.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources"
    );
    removed += pruneLproj(fwRes);
  } else if (process.platform === "win32") {
    removed += pruneWindowsLocales(path.join(appOutDir, "locales"));
  }

  console.log(`[afterPack] removed ${removed} locale entries`);
};
