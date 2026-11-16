// pnpm --filter @kaki/content-rabakz build [-- --strict] [--out <folder>]
//                                          [--sources <folder>] [--pictures <folder>] [--blocklist <file>]
//
// Validates every source file and writes generated/: one chunk per category, index.json and
// the pictures in use. --strict also fails on warnings. --out must be a new or empty folder,
// or the output of an earlier build; only that build's own files are replaced.

import { runBuildCommand } from './io';

const result = runBuildCommand(process.argv.slice(2));
process.stdout.write(result.text);
process.exitCode = result.code;
