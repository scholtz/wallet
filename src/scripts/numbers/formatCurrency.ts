import formatCurrencyBigInt from "./formatCurrencyBigInt";

const formatCurrency = (
  value: bigint | number = 0,
  currency = "",
  minimumFractionDigits = 6,
  multiply = true,
  language = undefined
) => {
  if (typeof value === "bigint")
    return formatCurrencyBigInt(
      value,
      currency,
      minimumFractionDigits,
      multiply,
      language
    );
  if (multiply) {
    value = value / Math.pow(10, minimumFractionDigits);
  }
  const formatter = new Intl.NumberFormat(language, {
    minimumFractionDigits,
  });
  return formatter.format(value) + " " + currency;
};

export default formatCurrency;
