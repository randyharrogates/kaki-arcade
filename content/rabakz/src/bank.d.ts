declare module 'virtual:rabakz-bank' {
  import type { BankIndex } from '@kaki/content-rabakz';
  const bank: { index: BankIndex; files: readonly { name: string; text: string }[] };
  export default bank;
}
