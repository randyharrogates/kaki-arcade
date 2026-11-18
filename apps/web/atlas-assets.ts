import { readFileSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

interface Manifest { atlases: { full: { file: string }; half: { file: string } }[] }
/** Pipeline names already contain content hashes. Keep them relative to Vite's manifest. */
export function publishAtlases(source: string, manifestFile: string, read: (file: string) => Uint8Array,
  emit: (fileName: string, source: Uint8Array) => void) {
  const manifest = JSON.parse(source) as Manifest;
  const files = new Set(manifest.atlases.flatMap(atlas => [atlas.full.file, atlas.half.file]));
  for (const file of files) {
    if (!/^[\w.-]+\.webp$/.test(file)) throw new Error(`Invalid atlas filename: ${file}`);
    emit(posix.join(posix.dirname(manifestFile), file), read(file));
  }
}

/** Build-only publication does not add imports to the host or controller graphs. */
export function atlasAssets(): Plugin {
  const manifestPath = fileURLToPath(new URL('../../assets/dist/manifest.json', import.meta.url));
  return {
    name: 'publish-pipeline-atlases',
    apply: 'build',
    generateBundle(_options, bundle) {
      const source = readFileSync(manifestPath, 'utf8');
      const manifests = Object.values(bundle).filter(output => output.type === 'asset' &&
        String(output.source) === source);
      if (manifests.length !== 1) throw new Error('Expected one emitted pipeline manifest');
      for (const manifest of manifests) publishAtlases(source, manifest.fileName,
        file => readFileSync(resolve(dirname(manifestPath), file)),
        (fileName, bytes) => { this.emitFile({ type: 'asset', fileName, source: bytes }); });
    },
  };
}
