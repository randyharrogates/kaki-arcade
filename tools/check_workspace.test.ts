import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkWorkspace,
  formatProblem,
  parseJsonc,
  readWorkspace,
  run,
  workspacePatterns,
} from './check_workspace.mjs';

type Snapshot = Parameters<typeof checkWorkspace>[0];
type Folder = Snapshot['folders'][number];

const SPLIT = {
  'tsconfig.json': ['./tsconfig.lib.json', './tsconfig.test.json'],
  'tsconfig.lib.json': [],
  'tsconfig.test.json': ['./tsconfig.lib.json'],
};

const folder = (dir: string, over: Partial<Folder> = {}): Folder => ({
  dir,
  name: `@kaki/${dir.split('/')[1] ?? dir}`,
  workspaceDeps: [],
  tsconfigs: SPLIT,
  hasTypeScript: true,
  ...over,
});

const snapshot = (folders: Folder[], buildReferences?: string[]): Snapshot => ({
  buildReferences: buildReferences ?? ['./tsconfig.json', ...folders.map((f) => f.dir)],
  folders,
});

const lines = (s: Snapshot) => checkWorkspace(s).map(formatProblem);

describe('checkWorkspace', () => {
  it('passes a workspace where everything is referenced', () => {
    const netcode = folder('packages/netcode', {
      workspaceDeps: [{ name: '@kaki/protocol', dev: false }],
      tsconfigs: { ...SPLIT, 'tsconfig.lib.json': ['../protocol/tsconfig.lib.json'] },
    });
    expect(checkWorkspace(snapshot([folder('packages/protocol'), netcode]))).toEqual([]);
  });

  it('accepts a reference written as a folder, with ./ or as its tsconfig.json', () => {
    const folders = [folder('apps/web'), folder('apps/signal'), folder('games/rabakz')];
    const references = ['tsconfig.json', './apps/web/', 'apps/signal/tsconfig.json', 'games\\rabakz'];
    expect(checkWorkspace(snapshot(folders, references))).toEqual([]);
  });

  it('fails when tsconfig.build.json does not reference the root project', () => {
    expect(lines(snapshot([], []))).toEqual([
      'tsconfig.build.json  root-project  add { "path": "./tsconfig.json" } to "references": without it the root config files, tools/, uat/ and spikes/ are never type-checked',
    ]);
  });

  it('fails when a workspace folder with a tsconfig.json is not built, and says which line to add', () => {
    const folders = [folder('packages/protocol'), folder('apps/web')];
    expect(lines(snapshot(folders, ['./tsconfig.json', 'packages/protocol']))).toEqual([
      'tsconfig.build.json  build-reference  add { "path": "apps/web" } to "references": apps/web has a tsconfig.json but is never type-checked or built',
    ]);
  });

  it('flags a folder with a tsconfig.json even when it has no package.json', () => {
    const bare = folder('apps/web', { name: null });
    expect(checkWorkspace(snapshot([bare], ['./tsconfig.json'])).map((p) => p.rule)).toEqual([
      'build-reference',
    ]);
  });

  it('fails when a workspace folder holds TypeScript but has no tsconfig.json', () => {
    const web = folder('apps/web', { tsconfigs: {} });
    expect(lines(snapshot([web]))).toEqual([
      'apps/web/tsconfig.json  no-tsconfig  create it (copy the tsconfig*.json files from packages/protocol) and add { "path": "apps/web" } to "references" in tsconfig.build.json: apps/web holds TypeScript that nothing type-checks',
    ]);
  });

  it('leaves alone a package with no TypeScript, and tools/ packages the root project covers', () => {
    const data = folder('content/rabakz', { tsconfigs: {}, hasTypeScript: false });
    const perf = folder('tools/perf', { tsconfigs: {} });
    expect(checkWorkspace(snapshot([data, perf]))).toEqual([]);
  });

  it('fails when a sibling tsconfig is not referenced from the folder tsconfig.json', () => {
    const ui = folder('packages/ui', {
      tsconfigs: {
        'tsconfig.json': ['./tsconfig.lib.json'],
        'tsconfig.lib.json': [],
        'tsconfig.node.json': [],
        'tsconfig.test.json': ['./tsconfig.lib.json'],
      },
    });
    expect(lines(snapshot([ui]))).toEqual([
      'packages/ui/tsconfig.json  sibling-reference  add { "path": "./tsconfig.node.json" } to "references": packages/ui/tsconfig.node.json is otherwise never loaded',
      'packages/ui/tsconfig.json  sibling-reference  add { "path": "./tsconfig.test.json" } to "references": packages/ui/tsconfig.test.json is otherwise never loaded',
    ]);
  });

  it('fails when a workspace dependency has no project reference, and says which line to add', () => {
    const netcode = folder('packages/netcode', {
      workspaceDeps: [{ name: '@kaki/protocol', dev: false }],
    });
    expect(lines(snapshot([folder('packages/protocol'), netcode]))).toEqual([
      'packages/netcode/tsconfig.lib.json  dependency-reference  add { "path": "../protocol/tsconfig.lib.json" } to "references": @kaki/netcode depends on @kaki/protocol (workspace:) but has no project reference to it',
    ]);
  });

  it('does not accept a reference to the wrong project of the dependency', () => {
    const netcode = folder('packages/netcode', {
      workspaceDeps: [{ name: '@kaki/protocol', dev: false }],
      tsconfigs: { ...SPLIT, 'tsconfig.lib.json': ['../protocol'] },
    });
    const problems = checkWorkspace(snapshot([folder('packages/protocol'), netcode]));
    expect(problems.map((p) => p.rule)).toEqual(['dependency-reference']);
  });

  it('does not accept a runtime dependency referenced only from the test project', () => {
    const netcode = folder('packages/netcode', {
      workspaceDeps: [{ name: '@kaki/protocol', dev: false }],
      tsconfigs: { ...SPLIT, 'tsconfig.test.json': ['./tsconfig.lib.json', '../protocol/tsconfig.lib.json'] },
    });
    const problems = checkWorkspace(snapshot([folder('packages/protocol'), netcode]));
    expect(problems.map((p) => p.file)).toEqual(['packages/netcode/tsconfig.lib.json']);
  });

  it('wants a dev dependency referenced from the test project, or from the library project', () => {
    const dev = [{ name: '@kaki/sim-core', dev: true }];
    const core = folder('packages/sim-core');
    const missing = folder('games/rabakz', { workspaceDeps: dev });
    expect(lines(snapshot([core, missing]))).toEqual([
      'games/rabakz/tsconfig.test.json  dependency-reference  add { "path": "../../packages/sim-core/tsconfig.lib.json" } to "references": @kaki/rabakz depends on @kaki/sim-core (workspace:) but has no project reference to it',
    ]);
    const viaTest = folder('games/rabakz', {
      workspaceDeps: dev,
      tsconfigs: {
        ...SPLIT,
        'tsconfig.test.json': ['./tsconfig.lib.json', '../../packages/sim-core/tsconfig.lib.json'],
      },
    });
    const viaLib = folder('games/rabakz', {
      workspaceDeps: dev,
      tsconfigs: { ...SPLIT, 'tsconfig.lib.json': ['../../packages/sim-core/tsconfig.lib.json'] },
    });
    expect(checkWorkspace(snapshot([core, viaTest]))).toEqual([]);
    expect(checkWorkspace(snapshot([core, viaLib]))).toEqual([]);
  });

  it('handles packages that keep a single tsconfig.json', () => {
    const single = { 'tsconfig.json': [] };
    const a = folder('packages/a', { tsconfigs: single });
    const b = folder('packages/b', {
      tsconfigs: single,
      workspaceDeps: [{ name: '@kaki/a', dev: false }],
    });
    expect(lines(snapshot([a, b]))).toEqual([
      'packages/b/tsconfig.json  dependency-reference  add { "path": "../a" } to "references": @kaki/b depends on @kaki/a (workspace:) but has no project reference to it',
    ]);
    const fixed = folder('packages/b', {
      tsconfigs: { 'tsconfig.json': ['../a/tsconfig.json'] },
      workspaceDeps: [{ name: '@kaki/a', dev: false }],
    });
    expect(checkWorkspace(snapshot([a, fixed]))).toEqual([]);
  });

  it('ignores a workspace dependency that has no TypeScript project', () => {
    const data = folder('content/rabakz', {
      name: '@kaki/content-rabakz',
      tsconfigs: {},
      hasTypeScript: false,
    });
    const game = folder('games/rabakz', {
      workspaceDeps: [{ name: '@kaki/content-rabakz', dev: false }],
    });
    expect(checkWorkspace(snapshot([data, game]))).toEqual([]);
  });
});

