/** TR-064: source keys resolve through the packed round manifest, never on cold start. */
export const controllerImages: Readonly<Record<string, string>> = Object.fromEntries(
  ['cap', 'uncle', 'auntie', 'makcik', 'bun', 'specs', 'turban', 'songkok'].flatMap(head => [
    [`cook-${head}`, `tabao-rush/cook-heads/${head}/head-${head}-s.png`],
    [`cook-${head}-mask`, `tabao-rush/phone/cook-${head}-mask.webp`],
  ]),
);
