/** REL-003. Sources and limits are recorded in docs/slices/X-02-tv-help.md. */
export const tvHelpSections = [
  { title: 'Laptop over HDMI — recommended', steps: [
    'Plug the laptop into the TV with an HDMI cable. Set the TV to the input the laptop is plugged into.',
    'Open Kaki Arcade in Chrome, Edge or Safari. Make it full screen: Control + Command + F on Mac, or F11 on Windows (Fn + F11 on some keyboards).',
    'Turn on Game Mode in the TV’s picture settings to reduce delay. The name varies by TV brand.',
    'Keep the laptop plugged into power and awake while you play.',
  ] },
  { title: 'The TV’s own browser — fallback', steps: [
    'Open the browser app on the TV and type the Kaki Arcade address shown below.',
    'It may be slower, or may not open the game. If so, use a laptop over HDMI.',
  ] },
  { title: 'Phones', steps: [
    'Host a game on the big screen, then scan its QR code with each phone.',
    'Phones need an internet connection. If a phone cannot join, connect it to the same Wi-Fi as the big screen and scan again.',
  ] },
] as const;
