export const currencyOptions = [
  ["PHP", "Philippine peso"],
  ["BDT", "Bangladeshi taka"],
  ["CNY", "Chinese yuan"],
  ["HKD", "Hong Kong dollar"],
  ["INR", "Indian rupee"],
  ["IDR", "Indonesian rupiah"],
  ["JPY", "Japanese yen"],
  ["KHR", "Cambodian riel"],
  ["KRW", "South Korean won"],
  ["LAK", "Lao kip"],
  ["LKR", "Sri Lankan rupee"],
  ["MMK", "Myanmar kyat"],
  ["MNT", "Mongolian tögrög"],
  ["MOP", "Macanese pataca"],
  ["MYR", "Malaysian ringgit"],
  ["NPR", "Nepalese rupee"],
  ["PKR", "Pakistani rupee"],
  ["SGD", "Singapore dollar"],
  ["THB", "Thai baht"],
  ["TWD", "New Taiwan dollar"],
  ["VND", "Vietnamese dong"],
  ["USD", "US dollar"],
] as const;

export function isValidCurrencyCode(currency: string) {
  if (!/^[A-Z]{3}$/.test(currency)) return false;

  try {
    new Intl.NumberFormat("en-PH", { style: "currency", currency });
    return true;
  } catch {
    return false;
  }
}

export function formatCurrency(value: number, currency = "PHP") {
  try {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${new Intl.NumberFormat("en-PH").format(value)}`;
  }
}