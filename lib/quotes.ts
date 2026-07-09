export type HomeQuote = {
  text: string;
  author?: string;
  language?: "en" | "zh";
};

export const defaultHomeQuote: HomeQuote = {
  text: "Plan crisp, run calmly.",
  author: "LabPilot",
  language: "en",
};

export const homeQuotes: HomeQuote[] = [
  defaultHomeQuote,
  {
    text: "Chance favors the prepared mind.",
    author: "Louis Pasteur",
    language: "en",
  },
  {
    text: "The art of discovery is not in seeing new things, but in seeing with new eyes.",
    author: "Adapted from Marcel Proust",
    language: "en",
  },
  {
    text: "知不足而奋进，望远山而前行。",
    author: "佚名",
    language: "zh",
  },
  {
    text: "博学之，审问之，慎思之，明辨之，笃行之。",
    author: "《礼记·中庸》",
    language: "zh",
  },
  {
    text: "路漫漫其修远兮，吾将上下而求索。",
    author: "屈原《离骚》",
    language: "zh",
  },
  {
    text: "纸上得来终觉浅，绝知此事要躬行。",
    author: "陆游",
    language: "zh",
  },
  {
    text: "致广大而尽精微。",
    author: "《礼记·中庸》",
    language: "zh",
  },
  {
    text: "慎终如始，则无败事。",
    author: "《道德经》",
    language: "zh",
  },
  {
    text: "不积跬步，无以至千里；不积小流，无以成江海。",
    author: "《荀子·劝学》",
    language: "zh",
  },
];
