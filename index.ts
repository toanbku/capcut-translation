import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import gettextParser = require("gettext-parser");
import { translate } from "@vitalets/google-translate-api";
import { SocksProxyAgent } from "socks-proxy-agent";

dotenv.config();

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

// Create SOCKS5 proxy agent
const proxyUrl = process.env.SOCK5_PROXY;
if (!proxyUrl) {
  throw new Error("SOCK5_PROXY environment variable is not set");
}
const agent = new SocksProxyAgent(proxyUrl);

async function translateText(text: string): Promise<string> {
  try {
    const result = await translate(text, {
      from: "auto",
      to: "en",
      fetchOptions: {
        agent,
      },
    });

    return result.text;
  } catch (error) {
    console.error(`Translation failed for text: ${text}`);
    console.error(error);
    return text;
  }
}

// Function to check if text contains non-English characters
function containsNonEnglish(text: string): boolean {
  // This regex checks for any character that is not:
  // - ASCII letters (a-z, A-Z)
  // - Numbers (0-9)
  // - Common punctuation and spaces
  return /[^\x00-\x7F]/.test(text);
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
const enPoContent = fs.readFileSync(
  path.join(__dirname, "international", "en.po"),
  "utf-8"
);
const zhPoContent = fs.readFileSync(
  path.join(__dirname, "chinese", "zh-Hans.po"),
  "utf-8"
);

// Parse PO files
const enPo = gettextParser.po.parse(enPoContent) as PoData;
const zhPo = gettextParser.po.parse(zhPoContent) as PoData;

// Create a map of English translations
const enTranslations = new Map<string, string>();
for (const [context, translations] of Object.entries(enPo.translations)) {
  for (const [msgid, item] of Object.entries(translations)) {
    if (item.msgstr && item.msgstr[0] && !isHeaderEntry(msgid)) {
      enTranslations.set(msgid, item.msgstr[0]);
    }
  }
}

// Update Chinese translations
let updatedCount = 0;
let translatedCount = 0;
let skippedCount = 0;

async function processTranslations() {
  // Count total entries to process
  let totalEntries = 0;
  for (const [context, translations] of Object.entries(zhPo.translations)) {
    for (const [msgid] of Object.entries(translations)) {
      if (!isHeaderEntry(msgid)) {
        totalEntries++;
      }
    }
  }

  console.log(`\nTotal entries to process: ${totalEntries}\n`);

  let processedEntries = 0;
  for (const [context, translations] of Object.entries(zhPo.translations)) {
    for (const [msgid, item] of Object.entries(translations)) {
      processedEntries++;
      const progress = ((processedEntries / totalEntries) * 100).toFixed(1);

      // Skip header entries
      if (isHeaderEntry(msgid)) {
        skippedCount++;
        continue;
      }

      // If the msgid exists in English translations, update the Chinese translation
      if (enTranslations.has(msgid) && enTranslations.get(msgid) !== "none") {
        const englishTranslation = enTranslations.get(msgid)!;
        if (item.msgstr[0] !== englishTranslation) {
          console.log(`[${progress}%] Updated from English: ${msgid}`);
          console.log(`  From: ${item.msgstr[0]}`);
          console.log(`  To: ${englishTranslation}\n`);
          item.msgstr = [englishTranslation];
          updatedCount++;
        }
      } else if (containsNonEnglish(item.msgstr[0])) {
        // If no English translation exists and the text contains non-English characters
        const translatedText = await translateText(item.msgstr[0]);
        if (translatedText !== item.msgstr[0]) {
          console.log(`[${progress}%] Translated non-English text: ${msgid}`);
          console.log(`  From: ${item.msgstr[0]}`);
          console.log(`  To: ${translatedText}\n`);
          item.msgstr = [translatedText];
          translatedCount++;
        }
      }
    }
  }

  // Save updated Chinese PO file
  const updatedZhPoContent = gettextParser.po.compile(zhPo);
  fs.writeFileSync(
    path.join(__dirname, "chinese", "zh-Hans.po"),
    updatedZhPoContent
  );

  console.log("\nTranslation Summary:");
  console.log(`Total entries processed: ${totalEntries}`);
  console.log(`Skipped header entries: ${skippedCount}`);
  console.log(`Updated from English: ${updatedCount}`);
  console.log(`Translated non-English entries: ${translatedCount}`);
  console.log(`\nTranslation completed! File saved to: chinese/zh-Hans.po`);
}

// Run the translation process
processTranslations().catch(console.error);
