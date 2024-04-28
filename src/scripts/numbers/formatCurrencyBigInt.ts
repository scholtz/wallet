const formatCurrencyBigInt = (
  value: bigint = 0n,
  currency = "",
  minimumFractionDigits = 6,
  multiply = true,
  language = undefined
) => {
  let valueNumber = 0;
  if (multiply) {
    valueNumber = Number(value) / Number(10 ** Number(minimumFractionDigits));
  }
  const formatter = new Intl.NumberFormat(language, {
    minimumFractionDigits: Number(minimumFractionDigits),
  });
  return formatter.format(valueNumber) + " " + currency;
};
export default formatCurrencyBigInt;
