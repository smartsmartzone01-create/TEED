const measuredQuantityUnits = new Set([
  "meter",
  "kilogram",
  "gram",
  "liter",
  "milliliter",
  "tonne",
]);

function isWholeQuantityUnit(unit: string | null | undefined) {
  const normalized = (unit ?? "").trim().toLowerCase();
  return Boolean(normalized) && !measuredQuantityUnits.has(normalized);
}

function quantityInputStep(unit: string | null | undefined) {
  return isWholeQuantityUnit(unit) ? "1" : "0.001";
}

function quantityInputMode(unit: string | null | undefined): "numeric" | "decimal" {
  return isWholeQuantityUnit(unit) ? "numeric" : "decimal";
}

function acceptsQuantityInput(value: string, unit: string | null | undefined) {
  if (!isWholeQuantityUnit(unit)) return true;
  return /^\d*$/.test(value);
}

export {
  acceptsQuantityInput,
  isWholeQuantityUnit,
  quantityInputMode,
  quantityInputStep,
};
