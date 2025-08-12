export function formatPhoneNumber(number: string): string {
  const cleaned = number.replace(/\D/g, '');
  return `${cleaned}@c.us`;
}
