# C-12 round 5: integrator's look (2026-11-18)

8-phone browser run, exit 0. Opened every host shot (c12-r5-sheet.jpg):
- 02, 07, 11, 12 lobby: no added buttons; hint in the header row ("Enter: pick a game · J: join from this
  keyboard", then "L: leave" once joined); 12 shows Player 1 still in seat 1 and still Leader after
  Quit to picker and Back (D-159).
- 03, 10 picker: no added buttons; "Left and Right: choose · Enter: select · Esc: back" right-aligned
  under the player count, clear of the subtitle and the cards.
- 06 pause panel over play; 07 team setup driven by keys ("Arrows and Enter: choose · Esc: back").
- 08 results: visible focus ring on Play again; "Enter: play again · Esc: game picker".
- 16 (another owner, noted in the slice note): Rabakz 8-player team final, "Enter: Continue" overlaps
  the last ranking row.
Integrator fixes to the script during UAT: the safety check measured a header element's whole box
instead of its drawn text; the picker remembers its focus, so the script now steps to Rabakz by its
heading instead of counting Next presses.
