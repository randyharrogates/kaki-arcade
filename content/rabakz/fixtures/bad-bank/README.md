# bad-bank fixture

A small bank with one fault per question, used by `scripts/build.test.ts` and to regenerate
`uat/evidence/R-10-question-schema/fail-build.txt`:

```
pnpm --filter @kaki/content-rabakz build -- --sources fixtures/bad-bank/questions \
  --pictures fixtures/bad-bank/pictures --blocklist fixtures/bad-bank/blocklist.txt --out <an empty folder>
```

`good.json` is valid. `wrong.json` has the faults, each named by its question id. `twice.json`
repeats a key and `broken.json` is not JSON. The picture files are fakes: `statue.jpg` and
`spare.jpg` carry a JPEG signature, `renamed.jpg` a PNG one, `notes.jpg` is text, `empty.jpg`
is empty and `huge.jpg` is one byte over the 150 KB limit.
