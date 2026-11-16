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
    plugins: [preact()],
    clearScreen: false,
    server: { host: env.KAKI_HOST ?? process.env.KAKI_HOST ?? ((env.KAKI_JOIN_ORIGIN ?? process.env.KAKI_JOIN_ORIGIN) ? '0.0.0.0' : 'localhost'), port: Number(env.KAKI_PORT_WEB ?? process.env.KAKI_PORT_WEB ?? 5150), strictPort: true },
    define: {
      'import.meta.env.KAKI_SIGNAL_URL': JSON.stringify(signalUrl),
      'import.meta.env.KAKI_JOIN_ORIGIN': JSON.stringify(env.KAKI_JOIN_ORIGIN ?? process.env.KAKI_JOIN_ORIGIN ?? ''),
    },
    build: { manifest: true, emptyOutDir: true },
  };
});
