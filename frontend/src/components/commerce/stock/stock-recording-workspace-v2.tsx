"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { StockEditControl } from "@/components/commerce/stock/stock-edit-control";
import {
  StockSkuOptionEditor,
  emptyStockSkuOptionDraft,
  stockSkuOptionDraftsFromOptions,
  stockSkuOptionsFromDrafts,
} from "@/components/commerce/stock/stock-sku-option-editor";
import {
  StockProductSummary,
  StockSummaryActions,
} from "@/components/commerce/stock/stock-summary";
import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { getProducts } from "@/services/commerce/catalog";
import {
  correctStockReceipt,
  createStockReceipt,
  getStockReceipts,
} from "@/services/commerce/inventory";
import { isRequestCancelled } from "@/services/global/api-client";
import type { Product, ProductFamily, ProductVariantOption } from "@/types/commerce/catalog";
import type {
  StockReceipt,
  StockTrackingMode,
  StockUnitDefinition,
} from "@/types/commerce/inventory";

const panel =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950";
const field =
  "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300";
const contextCard =
  "rounded-xl bg-primary/5 px-3.5 py-3 text-sm text-slate-700 dark:bg-primary/10 dark:text-slate-200";
const identifierKinds = [
  "imei",
  "serial",
  "chassis",
  "barcode",
  "engine",
  "registration",
] as const;
const units = [
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
  "meter",
  "kilogram",
  "gram",
  "liter",
  "milliliter",
  "tonne",
] as const;
const countableUnits = new Set(units.slice(0, 14));

type IdentifierKind = (typeof identifierKinds)[number];
type Screen =
  | "products"
  | "newGroup"
  | "groupVarieties"
  | "newVariety"
  | "newSimple"
  | "recording"
  | "itemEntry"
  | "afterVariety"
  | "stockDetails"
  | "review";

type StagedGroup = {
  key: string;
  name: string;
  brand: string;
};

type GroupChoice = {
  key: string;
  familyId: string;
  name: string;
  brand: string;
  staged: boolean;
};

type PreparedProduct = {
  key: string;
  groupKey: string;
  familyId: string;
  familyName: string;
  name: string;
  brand: string;
  variant: string;
  variantOptions: ProductVariantOption[];
  unit: string;
  trackingMode: StockTrackingMode;
};

type ProductChoice = PreparedProduct & {
  existingId: string | null;
  sku: string;
};

type UnitDraft = {
  identifierKind: IdentifierKind;
  identifierValue: string;
};

type LineDraft = {
  productKey: string;
  quantity: string;
  costValue: string;
  trackedUnits: UnitDraft[];
};

type CorrectionDraft = {
  receipt: StockReceipt;
  name: string;
  supplier: string;
  expenses: string;
  lines: Array<{
    id: string;
    name: string;
    quantity: string;
    receivedUnit: string;
    cost: string;
  }>;
};

const localNow = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const emptyUnit = (): UnitDraft => ({
  identifierKind: "serial",
  identifierValue: "",
});

const emptyVariety = () => ({
  options: [emptyStockSkuOptionDraft()],
  unit: "piece",
  trackingMode: "quantity" as StockTrackingMode,
});

const emptySimpleProduct = () => ({
  name: "",
  brand: "",
  unit: "piece",
  trackingMode: "quantity" as StockTrackingMode,
});

const skuOptionSignature = (options: ProductVariantOption[]) =>
  options
    .map((option) => `${option.key.trim().toLocaleLowerCase()}=${option.value.trim().toLocaleLowerCase()}`)
    .sort()
    .join("|");

function HelpTip({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <Tooltip content={children} side="top">
      <button
        aria-label={label}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
        type="button"
      >
        <CircleHelp aria-hidden="true" className="size-4" />
      </button>
    </Tooltip>
  );
}

function FieldTip({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <Tooltip content={children} side="top">
      <button
        aria-label={label}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
        type="button"
      >
        <CircleHelp aria-hidden="true" className="size-3.5" />
      </button>
    </Tooltip>
  );
}

function FieldTitle({
  children,
  help,
  helpLabel,
}: {
  children: React.ReactNode;
  help?: string;
  helpLabel: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 break-words">{children}</span>
      {help ? <FieldTip label={helpLabel}>{help}</FieldTip> : null}
    </span>
  );
}

function ScreenHeader({
  canGoBack,
  help,
  helpLabel,
  onBack,
  title,
}: {
  canGoBack: boolean;
  help?: string;
  helpLabel: string;
  onBack: () => void;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      {canGoBack ? (
        <button
          aria-label={title}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </button>
      ) : (
        <span className="size-8 shrink-0" />
      )}
      <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-950 dark:text-white">
        {title}
      </h2>
      {help ? <HelpTip label={helpLabel}>{help}</HelpTip> : <span className="size-7" />}
    </div>
  );
}

function TrackingChoice({
  description,
  label,
  selected,
  onClick,
}: {
  description: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition ${
        selected
          ? "border-primary bg-primary/5"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`mt-0.5 size-4 shrink-0 rounded-full border-2 ${
          selected
            ? "border-primary bg-primary shadow-[inset_0_0_0_3px_white]"
            : "border-slate-400"
        }`}
      />
      <span className="min-w-0">
        <strong className="block text-sm">{label}</strong>
        <span className="mt-0.5 block text-xs font-normal text-slate-500">
          {description}
        </span>
      </span>
    </button>
  );
}

