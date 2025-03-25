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
    if (item.msgstr && item.msgstr[0]) {
      enTranslations.set(msgid, item.msgstr[0]);
    }
  }
}

// Update Chinese translations
let updatedCount = 0;
for (const [context, translations] of Object.entries(zhPo.translations)) {
  for (const [msgid, item] of Object.entries(translations)) {
    // If the msgid exists in English translations, update the Chinese translation
    if (enTranslations.has(msgid)) {
      const englishTranslation = enTranslations.get(msgid)!;
      if (item.msgstr[0] !== englishTranslation) {
        item.msgstr = [englishTranslation];
        updatedCount++;
        console.log(`Updated: ${msgid}`);
        console.log(`  From: ${item.msgstr[0]}`);
        console.log(`  To: ${englishTranslation}\n`);
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

console.log(`Updated ${updatedCount} translations in zh-Hans.po`);
