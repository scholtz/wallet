const base642base64url = (input: string) => {
  return input.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
export default base642base64url;
