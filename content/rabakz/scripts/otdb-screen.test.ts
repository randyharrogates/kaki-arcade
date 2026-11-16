import { describe, expect, it } from 'vitest';
import type { SourceQuestion } from '../src/tools';
import { EXCLUDED_CATEGORIES, screenQuestion } from './otdb-screen';

const GENERAL = 9;
const FILM = 11;
const VIDEO_GAMES = 15;

function asked(prompt: string, options = ['Berlin', 'Paris', 'Rome', 'Madrid']): SourceQuestion {
  return {
    id: 'otdb-000000000000',
    type: 'multiple-choice',
    prompt,
    options,
    answer: options[0] ?? '',
    difficulty: 'easy',
    region: 'general',
  };
}

const rule = (prompt: string, options?: string[], category = GENERAL): string | null =>
  screenQuestion(asked(prompt, options), category)?.rule ?? null;

describe('the import screen', () => {
  it('passes an ordinary question', () => {
    expect(rule('Which city is the capital of Germany?')).toBeNull();
    expect(rule('Which of these is NOT a primary colour?', ['Green', 'Red', 'Blue', 'Yellow'])).toBeNull();
    expect(rule('In which year did the Second World War end?', ['1945', '1944', '1946', '1918'])).toBeNull();
  });

  it('leaves a whole dataset category out, and says why', () => {
    expect(Object.keys(EXCLUDED_CATEGORIES)).toEqual(['26']);
    const hit = screenQuestion(asked('Which city was she born in?'), 26);
    expect(hit?.rule).toBe('source category left out');
    expect(hit?.match).toMatch(/Celebrities/);
  });

  it('drops wording that was only true when it was written', () => {
    for (const prompt of [
      'As of 2016, who is the tallest player in the league?',
      'Who is the current Prime Minister of Canada?',
      'Which is the latest version of Android?',
      'Which phone was most recently released?',
      'Which country is hosting the 2022 World Cup?',
      'Which of these films will be released next year?',
    ]) {
      expect(rule(prompt), prompt).toBe('dated wording');
    }
    expect(rule('What is the SI unit of electric current?')).toBeNull();
    expect(rule('Which year did the film "Current Code" come out?')).toBeNull();
  });

  it('drops records and counts that change', () => {
    for (const prompt of [
      'What is the highest-grossing film of all time?',
      'Which is the best-selling console?',
      'What is the population of Iceland?',
      'What is the tallest building in the world?',
      'Which club has won the most league titles?',
      'How many seasons does the show have?',
      'Who is the richest person in Asia?',
      'Which country has the most time zones?',
      'Who is the only player to have won both cups?',
      'Which of these brands is owned by a French company?',
      'How many moon landings have there been?',
      'What is the largest city in Africa?',
    ]) {
      expect(rule(prompt), prompt).toBe('record or count that changes');
    }
    expect(rule('What is the largest organ of the human body?')).toBeNull();
    expect(rule('How many seasons did the show run for?')).toBeNull();
    // The patterns are broad on purpose: a fact that will never change is caught too, and is
    // let back in by id through otdb-allowed.txt once someone has read it.
    expect(rule('What is the only even prime number?')).toBe('record or count that changes');
  });

  it('drops internet fads', () => {
    expect(rule('Which YouTuber made this channel famous?')).toBe('internet fad');
    expect(rule('Which word started as a meme?')).toBe('internet fad');
    expect(rule('Which site is it?', ['Reddit', 'Digg', 'Fark', 'Slashdot'])).toBe('internet fad');
    expect(rule('What sits in the middle of fidget spinners?')).toBe('internet fad');
  });

  it('drops questions that need a sound or a picture', () => {
    expect(rule('Which animal is pictured?')).toBe('needs a sound or a picture');
    expect(rule('How is the word "quay" pronounced?')).toBe('needs a sound or a picture');
    expect(rule('Which country does this flag belong to?')).toBe('needs a sound or a picture');
  });

  it('drops options that only work in their written order', () => {
    expect(rule('Which is a fruit?', ['All of the above', 'Apple', 'Pear', 'Plum'])).toBe(
      'depends on option order',
    );
    expect(rule('Which is a fruit?', ['Both A and B', 'Apple', 'Pear', 'Plum'])).toBe(
      'depends on option order',
    );
    expect(rule('Which is a fruit?', ['None of these', 'Apple', 'Pear', 'Plum'])).toBeNull();
    // "above" in the prompt is ordinary English.
    expect(rule('Which city lies above the Arctic Circle?')).toBeNull();
  });

  it('drops alcohol, tobacco and drugs, in the prompt or in an option', () => {
    expect(rule('Which grain is used to make beer?')).toBe('alcohol or tobacco');
    expect(rule('Which is a spirit?', ['Vodka', 'Cola', 'Tea', 'Milk'])).toBe('alcohol or tobacco');
    expect(rule('Which brand of cigarettes had a camel on it?')).toBe('alcohol or tobacco');
    expect(rule('Which drug cartel was based in Colombia?')).toBe('drugs');
    expect(rule('Which band wrote a song about cannabis?')).toBe('drugs');
    expect(rule('Which genre is psychedelic rock closest to?')).toBeNull();
  });

  it('drops violence, with the harmless uses let through', () => {
    for (const prompt of [
      'Who killed the dragon in the story?',
      'Which character is murdered in the first chapter?',
      'How many people died in the bombing?',
      'Which horror film features a hotel?',
      'Which game mode is about zombies?',
      'Who was assassinated at a theatre in 1865?',
      'Which racing driver fell to his death in 1955?',
      'Which rifle is chambered for the 7.62x39mm cartridge?',
    ]) {
      expect(rule(prompt), prompt).toBe('violence');
    }
    expect(rule('Who wrote "To Kill a Mockingbird"?')).toBeNull();
    expect(rule('What kind of animal is a killer whale?')).toBeNull();
    expect(rule('Which band released "Killer Queen"?')).toBeNull();
  });

  it('drops adult and crude themes', () => {
    expect(rule('Which album has a naked baby on the cover?')).toBe('adult or crude themes');
    expect(rule('Which city is famous for its casinos?')).toBe('adult or crude themes');
    expect(rule('Which game was the first to be M-rated?')).toBe('adult or crude themes');
    expect(rule('Which king kept a harem?')).toBe('adult or crude themes');
  });

  it('drops titles made for adults', () => {
    expect(rule('Who directed "Pulp Fiction"?', undefined, FILM)).toBe('title made for adults');
    expect(rule('In "Grand Theft Auto V", which city is the game set in?')).toBe(
      'title made for adults',
    );
    expect(rule('Which house rules the north in Game of Thrones?')).toBe('title made for adults');
  });

  it('knows a title with a possessive or a plural "s" (review round 1)', () => {
    // "Assassin's Creed" folds to "assassins creed": the list must hold it in that form.
    expect(rule('In "Assassin\'s Creed", which city is the first game set in?')).toBe(
      'title made for adults',
    );
    expect(rule('Who is Half-Life\'s silent hero?')).toBe('title made for adults');
    expect(rule('Which of the Sopranos runs the club?')).toBe('title made for adults');
    expect(rule('Who sings soprano in the choir?')).toBeNull();
  });

  it('drops a misspelling that has no safe fix, in the prompt or in an option', () => {
    expect(rule('Which Carribean island is the largest?')).toBe('misspelt');
    expect(rule('Which is it?', ['Bismark', 'Paris', 'Rome', 'Madrid'])).toBe('misspelt');
    expect(rule('Which Caribbean island is the largest?')).toBeNull();
  });

  it('tries titles that are also ordinary words, and gun talk, only on video game questions', () => {
    expect(rule('In "Fallout", what is the currency?', undefined, VIDEO_GAMES)).toBe(
      'title made for adults',
    );
    expect(rule('What is nuclear fallout?')).toBeNull();
    expect(rule('What causes iron to rust?')).toBeNull();
    expect(rule('Which sniper rifle is strongest?', undefined, VIDEO_GAMES)).toBe('violence');
    expect(rule('Which weapon is a halberd?')).toBeNull();
  });

  it('distinguishes the fish and harmless pill uses from adult subjects (RZ-023)', () => {
    expect(rule('Which fish is used?', ['Cod', 'Haddock', 'Salmon', 'Trout'])).toBeNull();
    expect(rule('What were the Cod Wars?')).toBeNull();
    expect(rule('Which fish can you catch?', ['Cod', 'Salmon', 'Trout', 'Tuna'], VIDEO_GAMES)).toBeNull();
    expect(rule('In CoD, which map is it?', undefined, VIDEO_GAMES)).toBe('title made for adults');
    expect(rule('Who developed Call of Duty?')).toBe('title made for adults');
    expect(rule('What is a pill bug?')).toBeNull();
    expect(rule('What is a birth control pill?')).toBe('adult or crude themes');
    expect(rule('What is an ecstasy pill?')).toBe('adult or crude themes');
  });

  it('says which words hit' , () => {
    expect(screenQuestion(asked('Who is the current king of Sweden?'), GENERAL)).toEqual({
      rule: 'dated wording',
      match: 'current',
    });
  });
});
