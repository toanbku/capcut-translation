import * as fs from "fs";
import * as path from "path";
import gettextParser = require("gettext-parser");

interface TranslationItem {
  msgid: string;
  msgstr: string[];
}

interface Translations {
  [context: string]: {
    [msgid: string]: TranslationItem;
  };
}

interface PoData {
  translations: Translations;
}

// Function to check if a msgid is a header entry
function isHeaderEntry(msgid: string): boolean {
  return (
    msgid === "" ||
    msgid.includes("Project-Id-Version") ||
    msgid.includes("Report-Msgid-Bugs-To")
  );
}

// Read PO files
const poFilePath = path.join(__dirname, "chinese", "zh-Hans.po");
const backupFilePath = path.join(__dirname, "chinese", "zh-Hans.bk.po");

// Check if both files exist
if (!fs.existsSync(poFilePath)) {
  console.error(`Error: Main PO file not found: ${poFilePath}`);
  process.exit(1);
}

if (!fs.existsSync(backupFilePath)) {
  console.error(`Error: Backup PO file not found: ${backupFilePath}`);
  process.exit(1);
}

const poContent = fs.readFileSync(poFilePath, "utf-8");
const backupContent = fs.readFileSync(backupFilePath, "utf-8");

// Parse PO files
const poData = gettextParser.po.parse(poContent) as PoData;
const backupData = gettextParser.po.parse(backupContent) as PoData;

// Create a map of backup translations
const backupTranslations = new Map<string, string>();
for (const [context, translations] of Object.entries(backupData.translations)) {
  for (const [msgid, item] of Object.entries(translations)) {
    if (item.msgstr && item.msgstr[0] && !isHeaderEntry(msgid)) {
      backupTranslations.set(msgid, item.msgstr[0]);
    }
  }
}

// Process translations and rollback empty values
let rolledBackCount = 0;
let skippedCount = 0;
let totalEntries = 0;

for (const [context, translations] of Object.entries(poData.translations)) {
  for (const [msgid, item] of Object.entries(translations)) {
    // Skip header entries
    if (isHeaderEntry(msgid)) {
      skippedCount++;
      continue;
    }

    totalEntries++;

    // Check if the value is empty or "none"
    if (
      !item.msgstr[0] ||
      item.msgstr[0].trim() === "" ||
      item.msgstr[0].toLowerCase() === "none"
    ) {
      // If backup exists, replace with backup
      if (backupTranslations.has(msgid)) {
        const backupValue = backupTranslations.get(msgid)!;
        console.log(`Rolling back: ${msgid}`);
        console.log(`  From: ${item.msgstr[0] || "(empty)"}`);
        console.log(`  To: ${backupValue}\n`);

        item.msgstr = [backupValue];
        rolledBackCount++;
      }
    }
  }
}

// Save updated PO file
const updatedPoContent = gettextParser.po.compile(poData);
fs.writeFileSync(poFilePath, updatedPoContent);

console.log("\nRollback Summary:");
console.log(`Total entries processed: ${totalEntries}`);
console.log(`Skipped header entries: ${skippedCount}`);
console.log(`Rolled back entries: ${rolledBackCount}`);
console.log(`\nRollback completed! File updated: chinese/zh-Hans.po`);
