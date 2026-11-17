import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'KAKI_');
  const signalUrl = env.KAKI_SIGNAL_URL ?? process.env.KAKI_SIGNAL_URL ?? (command === 'serve' ? 'http://localhost:5151' : '');
  if (signalUrl) {
    try {
      const url = new URL(signalUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
    } catch { throw new Error('KAKI_SIGNAL_URL must be an absolute HTTP(S) URL; omit it for same-origin production signalling.'); }
  }
  return {
    plugins: [preact(), {
      name: 'picker-production-fixture-scan',
      apply: 'build',
      generateBundle(_options, bundle) {
        // Extend the existing budget scanner within C-09's app lane.
        for (const [file, output] of Object.entries(bundle)) {
          const source = output.type === 'chunk' ? output.code : String(output.source);
          if (/["'`]demo["'`]|pickerDemo|pickerDemoChange|picker-demo-change|data-layout="[ac]"|data-art="placeholder"|repeating-linear-gradient\(135deg|picker-leader|picker-watcher|Cloud Noodle|Pebble Puff|demo-seat-|SignalRoom|PeerHub/.test(source)) this.error(`Demo fixture shipped: ${file}`);
        }
      },
    }],
    clearScreen: false,
    server: { host: env.KAKI_HOST ?? process.env.KAKI_HOST ?? ((env.KAKI_JOIN_ORIGIN ?? process.env.KAKI_JOIN_ORIGIN) ? '0.0.0.0' : 'localhost'), port: Number(env.KAKI_PORT_WEB ?? process.env.KAKI_PORT_WEB ?? 5150), strictPort: true },
    define: {
      'import.meta.env.KAKI_SIGNAL_URL': JSON.stringify(signalUrl),
      'import.meta.env.KAKI_JOIN_ORIGIN': JSON.stringify(env.KAKI_JOIN_ORIGIN ?? process.env.KAKI_JOIN_ORIGIN ?? ''),
    },
    build: { manifest: true, emptyOutDir: true },
  };
});
