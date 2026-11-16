import * as fs from 'node:fs';
import { expect, it } from 'vitest';
import { makePlayers } from '@kaki/platform/kit';
import { DEFAULT_SETTINGS, QUESTION_DATA, questionData, rabakz } from '../index';
import type { Question } from '../index';

interface BankFile {
  category: string;
  questions: {
    id: string;
    prompt: string;
    options: [string, string, string, string];
    answer: string;
    difficulty: Question['difficulty'];
  }[];
}
it('RZ-026 uniformly positions correct answers across real bank questions and seeds', () => {
  // Read fixtures as data: production rules never import the content package.
  const folder = 'content/rabakz/src/questions';
  const questions: Question[] = [];
  for (const name of fs.readdirSync(folder).sort((a, b) => a.localeCompare(b))) {
    const file = JSON.parse(fs.readFileSync(`${folder}/${name}`, 'utf8')) as BankFile;
    for (const q of file.questions) {
      if ((q.options as readonly string[]).length !== 4) continue;
      questions.push({ id: q.id, prompt: q.prompt, options: q.options,
        correct: q.options.indexOf(q.answer), category: file.category,
        difficulty: q.difficulty, type: 'multiple-choice', region: 'general' });
    }
  }
  expect(questions.length).toBeGreaterThan(1500);
  const counts = [0, 0, 0, 0];
  for (let seed = 0; seed < 40; seed += 1) {
    for (let offset = 0; offset < questions.length; offset += 10) {
      const chosen = questions.slice(offset, offset + 10);
      if (chosen.length < 10) break;
      const state = rabakz.init(seed, makePlayers(1, false), DEFAULT_SETTINGS, {
        data: { [QUESTION_DATA]: questionData(chosen) }, saved: null, teams: false,
      });
      for (const q of state.questions) {
        counts[q.correct] = (counts[q.correct] ?? 0) + 1;
        expect(q.options[q.correct]).toBe(
          chosen.find((original) => original.id === q.id)?.options[
            chosen.find((original) => original.id === q.id)?.correct ?? 0]);
      }
    }
  }
  const total = counts.reduce((sum, count) => sum + count, 0);
  for (const count of counts) expect(count / total).toBeGreaterThan(0.24);
  for (const count of counts) expect(count / total).toBeLessThan(0.26);
});
