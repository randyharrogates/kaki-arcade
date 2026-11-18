/** DATA-001..005, RZ-021. Anonymous counts follow D-180. */
export const legalLinks = { privacy: 'Privacy', credits: 'Credits', home: 'Back to Kaki Arcade' } as const;
export const legalCopy = {
  privacy: {
    title: 'Privacy',
    sections: [
      { title: 'Anonymous counts', text: 'Only your TV or host computer sends counts, never the phones. It counts four problems: matches stopped by an error, games that fail to load, times it cannot reach our server (under-counted, as counts go there too) and lost connections (one per outage). After a match it adds one of four smoothness bands: nearly every frame within 17, 34 or 50 milliseconds, or slower. We keep daily totals with no end date. The TV sends them after results or when the page is hidden or closed, never during play, with no cookies, names, room codes, addresses, device details or the page you came from. We briefly use a scrambled form of its network address to limit how often counts are sent, keeping it only in memory.' },
      { title: 'Room codes', text: 'Room codes are random and hard to guess; we limit how often rooms can be created or joined. To stop abuse, we briefly use a scrambled form of your network address, keeping it only in memory. Rooms expire after 10 minutes with nobody connected, or after 12 hours in total.' },
      { title: 'No sign-up', text: 'You do not need an account or email address; we do not collect personal details.' },
      { title: 'Saved on your TV', text: 'Scores, stars, settings and recently seen questions stay on your TV or host computer only; in browser settings, clear this site’s saved data to reset them.' },
      { title: 'Nicknames', text: 'Nicknames travel only between the devices in your room; our server never sees them. Your devices save a copy in the browser tab to reconnect. Closing the tab clears that saved copy.' },
    ],
  },
  credits: {
    title: 'Credits',
    sections: [
      { title: 'Rabakz questions', text: 'General knowledge questions come from the Open Trivia Database. We chose family-friendly questions, grouped them and fixed spelling and spacing. Our adapted versions of these questions are shared under the same licence (CC BY‑SA 4.0).', links: [{ label: 'Open Trivia Database', href: 'https://opentdb.com' }, { label: 'CC BY‑SA 4.0 licence', href: 'https://creativecommons.org/licenses/by-sa/4.0/' }, { label: 'Download our questions (CC BY‑SA 4.0)', href: '/rabakz/questions.json', download: 'kaki-arcade-rabakz-questions.json' }] },
      { title: 'Singapore questions', text: 'The Singapore pack was written for Kaki Arcade. Each question has a source note so its facts can be checked.' },
      { title: 'Type and sound', text: 'Interface text uses fonts on your device. Card lettering uses DM Sans (SIL Open Font License). Kaki Arcade makes its own sound effects.' },
    ],
  },
} as const;
export type LegalPageName = keyof typeof legalCopy;
