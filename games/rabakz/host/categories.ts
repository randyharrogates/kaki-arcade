/** Player-facing titles from content/rabakz/src/questions category metadata.
 * Kept separate from question payloads so the screen imports no private answers.
 * categories.test.ts checks every title against the bank. */
export const CATEGORY_TITLES: Readonly<Record<string, string>> = {
  "arts-and-literature": "Arts and literature",
  "film-and-tv": "Film and television",
  "games-comics-and-anime": "Games, comics and anime",
  "general-knowledge": "General knowledge",
  "geography": "Geography",
  "history": "History",
  "music": "Music",
  "science-and-nature": "Science and nature",
  "singapore-arts-and-sport": "Singapore arts and sport",
  "singapore-food": "Singapore food",
  "singapore-history": "Singapore history",
  "singapore-life": "Singapore life",
  "singapore-nature": "Singapore nature",
  "singapore-places": "Singapore places",
  "sport": "Sport",
  "technology": "Technology and vehicles",
};
export const categoryTitle = (id: string): string => CATEGORY_TITLES[id] ?? id;
