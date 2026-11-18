import { webkit, chromium } from 'playwright';
for (const [name, engine] of [['webkit', webkit], ['chromium', chromium]]) {
  const b = await engine.launch(); const p = await (await b.newContext()).newPage();
  await p.goto('about:blank');
  const r = await p.evaluate(async () => {
    const out = { hasRTC: typeof RTCPeerConnection };
    try {
      const a = new RTCPeerConnection(), c = new RTCPeerConnection();
      const cands = [];
      a.onicecandidate = e => { if (e.candidate) { cands.push(e.candidate.candidate.split(' ').slice(4,8).join(' ')); c.addIceCandidate(e.candidate); } };
      c.onicecandidate = e => e.candidate && a.addIceCandidate(e.candidate);
      const ch = a.createDataChannel('t');
      const opened = new Promise(res => { ch.onopen = () => res('open'); setTimeout(() => res('timeout:' + a.iceConnectionState), 8000); });
      await a.setLocalDescription(await a.createOffer()); await c.setRemoteDescription(a.localDescription);
      await c.setLocalDescription(await c.createAnswer()); await a.setRemoteDescription(c.localDescription);
      out.channel = await opened; out.candidates = cands.slice(0, 4);
    } catch (e) { out.err = String(e); }
    return out;
  });
  console.log(name, b.version(), JSON.stringify(r)); await b.close();
}
