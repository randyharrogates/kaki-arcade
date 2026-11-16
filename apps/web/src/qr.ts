import qrcode from 'qrcode-generator';
export function qrPath(payload: string) {
  const qr = qrcode(0, 'M');
  qr.addData(payload); qr.make();
  const size = qr.getModuleCount();
  const quiet = 4;
  let path = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (qr.isDark(y, x)) path += `M${String(x + quiet)} ${String(y + quiet)}h1v1h-1z`;
  }
  return { path, modules: size, quiet, level: 'M', size: size + quiet * 2 };
}