function StockRecordingWorkspaceV2({
  businessId,
  recordingOpen,
  onRecordingRequested,
  onStageChange,
}: {
  businessId: string;
  recordingOpen: boolean;
  onRecordingRequested?: () => void;
  onStageChange?: (stage: 0 | 1 | 2 | 3) => void;
}) {
  const t = useTranslations("CommerceStockV2");
  const stockT = useTranslations("CommerceStock");
  const commerceT = useTranslations("Commerce");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const sequence = useRef(0);

  const [screen, setScreen] = useState<Screen>("products");
  const [screenStack, setScreenStack] = useState<Screen[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [unitDefinitions, setUnitDefinitions] = useState<StockUnitDefinition[]>([]);
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);

  const [stagedGroups, setStagedGroups] = useState<StagedGroup[]>([]);
  const [preparedProducts, setPreparedProducts] = useState<PreparedProduct[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [lines, setLines] = useState<LineDraft[]>([]);

  const [currentGroupKey, setCurrentGroupKey] = useState("");
  const [currentProductKey, setCurrentProductKey] = useState("");
  const [groupDraft, setGroupDraft] = useState({ name: "", brand: "" });
  const [varietyDraft, setVarietyDraft] = useState(emptyVariety());
  const [simpleDraft, setSimpleDraft] = useState(emptySimpleProduct());
  const [unitDraft, setUnitDraft] = useState<UnitDraft>(emptyUnit());
  const [existingOpen, setExistingOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");

  const [stockName, setStockName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [receivedAt, setReceivedAt] = useState(localNow());
  const [stockExpenses, setStockExpenses] = useState("0");
  const [lateDeliveryParent, setLateDeliveryParent] = useState<StockReceipt | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<StockReceipt | null>(null);
  const [correction, setCorrection] = useState<CorrectionDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const stageForScreen = (next: Screen): 0 | 1 | 2 | 3 => {
    if (next === "stockDetails") return 0;
    if (next === "recording" || next === "itemEntry") return 2;
    if (next === "review") return 3;
    return 1;
  };

  const showScreen = (next: Screen, push = true) => {
    if (push) setScreenStack((current) => [...current, screen]);
    setScreen(next);
    onStageChange?.(stageForScreen(next));
  };

  const goBack = () => {
    setScreenStack((current) => {
      const next = [...current];
      const previous = next.pop() ?? "products";
      setScreen(previous);
      onStageChange?.(stageForScreen(previous));
      return next;
    });
  };

  const goHome = () => {
    setScreenStack([]);
    setScreen("products");
    onStageChange?.(1);
  };

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      try {
        const [productResponse, stockResponse] = await Promise.all([
          getProducts(businessId, accessToken, signal),
          getStockReceipts(businessId, accessToken, signal),
        ]);
        setProducts(productResponse.data?.products ?? []);
        setFamilies(productResponse.data?.families ?? []);
        const stockData = stockResponse.data as {
          receipts?: StockReceipt[];
          units?: StockUnitDefinition[];
        } | null;
        setReceipts(stockData?.receipts ?? []);
        setUnitDefinitions(stockData?.units ?? []);
      } catch (reason) {
        if (!isRequestCancelled(reason)) {
          notify({
            message:
              reason instanceof Error ? reason.message : commerceT("errors.load"),
            tone: "error",
          });
        }
      }
    },
    [accessToken, businessId, commerceT, notify],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const groups = useMemo<GroupChoice[]>(
    () => [
      ...families.map((family) => ({
        key: `family:${family.id}`,
        familyId: family.id,
        name: family.name,
        brand: family.brand,
        staged: false,
      })),
      ...stagedGroups.map((group) => ({
        key: group.key,
        familyId: "",
        name: group.name,
        brand: group.brand,
        staged: true,
      })),
    ],
    [families, stagedGroups],
  );

  const choices = useMemo<ProductChoice[]>(
    () => [
      ...products
        .filter((product) => product.is_active)
        .map((product) => ({
          key: `existing:${product.id}`,
          existingId: product.id,
          groupKey: product.family ? `family:${product.family}` : "",
          familyId: product.family ?? "",
          familyName: product.family_name ?? "",
          name: product.name,
          brand: product.brand,
          variant: product.variant,
          variantOptions: product.variant_options ?? [],
          unit: product.unit || "piece",
          trackingMode: product.tracking_mode,
          sku: product.sku,
        })),
      ...preparedProducts.map((product) => ({
        ...product,
        existingId: null,
        sku: t("values.autoSku"),
      })),
    ],
    [preparedProducts, products, t],
  );

  const availableUnits = useMemo(
    () => [
      ...units.map((unit) => ({
        key: unit,
        label: commerceT(`units.${unit}`),
      })),
      ...unitDefinitions
        .filter((unit) => !units.includes(unit.name as (typeof units)[number]))
        .map((unit) => ({ key: unit.name, label: unit.name })),
    ],
    [commerceT, unitDefinitions],
  );

  const currentGroup = groups.find((group) => group.key === currentGroupKey);
  const currentChoice = choices.find((choice) => choice.key === currentProductKey);
  const currentLine = lines.find((line) => line.productKey === currentProductKey);
  const existingSimpleChoices = choices.filter(
    (choice) => !choice.groupKey && Boolean(choice.existingId),
  );

  const normalizedGroupSearch = groupSearch.trim().toLocaleLowerCase();
  const filteredGroups = normalizedGroupSearch
    ? groups.filter((group) =>
        `${group.name} ${group.brand}`.toLocaleLowerCase().includes(normalizedGroupSearch),
      )
    : groups;
  const filteredSimpleChoices = normalizedGroupSearch
    ? existingSimpleChoices.filter((choice) =>
        `${choice.name} ${choice.brand} ${choice.variant}`
          .toLocaleLowerCase()
          .includes(normalizedGroupSearch),
      )
    : existingSimpleChoices;

  const varietiesForGroup = (groupKey: string) =>
    choices.filter((choice) => choice.groupKey === groupKey);

  const varietyLabel = (choice: ProductChoice) =>
    choice.variantOptions.length
      ? choice.variantOptions.map((option) => option.value).join(" · ")
      : choice.variant.trim() || choice.name.trim();

  const groupCount = (groupKey: string) => varietiesForGroup(groupKey).length;

  const lineCount = (line?: LineDraft) => {
    if (!line) return 0;
    const quantity = Number(line.quantity);
    return Number.isFinite(quantity) && quantity > 0 && Number.isInteger(quantity)
      ? quantity
      : 0;
  };

  const ensureSelected = (choice: ProductChoice) => {
    setSelectedKeys((current) =>
      current.includes(choice.key) ? current : [...current, choice.key],
    );
    setLines((current) =>
      current.some((line) => line.productKey === choice.key)
        ? current
        : [
            ...current,
            {
              productKey: choice.key,
              quantity: "1",
              costValue: "",
              trackedUnits: [],
            },
          ],
    );
  };

  const openGroup = (groupKey: string) => {
    setCurrentGroupKey(groupKey);
    setCurrentProductKey("");
    setVarietyDraft(emptyVariety());
    showScreen("groupVarieties");
  };

  const toggleExistingGroups = () => {
    setExistingOpen((current) => !current);
    setGroupSearch("");
  };

  const beginNewGroup = () => {
    setGroupDraft({ name: "", brand: "" });
    showScreen("newGroup");
  };

  const createGroup = (event: FormEvent) => {
    event.preventDefault();
    const name = groupDraft.name.trim();
    if (!name) {
      notify({ message: t("validation.familyName"), tone: "error" });
      return;
    }
    const key = `staged-group-${++sequence.current}`;
    setStagedGroups((current) => [
      ...current,
      { key, name, brand: groupDraft.brand.trim() },
    ]);
    setCurrentGroupKey(key);
    setCurrentProductKey("");
    setVarietyDraft(emptyVariety());
    setScreenStack((current) => [...current, "groupVarieties"]);
    setScreen("newVariety");
    onStageChange?.(1);
  };

  const beginNewVariety = () => {
    if (!currentGroup) return;
    const existing = varietiesForGroup(currentGroup.key).find(
      (choice) => choice.variantOptions.length,
    );
    setVarietyDraft({
      options: stockSkuOptionDraftsFromOptions(existing?.variantOptions ?? []),
      unit: existing?.unit || "piece",
      trackingMode: existing?.trackingMode || "quantity",
    });
    showScreen("newVariety");
  };

  const createVariety = (event: FormEvent) => {
    event.preventDefault();
    if (!currentGroup) return;
    const variantOptions = stockSkuOptionsFromDrafts(varietyDraft.options);
    if (!variantOptions) {
      notify({ message: t("validation.varietyDetails"), tone: "error" });
      return;
    }
    const variant = variantOptions.map((option) => option.value).join(" · ");
    const signature = skuOptionSignature(variantOptions);

    const duplicate = varietiesForGroup(currentGroup.key).find(
      (choice) =>
        choice.variantOptions.length > 0 &&
        skuOptionSignature(choice.variantOptions) === signature &&
        choice.unit === varietyDraft.unit &&
        choice.trackingMode === varietyDraft.trackingMode,
    );
    if (duplicate) {
      ensureSelected(duplicate);
      setCurrentProductKey(duplicate.key);
      setUnitDraft(emptyUnit());
      showScreen("recording", false);
      return;
    }

    const key = `new-product-${++sequence.current}`;
    const product: PreparedProduct = {
      key,
      groupKey: currentGroup.key,
      familyId: currentGroup.familyId,
      familyName: currentGroup.name,
      name: currentGroup.name,
      brand: currentGroup.brand,
      variant,
      variantOptions,
      unit: varietyDraft.unit || "piece",
      trackingMode: varietyDraft.trackingMode,
    };
    setPreparedProducts((current) => [...current, product]);
    setSelectedKeys((current) => [...current, key]);
    setLines((current) => [
      ...current,
      { productKey: key, quantity: "1", costValue: "", trackedUnits: [] },
    ]);
    setCurrentProductKey(key);
    setUnitDraft(emptyUnit());
    showScreen("recording", false);
  };

  const beginSimpleProduct = () => {
    setCurrentGroupKey("");
    setCurrentProductKey("");
    setSimpleDraft(emptySimpleProduct());
    showScreen("newSimple");
  };

  const createSimpleProduct = (event: FormEvent) => {
    event.preventDefault();
    const name = simpleDraft.name.trim();
    if (!name) {
      notify({ message: stockT("validation.productName"), tone: "error" });
      return;
    }

    const key = `new-product-${++sequence.current}`;
    const product: PreparedProduct = {
      key,
      groupKey: "",
      familyId: "",
      familyName: "",
      name,
      brand: simpleDraft.brand.trim(),
      variant: "",
      variantOptions: [],
      unit: simpleDraft.unit || "piece",
      trackingMode: simpleDraft.trackingMode,
    };
    setPreparedProducts((current) => [...current, product]);
    setSelectedKeys((current) => [...current, key]);
    setLines((current) => [
      ...current,
      { productKey: key, quantity: "1", costValue: "", trackedUnits: [] },
    ]);
    setCurrentProductKey(key);
    setUnitDraft(emptyUnit());
    showScreen("recording", false);
  };

  const startRecording = (choiceKey: string) => {
    const choice = choices.find((item) => item.key === choiceKey);
    if (!choice) return;
    ensureSelected(choice);
    setCurrentProductKey(choice.key);
    setUnitDraft(emptyUnit());
    showScreen("recording");
  };

  const updateCurrentLine = (values: Partial<LineDraft>) => {
    if (!currentProductKey) return;
    setLines((current) =>
      current.map((line) =>
        line.productKey === currentProductKey ? { ...line, ...values } : line,
      ),
    );
  };

  const continueRecording = () => {
    if (!currentChoice || !currentLine) return;
    const quantity = Number(currentLine.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      notify({ message: stockT("validation.quantityPositive"), tone: "error" });
      return;
    }
    if (
      countableUnits.has(currentChoice.unit as (typeof units)[number]) &&
      !Number.isInteger(quantity)
    ) {
      notify({
        message: stockT("validation.wholeQuantity", { unit: currentChoice.unit }),
        tone: "error",
      });
      return;
    }
    if (currentLine.costValue) {
      const cost = Number(currentLine.costValue);
      if (!Number.isFinite(cost) || cost < 0) {
        notify({ message: stockT("validation.buyingCost"), tone: "error" });
        return;
      }
    }

    if (currentChoice.trackingMode === "individual") {
      if (!Number.isInteger(quantity)) {
        notify({ message: stockT("validation.individualWhole"), tone: "error" });
        return;
      }
      setLines((current) =>
        current.map((line) =>
          line.productKey === currentChoice.key
            ? { ...line, trackedUnits: line.trackedUnits.slice(0, quantity) }
            : line,
        ),
      );
      if (currentLine.trackedUnits.length >= quantity) {
        showScreen("afterVariety");
      } else {
        setUnitDraft(emptyUnit());
        showScreen("itemEntry");
      }
      return;
    }

    showScreen("afterVariety");
  };

  const addItem = () => {
    if (!currentChoice || !currentLine) return;
    const count = lineCount(currentLine);
    if (!count) {
      notify({ message: stockT("validation.quantityPositive"), tone: "error" });
      return;
    }
    if (currentLine.trackedUnits.length >= count) {
      showScreen("afterVariety");
      return;
    }
    const identifierValue = unitDraft.identifierValue.trim();
    if (!identifierValue) {
      notify({ message: t("validation.identifier"), tone: "error" });
      return;
    }
    const nextUnits = [
      ...currentLine.trackedUnits,
      { identifierKind: unitDraft.identifierKind, identifierValue },
    ];
    updateCurrentLine({ trackedUnits: nextUnits });
    setUnitDraft(emptyUnit());
    if (nextUnits.length >= count) showScreen("afterVariety");
  };

  const removeRecordedItem = (index: number) => {
    if (!currentLine) return;
    updateCurrentLine({
      trackedUnits: currentLine.trackedUnits.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const addAnotherVariety = () => {
    if (!currentChoice) return;
    if (!currentChoice.groupKey) {
      beginSimpleProduct();
      return;
    }
    setCurrentGroupKey(currentChoice.groupKey);
    setCurrentProductKey("");
    setVarietyDraft({
      options: stockSkuOptionDraftsFromOptions(currentChoice.variantOptions),
      unit: currentChoice.unit,
      trackingMode: currentChoice.trackingMode,
    });
    showScreen("newVariety");
  };

  const finishGroup = () => {
    setCurrentProductKey("");
    setUnitDraft(emptyUnit());
    goHome();
  };

  const removeSelected = (key: string) => {
    setSelectedKeys((current) => current.filter((item) => item !== key));
    setLines((current) => current.filter((line) => line.productKey !== key));
  };

  const validateStockDetails = () => {
    const expenses = Number(stockExpenses || 0);
    if (!Number.isFinite(expenses) || expenses < 0) {
      return stockT("validation.stockExpenses");
    }
    return "";
  };

  const validateLines = (status: "draft" | "received") => {
    if (!selectedKeys.length || !lines.length) return t("validation.catalogRequired");
    for (const line of lines) {
      const choice = choices.find((item) => item.key === line.productKey);
      if (!choice) return t("validation.catalogRequired");
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return stockT("validation.quantityPositive");
      }
      if (
        countableUnits.has(choice.unit as (typeof units)[number]) &&
        !Number.isInteger(quantity)
      ) {
        return stockT("validation.wholeQuantity", { unit: choice.unit });
      }
      if (line.costValue) {
        const cost = Number(line.costValue);
        if (!Number.isFinite(cost) || cost < 0) return stockT("validation.buyingCost");
      }
      if (choice.trackingMode === "individual") {
        if (!Number.isInteger(quantity)) return stockT("validation.individualWhole");
        if (status === "received" && line.trackedUnits.length !== quantity) {
          return stockT("validation.individualCount", { count: quantity });
        }
      }
    }
    return "";
  };

  const reviewStock = () => {
    const stockValidation = validateStockDetails();
    if (stockValidation) {
      notify({ message: stockValidation, tone: "error" });
      return;
    }
    const validation = validateLines("draft");
    if (validation) {
      notify({ message: validation, tone: "error" });
      return;
    }
    showScreen("review");
  };

  const buildPayload = (status: "draft" | "received") => ({
    name: stockName.trim() || t("values.defaultStockName"),
    status,
    ...(lateDeliveryParent ? { parent_receipt_id: lateDeliveryParent.id } : {}),
    supplier_name: supplier.trim(),
    additional_cost: stockExpenses || "0",
    ...(status === "received"
      ? { received_at: new Date(receivedAt || Date.now()).toISOString() }
      : {}),
    catalog_items: selectedKeys.map((key) => {
      const choice = choices.find((item) => item.key === key)!;
      if (choice.existingId) return { key: choice.key, product_id: choice.existingId };
      return {
        key: choice.key,
        ...(choice.familyName ? { family_name: choice.familyName } : {}),
        variant_options: choice.variantOptions,
        item: {
          name: choice.name,
          brand: choice.brand,
          variant: choice.variant,
          unit: choice.unit,
          tracking_mode: choice.trackingMode,
        },
      };
    }),
    lines: lines.map((line) => {
      const choice = choices.find((item) => item.key === line.productKey)!;
      return {
        catalog_key: line.productKey,
        quantity_received: line.quantity,
        received_unit: choice.unit,
        conversion_to_base: "1",
        ...(line.costValue ? { unit_cost: Number(line.costValue).toFixed(2) } : {}),
        tracked_units:
          choice.trackingMode === "individual"
            ? line.trackedUnits.map((unit) => ({
                model_name: choice.name,
                brand: choice.brand,
                color: "",
                capacity: "",
                identifiers: [
                  { kind: unit.identifierKind, value: unit.identifierValue.trim() },
                ],
              }))
            : [],
      };
    }),
  });

  const saveStock = async (status: "draft" | "received") => {
    if (!accessToken) return;
    const stockValidation = validateStockDetails();
    if (stockValidation) {
      notify({ message: stockValidation, tone: "error" });
      return;
    }
    const validation = validateLines(status);
    if (validation) {
      notify({ message: validation, tone: "error" });
      return;
    }

    setBusy(true);
    try {
      const response = await createStockReceipt(businessId, accessToken, buildPayload(status));
      const receipt = response.data as StockReceipt | null;
      if (receipt) setSavedReceipt(receipt);
      notify({
        message:
          status === "draft" ? stockT("success.draftSaved") : commerceT("success.stock"),
        tone: "success",
      });
      await load();
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : commerceT("errors.save"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const resetRecorder = (parent?: StockReceipt) => {
    setScreen("products");
    setScreenStack([]);
    setStagedGroups([]);
    setPreparedProducts([]);
    setSelectedKeys([]);
    setLines([]);
    setCurrentGroupKey("");
    setCurrentProductKey("");
    setGroupDraft({ name: "", brand: "" });
    setVarietyDraft(emptyVariety());
    setSimpleDraft(emptySimpleProduct());
    setUnitDraft(emptyUnit());
    setExistingOpen(false);
    setGroupSearch("");
    setStockName(parent?.name ?? "");
    setSupplier(parent?.supplier_name ?? "");
    setReceivedAt(localNow());
    setStockExpenses("0");
    setLateDeliveryParent(parent ?? null);
    setSavedReceipt(null);
    onRecordingRequested?.();
    onStageChange?.(1);
  };

  const beginCorrection = (receipt: StockReceipt) => {
    setCorrection({
      receipt,
      name: receipt.name,
      supplier: receipt.supplier_name,
      expenses: receipt.additional_cost,
      lines: receipt.lines.map((line) => ({
        id: line.id,
        name: line.product_name,
        quantity: String(
          Number(line.quantity_received) / Number(line.conversion_to_base || "1"),
        ),
        receivedUnit: line.received_unit,
        cost: line.received_unit_cost ?? "",
      })),
    });
  };

  const saveCorrection = async () => {
    if (!accessToken || !correction) return;
    setBusy(true);
    try {
      await correctStockReceipt(businessId, correction.receipt.id, accessToken, {
        name: correction.name.trim(),
        supplier_name: correction.supplier.trim(),
        additional_cost: correction.expenses || "0",
        lines: correction.lines.map((line) => ({
          id: line.id,
          quantity: line.quantity,
          unit: line.receivedUnit,
          unit_cost: line.cost || null,
        })),
      });
      setCorrection(null);
      notify({ message: commerceT("success.stockCorrected"), tone: "success" });
      await load();
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : commerceT("errors.save"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const titleForScreen = () => {
    if (screen === "products") return t("steps.products");
    if (screen === "newGroup") return t("screens.newGroup");
    if (screen === "groupVarieties") return t("screens.varieties");
    if (screen === "newVariety") return t("screens.newVariety");
    if (screen === "newSimple") return t("screens.simpleProduct");
    if (screen === "recording") return t("steps.record");
    if (screen === "itemEntry") return t("screens.addItem");
    if (screen === "afterVariety") return t("screens.varietySaved");
    if (screen === "stockDetails") return t("steps.stock");
    return t("steps.review");
  };

  const helpForScreen = () => {
    if (screen === "products") return t("help.products");
    if (screen === "newGroup") return t("help.newCategory");
    if (screen === "groupVarieties" || screen === "newVariety") return t("help.autoSku");
    if (screen === "newSimple") return t("help.uncategorized");
    if (screen === "recording" || screen === "itemEntry") return t("help.record");
    if (screen === "stockDetails") return t("help.stock");
    if (screen === "review") return t("help.review");
    return "";
  };

  const renderGroupRows = (items: GroupChoice[]) => (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((group) => (
        <button
          className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50 hover:text-primary dark:hover:bg-slate-900/50"
          key={group.key}
          onClick={() => openGroup(group.key)}
          type="button"
        >
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm">{group.name}</strong>
            <span className="mt-0.5 block text-xs text-slate-500">
              {group.brand
                ? `${group.brand} · ${t("products.varietyCount", { count: groupCount(group.key) })}`
                : t("products.varietyCount", { count: groupCount(group.key) })}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-slate-400" />
        </button>
      ))}
    </div>
  );

  let body: React.ReactNode;

  if (screen === "products") {
    const hasExisting = groups.length > 0 || existingSimpleChoices.length > 0;
    const hasSearchResults = filteredGroups.length > 0 || filteredSimpleChoices.length > 0;
    body = (
      <div className="grid gap-4">
        {lateDeliveryParent ? (
          <div className={contextCard}>
            <strong className="block text-sm text-slate-950 dark:text-white">
              {stockT("steps.lateDelivery")}
            </strong>
            <span className="text-xs text-slate-500">{lateDeliveryParent.reference}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {hasExisting ? (
            <Button
              aria-expanded={existingOpen}
              className="min-h-11 rounded-full px-3 text-xs sm:text-sm"
              onClick={toggleExistingGroups}
              type="button"
              variant="outline"
            >
              {t("actions.addToExistingGroup")}
              <ChevronDown
                className={`size-4 transition ${existingOpen ? "rotate-180" : ""}`}
              />
            </Button>
          ) : null}
          <Button
            className={`min-h-11 rounded-full px-3 text-xs sm:text-sm ${
              hasExisting ? "" : "col-span-2"
            }`}
            onClick={beginNewGroup}
            type="button"
          >
            <Plus className="size-4" />
            {t("actions.createNewGroup")}
          </Button>
        </div>

        {existingOpen ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 p-2.5 dark:border-slate-800">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label={t("placeholders.searchGroups")}
                  className="pl-9"
                  placeholder={t("placeholders.searchGroups")}
                  value={groupSearch}
                  onChange={(event) => setGroupSearch(event.target.value)}
                />
              </div>
            </div>

            {hasSearchResults ? (
              <div className="max-h-80 overflow-y-auto overscroll-contain">
                {filteredGroups.length ? renderGroupRows(filteredGroups) : null}
                {filteredSimpleChoices.length ? (
                  <div className="border-t border-slate-200 dark:border-slate-800">
                    <div className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {t("products.simpleProducts")}
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSimpleChoices.map((choice) => (
                        <button
                          className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50 hover:text-primary dark:hover:bg-slate-900/50"
                          key={choice.key}
                          onClick={() => startRecording(choice.key)}
                          type="button"
                        >
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-sm">{choice.name}</strong>
                            <span className="block truncate text-xs text-slate-500">
                              {[choice.variant, t(`tracking.${choice.trackingMode}`)]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                {t("products.noMatchingGroups")}
              </p>
            )}
          </div>
        ) : null}

        {!hasExisting ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center dark:border-slate-800">
            <p className="text-sm text-slate-500">{t("products.noGroups")}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-8 px-2.5 text-xs"
            onClick={beginSimpleProduct}
            type="button"
            variant="ghost"
          >
            <Plus className="size-3.5" />
            {t("actions.addSimpleProduct")}
          </Button>
        </div>

        {selectedKeys.length ? (
          <div className="grid gap-3 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <strong className="block text-sm text-emerald-800 dark:text-emerald-300">
                  {t("products.currentStock")}
                </strong>
                <span className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  {t("products.currentCount", { count: selectedKeys.length })}
                </span>
              </div>
              <Button
                className="shrink-0 rounded-full"
                onClick={reviewStock}
                size="small"
                type="button"
              >
                {t("actions.reviewStock")}
              </Button>
            </div>

            <div className="divide-y divide-emerald-100 dark:divide-emerald-900">
              {selectedKeys.map((key) => {
                const choice = choices.find((item) => item.key === key);
                const line = lines.find((item) => item.productKey === key);
                if (!choice || !line) return null;
                return (
                  <div className="flex min-w-0 items-center gap-2 py-2" key={key}>
                    <span className="min-w-0 flex-1 truncate text-xs text-emerald-900 dark:text-emerald-200">
                      {[choice.familyName, varietyLabel(choice)]
                        .filter(
                          (value, index, array) =>
                            Boolean(value) && array.indexOf(value) === index,
                        )
                        .join(" · ")}
                      {" · "}
                      {line.quantity} {choice.unit}
                    </span>
                    <button
                      aria-label={t("actions.remove")}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900"
                      onClick={() => removeSelected(key)}
                      type="button"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  } else if (screen === "newGroup") {
    body = (
      <form className="grid gap-4" onSubmit={createGroup}>
        <label className={field}>
          <FieldTitle help={t("fieldHelp.productGroup")} helpLabel={t("helpLabel")}>
            {t("fields.productFamily")}
          </FieldTitle>
          <Input
            autoFocus
            placeholder={t("placeholders.group")}
            value={groupDraft.name}
            onChange={(event) =>
              setGroupDraft((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <label className={field}>
          {commerceT("fields.brandOptional")}
          <Input
            placeholder={t("placeholders.brand")}
            value={groupDraft.brand}
            onChange={(event) =>
              setGroupDraft((current) => ({ ...current, brand: event.target.value }))
            }
          />
        </label>
        <Button className="mt-2 rounded-full" type="submit">
          {stockT("actions.continue")}
        </Button>
      </form>
    );
  } else if (screen === "groupVarieties") {
    const groupChoices = currentGroup ? varietiesForGroup(currentGroup.key) : [];
    body = currentGroup ? (
      <div className="grid gap-4">
        <div className={contextCard}>
          <strong className="block text-sm text-slate-950 dark:text-white">
            {currentGroup.name}
          </strong>
          <span className="text-xs text-slate-500">
            {currentGroup.brand || t("products.chooseOrAddVariety")}
          </span>
        </div>

        {groupChoices.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {groupChoices.map((choice) => {
              const line = lines.find((item) => item.productKey === choice.key);
              return (
                <button
                  className="flex w-full min-w-0 items-center gap-3 px-1 py-3 text-left transition hover:text-primary"
                  key={choice.key}
                  onClick={() => startRecording(choice.key)}
                  type="button"
                >
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{varietyLabel(choice)}</strong>
                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      {line
                        ? `${line.quantity} ${choice.unit} · ${t(
                            `tracking.${choice.trackingMode}`,
                          )}`
                        : t(`tracking.${choice.trackingMode}`)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">
            {t("products.noVarieties")}
          </p>
        )}

        <button
          className="flex w-fit items-center gap-2 text-sm font-semibold text-primary"
          onClick={beginNewVariety}
          type="button"
        >
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10">
            <Plus className="size-3.5" />
          </span>
          {t("actions.addNewVariety")}
        </button>
      </div>
    ) : null;
  } else if (screen === "newVariety") {
    body = currentGroup ? (
      <form className="grid gap-4" onSubmit={createVariety}>
        <div className={contextCard}>
          <strong className="block text-sm text-slate-950 dark:text-white">
            {currentGroup.name}
          </strong>
          <span className="text-xs text-slate-500">{t("products.addingVariety")}</span>
        </div>

        <StockSkuOptionEditor
          value={varietyDraft.options}
          onChange={(options) =>
            setVarietyDraft((current) => ({ ...current, options }))
          }
        />

        <label className={field}>
          {stockT("fields.unit")}
          <Select
            value={varietyDraft.unit}
            onChange={(event) =>
              setVarietyDraft((current) => ({ ...current, unit: event.target.value }))
            }
          >
            {availableUnits.map((unit) => (
              <option key={unit.key} value={unit.key}>
                {unit.label}
              </option>
            ))}
          </Select>
        </label>

        <div className="grid gap-2">
          <FieldTitle help={t("fieldHelp.tracking")} helpLabel={t("helpLabel")}>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("fields.trackingMode")}
            </span>
          </FieldTitle>
          <TrackingChoice
            description={t("trackingHelp.quantity")}
            label={t("tracking.quantity")}
            onClick={() =>
              setVarietyDraft((current) => ({ ...current, trackingMode: "quantity" }))
            }
            selected={varietyDraft.trackingMode === "quantity"}
          />
          <TrackingChoice
            description={t("trackingHelp.individual")}
            label={t("tracking.individual")}
            onClick={() =>
              setVarietyDraft((current) => ({ ...current, trackingMode: "individual" }))
            }
            selected={varietyDraft.trackingMode === "individual"}
          />
        </div>

        <Button className="mt-2 rounded-full" type="submit">
          {t("actions.continueToRecord")}
        </Button>
      </form>
    ) : null;
  } else if (screen === "newSimple") {
    body = (
      <form className="grid gap-4" onSubmit={createSimpleProduct}>
        <label className={field}>
          <FieldTitle help={t("fieldHelp.simpleProduct")} helpLabel={t("helpLabel")}>
            {stockT("fields.productName")}
          </FieldTitle>
          <Input
            autoFocus
            placeholder={t("placeholders.simpleProduct")}
            value={simpleDraft.name}
            onChange={(event) =>
              setSimpleDraft((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <label className={field}>
          {commerceT("fields.brandOptional")}
          <Input
            placeholder={t("placeholders.brand")}
            value={simpleDraft.brand}
            onChange={(event) =>
              setSimpleDraft((current) => ({ ...current, brand: event.target.value }))
            }
          />
        </label>
        <label className={field}>
          {stockT("fields.unit")}
          <Select
            value={simpleDraft.unit}
            onChange={(event) =>
              setSimpleDraft((current) => ({ ...current, unit: event.target.value }))
            }
          >
            {availableUnits.map((unit) => (
              <option key={unit.key} value={unit.key}>
                {unit.label}
              </option>
            ))}
          </Select>
        </label>
        <div className="grid gap-2">
          <FieldTitle help={t("fieldHelp.tracking")} helpLabel={t("helpLabel")}>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("fields.trackingMode")}
            </span>
          </FieldTitle>
          <TrackingChoice
            description={t("trackingHelp.quantity")}
            label={t("tracking.quantity")}
            onClick={() =>
              setSimpleDraft((current) => ({ ...current, trackingMode: "quantity" }))
            }
            selected={simpleDraft.trackingMode === "quantity"}
          />
          <TrackingChoice
            description={t("trackingHelp.individual")}
            label={t("tracking.individual")}
            onClick={() =>
              setSimpleDraft((current) => ({ ...current, trackingMode: "individual" }))
            }
            selected={simpleDraft.trackingMode === "individual"}
          />
        </div>
        <Button className="mt-2 rounded-full" type="submit">
          {t("actions.continueToRecord")}
        </Button>
      </form>
    );
  } else if (screen === "recording") {
    body =
      currentChoice && currentLine ? (
        <div className="grid gap-4">
          <div className={contextCard}>
            <strong className="block text-sm text-slate-950 dark:text-white">
              {currentChoice.familyName || currentChoice.name}
            </strong>
            <span className="text-xs text-slate-500">
              {[
                currentChoice.familyName ? varietyLabel(currentChoice) : "",
                t(`tracking.${currentChoice.trackingMode}`),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>

          <label className={field}>
            <FieldTitle help={t("fieldHelp.quantity")} helpLabel={t("helpLabel")}>
              {stockT("fields.quantity")}
            </FieldTitle>
            <Input
              min="0.001"
              placeholder={t("placeholders.quantity")}
              step={currentChoice.trackingMode === "individual" ? "1" : "0.001"}
              type="number"
              value={currentLine.quantity}
              onChange={(event) => updateCurrentLine({ quantity: event.target.value })}
            />
          </label>

          <label className={field}>
            <FieldTitle help={t("fieldHelp.buyingPrice")} helpLabel={t("helpLabel")}>
              {stockT("fields.costPerUnit")}
            </FieldTitle>
            <Input
              min="0"
              placeholder={t("placeholders.buyingPrice")}
              step="0.01"
              type="number"
              value={currentLine.costValue}
              onChange={(event) => updateCurrentLine({ costValue: event.target.value })}
            />
          </label>

          <Button className="mt-2 rounded-full" onClick={continueRecording} type="button">
            {stockT("actions.continue")}
          </Button>
        </div>
      ) : null;
  } else if (screen === "itemEntry") {
    const count = lineCount(currentLine);
    const recorded = currentLine?.trackedUnits.length ?? 0;
    body =
      currentChoice && currentLine ? (
        <div className="grid gap-4">
          <div className={contextCard}>
            <strong className="block text-sm text-slate-950 dark:text-white">
              {currentChoice.familyName || currentChoice.name}
            </strong>
            <span className="text-xs text-slate-500">
              {currentChoice.familyName ? varietyLabel(currentChoice) : ""}
            </span>
          </div>

          <p className="text-center text-xs font-semibold text-slate-500">
            {t("individualItem", { number: Math.min(recorded + 1, count), count })}
          </p>

          <label className={field}>
            {stockT("fields.identifierType")}
            <Select
              value={unitDraft.identifierKind}
              onChange={(event) =>
                setUnitDraft((current) => ({
                  ...current,
                  identifierKind: event.target.value as IdentifierKind,
                }))
              }
            >
              {identifierKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {commerceT(`identifierTypes.${kind}`)}
                </option>
              ))}
            </Select>
          </label>

          <label className={field}>
            <FieldTitle help={t("fieldHelp.identifier")} helpLabel={t("helpLabel")}>
              {stockT("fields.identifierValue")}
            </FieldTitle>
            <Input
              autoFocus
              placeholder={t("placeholders.identifier")}
              value={unitDraft.identifierValue}
              onChange={(event) =>
                setUnitDraft((current) => ({
                  ...current,
                  identifierValue: event.target.value,
                }))
              }
            />
          </label>

          {recorded ? (
            <div className="grid gap-1 rounded-xl bg-slate-50 p-2 dark:bg-slate-900/50">
              {currentLine.trackedUnits.map((unit, index) => (
                <div
                  className="flex min-w-0 items-center gap-2 px-2 py-1.5 text-xs"
                  key={`${unit.identifierKind}-${unit.identifierValue}-${index}`}
                >
                  <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
                    {index + 1}. {unit.identifierValue}
                  </span>
                  <button
                    aria-label={t("actions.remove")}
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    onClick={() => removeRecordedItem(index)}
                    type="button"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <Button className="mt-2 rounded-full" onClick={addItem} type="button">
            {t("actions.addIndividual")}
          </Button>
        </div>
      ) : null;
  } else if (screen === "afterVariety") {
    const count = lineCount(currentLine);
    body =
      currentChoice && currentLine ? (
        <div className="grid gap-4">
          <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <strong className="block text-sm text-emerald-800 dark:text-emerald-300">
              {t("afterVariety.saved", { name: varietyLabel(currentChoice) })}
            </strong>
            <span className="mt-1 block text-xs text-emerald-700/80 dark:text-emerald-300/80">
              {currentChoice.trackingMode === "individual"
                ? t("afterVariety.itemsRecorded", { count })
                : t("afterVariety.unitsRecorded", {
                    count: currentLine.quantity,
                    unit: currentChoice.unit,
                  })}
              {currentChoice.familyName ? ` · ${currentChoice.familyName}` : ""}
            </span>
          </div>

          <div className="grid gap-2">
            <Button
              className="rounded-full"
              onClick={addAnotherVariety}
              type="button"
              variant="outline"
            >
              {currentChoice.groupKey
                ? t("actions.addAnotherInCategory")
                : t("actions.addAnotherProduct")}
            </Button>
            <Button className="rounded-full" onClick={finishGroup} type="button">
              {currentChoice.groupKey
                ? t("actions.finishCategory")
                : t("actions.finishProduct")}
            </Button>
          </div>
        </div>
      ) : null;
  } else if (screen === "stockDetails") {
    body = (
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const validation = validateStockDetails();
          if (validation) {
            notify({ message: validation, tone: "error" });
            return;
          }
          goBack();
        }}
      >
        <label className={field}>
          {t("fields.stockName")}
          <Input
            placeholder={t("placeholders.stockName")}
            value={stockName}
            onChange={(event) => setStockName(event.target.value)}
          />
        </label>
        <label className={field}>
          {stockT("fields.supplier")}
          <Input
            placeholder={t("placeholders.supplier")}
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
          />
        </label>
        <label className={field}>
          {stockT("fields.dateReceived")}
          <Input
            type="datetime-local"
            value={receivedAt}
            onChange={(event) => setReceivedAt(event.target.value)}
          />
        </label>
        <label className={field}>
          {stockT("fields.stockExpenses")}
          <Input
            min="0"
            placeholder={t("placeholders.stockExpenses")}
            step="0.01"
            type="number"
            value={stockExpenses}
            onChange={(event) => setStockExpenses(event.target.value)}
          />
        </label>
        <Button className="mt-2 rounded-full" type="submit">
          {t("actions.doneStockDetails")}
        </Button>
      </form>
    );
  } else {
    body = (
      <div className="grid gap-4">
        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900/50">
          {stockName.trim() ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">{t("fields.stockName")}</span>
              <strong className="text-right">{stockName}</strong>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">{stockT("fields.totalProducts")}</span>
            <strong>{selectedKeys.length}</strong>
          </div>
          {Number(stockExpenses || 0) > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">{stockT("fields.stockExpenses")}</span>
              <strong>{stockExpenses}</strong>
            </div>
          ) : null}
        </div>

        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-800">
          {selectedKeys.map((key) => {
            const choice = choices.find((item) => item.key === key);
            const line = lines.find((item) => item.productKey === key);
            if (!choice || !line) return null;
            return (
              <div className="flex min-w-0 gap-3 py-3" key={key}>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {choice.familyName || choice.name}
                  </strong>
                  <span className="block truncate text-xs text-slate-500">
                    {choice.familyName ? varietyLabel(choice) : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs font-semibold">
                  {line.quantity} {choice.unit}
                  <span className="block font-normal text-slate-500">
                    {t(`tracking.${choice.trackingMode}`)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            className="rounded-full"
            disabled={busy}
            onClick={() => void saveStock("draft")}
            type="button"
            variant="outline"
          >
            {stockT("actions.saveDraft")}
          </Button>
          <Button
            className="rounded-full"
            disabled={busy}
            onClick={() => void saveStock("received")}
            type="button"
          >
            {busy ? stockT("actions.saving") : stockT("actions.finishSave")}
          </Button>
        </div>
      </div>
    );
  }

  const productStage = screen !== "stockDetails" && screen !== "review";

  return (
    <div className="stock-recording-workspace-v2 grid min-w-0 gap-4">
      {recordingOpen ? (
        <section className={`${panel} mx-auto w-full max-w-5xl overflow-hidden`}>
          {savedReceipt ? (
            <div className="grid gap-4 p-4">
              <div>
                <h2 className="text-lg font-bold">{stockT("success.savedTitle")}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {savedReceipt.name || savedReceipt.reference} · {savedReceipt.reference}
                </p>
              </div>
              <div className="grid gap-2">
                {savedReceipt.lines.map((line) => (
                  <StockProductSummary key={line.id} line={line} />
                ))}
              </div>
              <StockSummaryActions receipt={savedReceipt} />
              <Button
                className="w-fit rounded-full"
                onClick={() => resetRecorder()}
                type="button"
                variant="outline"
              >
                {stockT("actions.recordAnother")}
              </Button>
            </div>
          ) : (
            <div className="min-w-0 md:grid md:grid-cols-[12rem_minmax(0,1fr)]">
              <aside className="hidden min-w-0 border-r border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40 md:block">
                <nav className="grid gap-1" aria-label={t("steps.products")}>
                  <button
                    className={`rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
                      productStage
                        ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:hover:bg-slate-950/70 dark:hover:text-white"
                    }`}
                    onClick={goHome}
                    type="button"
                  >
                    {t("steps.products")}
                  </button>
                  <button
                    className={`rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
                      screen === "stockDetails"
                        ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:hover:bg-slate-950/70 dark:hover:text-white"
                    }`}
                    onClick={() => showScreen("stockDetails")}
                    type="button"
                  >
                    {t("steps.stock")}
                  </button>
                  <button
                    className={`rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      screen === "review"
                        ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:hover:bg-slate-950/70 dark:hover:text-white"
                    }`}
                    disabled={!selectedKeys.length}
                    onClick={reviewStock}
                    type="button"
                  >
                    {t("steps.review")}
                  </button>
                </nav>
              </aside>

              <div className="min-w-0">
                <ScreenHeader
                  canGoBack={screen !== "products"}
                  help={helpForScreen()}
                  helpLabel={t("helpLabel")}
                  onBack={goBack}
                  title={titleForScreen()}
                />
                <div className="min-w-0 p-4">
                  <div className="mx-auto w-full max-w-2xl">{body}</div>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <section className={`${panel} min-w-0`}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="min-w-0 break-words text-sm font-bold">{t("history.title")}</h2>
            <HelpTip label={t("helpLabel")}>{t("history.description")}</HelpTip>
          </div>
          <StockEditControl
            receipts={receipts}
            onCorrect={beginCorrection}
            onLateDelivery={(receipt) => resetRecorder(receipt)}
          />
        </div>

        {correction ? (
          <div className="grid min-w-0 gap-3 border-t border-slate-200 p-3 dark:border-slate-800">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <strong className="break-words">{t("correction.title")}</strong>
              <Button onClick={() => setCorrection(null)} type="button" variant="ghost">
                {commerceT("actions.cancel")}
              </Button>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <label className={field}>
                {t("fields.stockName")}
                <Input
                  value={correction.name}
                  onChange={(event) =>
                    setCorrection({ ...correction, name: event.target.value })
                  }
                />
              </label>
              <label className={field}>
                {stockT("fields.supplier")}
                <Input
                  value={correction.supplier}
                  onChange={(event) =>
                    setCorrection({ ...correction, supplier: event.target.value })
                  }
                />
              </label>
              <label className={field}>
                {stockT("fields.stockExpenses")}
                <Input
                  min="0"
                  step="0.01"
                  type="number"
                  value={correction.expenses}
                  onChange={(event) =>
                    setCorrection({ ...correction, expenses: event.target.value })
                  }
                />
              </label>
            </div>

            {correction.lines.map((line, index) => (
              <div
                className="grid min-w-0 gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-3"
                key={line.id}
              >
                <strong className="min-w-0 break-words text-xs sm:col-span-3">{line.name}</strong>
                <label className={field}>
                  {stockT("fields.quantity")}
                  <Input
                    min="0.001"
                    step="0.001"
                    type="number"
                    value={line.quantity}
                    onChange={(event) =>
                      setCorrection({
                        ...correction,
                        lines: correction.lines.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, quantity: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
                <label className={field}>
                  {t("fields.receivedUnit")}
                  <Input
                    value={line.receivedUnit}
                    onChange={(event) =>
                      setCorrection({
                        ...correction,
                        lines: correction.lines.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, receivedUnit: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
                <label className={field}>
                  {stockT("fields.costPerUnit")}
                  <Input
                    min="0"
                    step="0.01"
                    type="number"
                    value={line.cost}
                    onChange={(event) =>
                      setCorrection({
                        ...correction,
                        lines: correction.lines.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, cost: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            ))}

            <Button
              className="w-fit rounded-full"
              disabled={busy}
              onClick={() => void saveCorrection()}
              type="button"
            >
              {t("actions.saveCorrection")}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export { StockRecordingWorkspaceV2 };
