type CommerceLanguage = "en" | "sw";

type UnitForms = {
  one: string;
  other: string;
};

const measuredQuantityUnits = new Set([
  "meter",
  "kilogram",
  "gram",
  "liter",
  "milliliter",
  "tonne",
]);

const standardUnitForms: Record<CommerceLanguage, Record<string, UnitForms>> = {
  en: {
    piece: { one: "piece", other: "pieces" },
    pair: { one: "pair", other: "pairs" },
    packet: { one: "packet", other: "packets" },
    box: { one: "box", other: "boxes" },
    carton: { one: "carton", other: "cartons" },
    crate: { one: "crate", other: "crates" },
    bottle: { one: "bottle", other: "bottles" },
    can: { one: "can", other: "cans" },
    bag: { one: "bag", other: "bags" },
    sack: { one: "sack", other: "sacks" },
    bundle: { one: "bundle", other: "bundles" },
    set: { one: "set", other: "sets" },
    dozen: { one: "dozen", other: "dozen" },
    roll: { one: "roll", other: "rolls" },
    meter: { one: "metre", other: "metres" },
    kilogram: { one: "kilogram", other: "kilograms" },
    gram: { one: "gram", other: "grams" },
    liter: { one: "litre", other: "litres" },
    milliliter: { one: "millilitre", other: "millilitres" },
    tonne: { one: "tonne", other: "tonnes" },
  },
  sw: {
    piece: { one: "kipande", other: "vipande" },
    pair: { one: "jozi", other: "jozi" },
    packet: { one: "pakiti", other: "pakiti" },
    box: { one: "boksi", other: "maboksi" },
    carton: { one: "katoni", other: "katoni" },
    crate: { one: "kreti", other: "kreti" },
    bottle: { one: "chupa", other: "chupa" },
    can: { one: "kopo", other: "makopo" },
    bag: { one: "mfuko", other: "mifuko" },
    sack: { one: "gunia", other: "magunia" },
    bundle: { one: "fungu", other: "mafungu" },
    set: { one: "seti", other: "seti" },
    dozen: { one: "dazeni", other: "dazeni" },
    roll: { one: "robota", other: "marobota" },
    meter: { one: "mita", other: "mita" },
    kilogram: { one: "kilogramu", other: "kilogramu" },
    gram: { one: "gramu", other: "gramu" },
    liter: { one: "lita", other: "lita" },
    milliliter: { one: "mililita", other: "mililita" },
    tonne: { one: "tani", other: "tani" },
  },
};

function commerceLanguage(locale: string | null | undefined): CommerceLanguage {
  return (locale ?? "").toLowerCase().startsWith("sw") ? "sw" : "en";
}

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

function formatQuantityNumber(
  value: string | number | null | undefined,
  locale: string,
) {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(number)
    : String(value ?? "");
}

function formatUnitName(
  unit: string | null | undefined,
  quantity: string | number,
  locale: string,
) {
  const rawUnit = (unit ?? "").trim();
  if (!rawUnit) return "";

  const number = Number(quantity);
  if (!Number.isFinite(number)) return rawUnit;

  const forms = standardUnitForms[commerceLanguage(locale)][rawUnit.toLowerCase()];
  if (!forms) return rawUnit;

  return Math.abs(number) === 1 ? forms.one : forms.other;
}

function formatQuantityWithUnit(
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
  locale: string,
) {
  const quantityText = formatQuantityNumber(quantity, locale);
  const number = Number(quantity ?? 0);
  const unitText = Number.isFinite(number)
    ? formatUnitName(unit, number, locale)
    : (unit ?? "").trim();

  return [quantityText, unitText].filter(Boolean).join(" ");
}

export {
  acceptsQuantityInput,
  formatQuantityNumber,
  formatQuantityWithUnit,
  formatUnitName,
  isWholeQuantityUnit,
  quantityInputMode,
  quantityInputStep,
};
