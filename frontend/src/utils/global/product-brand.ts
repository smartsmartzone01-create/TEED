function frontendBrandText(value: string) {
  return value
    .replace(/\bTEED\b/g, "Tunakuza")
    .replace(/\bTD\b/g, "Tunakuza");
}

export { frontendBrandText };