describe('reading files', () => {
  it('parses tsconfig JSON with comments and trailing commas', () => {
    const text = '{\n  // why\n  "a": "x // not a comment", /* and */\n  "b": [1, 2,],\n}';
    expect(parseJsonc(text)).toEqual({ a: 'x // not a comment', b: [1, 2] });
  });

  it('reads the packages list from pnpm-workspace.yaml', () => {
    const yaml = [
      '# comment',
      'packages:',
      '  - "apps/*"',
      "  - 'packages/*'",
      '  # a note',
      '  - games/*   # trailing',
      '',
      'engineStrict: true',
      '  - not/this',
    ].join('\n');
    expect(workspacePatterns(yaml)).toEqual(['apps/*', 'packages/*', 'games/*']);
  });
});

describe('scanning a tree', () => {
  const roots: string[] = [];
  const makeTree = (files: Record<string, unknown>) => {
    const root = mkdtempSync(join(tmpdir(), 'check-workspace-'));
    roots.push(root);
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), typeof content === 'string' ? content : JSON.stringify(content));
    }
    return root;
  };
  const refs = (...paths: string[]) => ({ files: [], references: paths.map((path) => ({ path })) });
  const base = {
    'pnpm-workspace.yaml': 'packages:\n  - "apps/*"\n  - "packages/*"\n  - "content/*"\n',
    'packages/protocol/package.json': { name: '@kaki/protocol' },
    'packages/protocol/tsconfig.json': refs('./tsconfig.lib.json'),
    'packages/protocol/tsconfig.lib.json': {},
    'packages/protocol/src/index.ts': 'export {};',
    'packages/notes/README.md': 'not a package',
    'packages/protocol/node_modules/x/index.ts': 'export {};',
  };

  afterEach(() => {
    vi.restoreAllMocks();
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it('exits 0 and reports the folder count on a sound tree', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const root = makeTree({ ...base, 'tsconfig.build.json': refs('./tsconfig.json', 'packages/protocol') });
    expect(readWorkspace(root).folders.map((f) => f.dir)).toEqual(['packages/protocol']);
    expect(run(root)).toBe(0);
    expect(log.mock.calls).toEqual([['workspace check passed: 1 folder(s)']]);
  });

  it('exits 1 and prints each problem for an unreferenced app and a missing dependency reference', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const root = makeTree({
      ...base,
      'tsconfig.build.json': '{\n  // solution\n  "files": [],\n  "references": [{ "path": "./tsconfig.json" }, { "path": "packages/protocol" },],\n}',
      'apps/web/package.json': { name: '@kaki/web', dependencies: { '@kaki/protocol': 'workspace:*', preact: '^10.0.0' } },
      'apps/web/tsconfig.json': {},
      'apps/web/src/main.ts': 'export const n: number = "x";',
    });
    expect(run(root)).toBe(1);
    expect(error.mock.calls.map((call) => String(call[0]))).toEqual([
      'tsconfig.build.json  build-reference  add { "path": "apps/web" } to "references": apps/web has a tsconfig.json but is never type-checked or built',
      'apps/web/tsconfig.json  dependency-reference  add { "path": "../../packages/protocol/tsconfig.lib.json" } to "references": @kaki/web depends on @kaki/protocol (workspace:) but has no project reference to it',
      'workspace check failed: 2 problem(s)',
    ]);
  });

  it('refuses a workspace pattern it cannot read rather than skipping it', () => {
    const root = makeTree({ ...base, 'pnpm-workspace.yaml': 'packages:\n  - "packages/**"\n', 'tsconfig.build.json': refs() });
    expect(() => readWorkspace(root)).toThrow(/not understood/);
  });

  it('passes on this repository', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    expect(checkWorkspace(readWorkspace(root))).toEqual([]);
  });
});
