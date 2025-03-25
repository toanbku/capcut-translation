declare module "gettext-parser" {
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

  interface GettextParser {
    po: {
      parse(content: string): PoData;
      compile(data: PoData): string;
    };
  }

  const gettextParser: GettextParser;
  export = gettextParser;
}
