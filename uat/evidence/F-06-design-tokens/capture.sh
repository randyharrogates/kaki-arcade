#!/bin/sh
# Re-takes every screenshot in this folder from packages/ui/specimen.html with headless
# Chromium (no server, no network: the page is one file). Run from the repository root:
#   CHROME=/path/to/chrome-headless-shell sh uat/evidence/F-06-design-tokens/capture.sh
# Then: python3 uat/evidence/F-06-design-tokens/strips.py
set -eu
out="uat/evidence/F-06-design-tokens"
page="file://$PWD/packages/ui/specimen.html"
shot() { # name width height query
  "$CHROME" --headless --hide-scrollbars --force-device-scale-factor=1 --window-size="$2,$3" \
    --screenshot="$out/$1.png" "$page?$4" >/dev/null 2>&1
  echo "$1.png"
}
n=1
for theme in console rabakz peek-poker tabao-rush; do
  shot "0$n-tv-$theme-1-surfaces" 1920 1080 "theme=$theme&view=1"
  shot "0$n-tv-$theme-2-players-phone" 1920 1080 "theme=$theme&view=2"
  shot "0$n-tv-$theme-3-motion" 1920 1080 "theme=$theme&view=3"
  shot "0$n-phone-$theme-controller" 844 390 "theme=$theme"
  shot "0$n-phone-$theme-answers" 844 390 "theme=$theme&view=answers"
  n=$((n + 1))
done
# Awkward paths: a larger phone (buttons grow), a smaller one (floors hold), reduced motion.
shot "05-phone-large-932x430-controller" 932 430 "theme=tabao-rush"
shot "05-phone-small-667x375-controller" 667 375 "theme=tabao-rush"
shot "06-tv-console-3-motion-reduced-held-at-half" 1920 1080 "theme=console&view=3&rm=1&freeze=0.5"
# Frames for the strips: every motion held at nine points from start to end.
mkdir -p "$out/frames"
for f in 0 0.125 0.25 0.375 0.5 0.625 0.75 0.875 1; do
  shot "frames/console-$f" 1920 1080 "theme=console&view=3&freeze=$f"
  shot "frames/peek-poker-$f" 1920 1080 "theme=peek-poker&view=3&freeze=$f"
done
