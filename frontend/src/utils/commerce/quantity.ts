const wholeQuantityUnits = new Set([
  "item",
  "piece",
  "pair",
  "packet",
  "box",
  "carton",
  "crate",
  "bottle",
  "can",
  "bag",
  "sack",
  "bundle",
  "set",
  "dozen",
  "roll",
]);

function isWholeQuantityUnit(unit: string | null | undefined) {
  return wholeQuantityUnits.has((unit ?? "").trim().toLowerCase());
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
