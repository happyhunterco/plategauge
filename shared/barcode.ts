/** Barcode helpers: every product can be listed under UPC-A, EAN-13 or GTIN-14 depending on the database. */

const digits = (s: string) => s.replace(/\D/g, '');

export function checkDigitValid(code: string): boolean {
  const d = digits(code);
  if (![8, 12, 13, 14].includes(d.length)) return false;
  const body = d.slice(0, -1).split('').reverse().map(Number);
  const sum = body.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(d[d.length - 1]);
}

/** UPC-E (8 digits, starting 0 or 1) → UPC-A */
export function upcEtoA(e: string): string | null {
  const d = digits(e);
  if (d.length !== 8 || !/^[01]/.test(d)) return null;
  const [ns, x1, x2, x3, x4, x5, x6, check] = d.split('');
  let body: string;
  if (['0', '1', '2'].includes(x6)) body = `${x1}${x2}${x6}0000${x3}${x4}${x5}`;
  else if (x6 === '3') body = `${x1}${x2}${x3}00000${x4}${x5}`;
  else if (x6 === '4') body = `${x1}${x2}${x3}${x4}00000${x5}`;
  else body = `${x1}${x2}${x3}${x4}${x5}0000${x6}`;
  return `${ns}${body}${check}`;
}

/** All the forms a product might be stored under, most likely first. */
export function barcodeVariants(raw: string): string[] {
  let d = digits(raw);
  const out: string[] = [];
  const push = (v: string | null | undefined) => v && !out.includes(v) && out.push(v);
  if (d.length === 8) push(upcEtoA(d));
  push(d);
  if (d.length === 8 && upcEtoA(d)) d = upcEtoA(d)!;
  if (d.length === 12) {
    push(`0${d}`);
    push(`00${d}`);
  }
  if (d.length === 13) {
    if (d.startsWith('0')) push(d.slice(1));
    push(`0${d}`);
  }
  if (d.length === 14 && d.startsWith('0')) {
    push(d.slice(1));
    if (d.startsWith('00')) push(d.slice(2));
  }
  return out;
}
