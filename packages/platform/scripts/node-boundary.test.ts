import { expect, it } from 'vitest';
import ts from 'typescript';
import { resolve } from 'node:path';
it('platform source has no Node or timer globals (PLAT-030, NFR-TEST)', () => {
  const file = resolve('packages/platform/src/__node_boundary_probe.ts');
  const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2023, lib: ['lib.es2023.d.ts'], types: [],
    module: ts.ModuleKind.Preserve, moduleResolution: ts.ModuleResolutionKind.Bundler, noEmit: true, skipLibCheck: true, strict: true };
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host), exists = host.fileExists.bind(host);
  host.fileExists = (path) => path === file || exists(path);
  host.readFile = (path) => path === file ? "import './index'; import './harness/index'; setTimeout(() => {}, 0); process.exitCode = 1;" : read(path);
  const program = ts.createProgram([file], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).filter((d) => d.file?.fileName === file);
  const messages = diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  expect(messages).toHaveLength(2);
  expect(messages.some((m) => m.includes("Cannot find name 'setTimeout'"))).toBe(true);
  expect(messages.some((m) => m.includes("Cannot find name 'process'"))).toBe(true);
});
