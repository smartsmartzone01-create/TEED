"use client";

import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { Link } from "@/i18n/navigation";
import { isRequestCancelled } from "@/services/global/api-client";
import {
  commerceRead,
  commerceWrite,
  createProduct,
  createSale,
  getCommerceOverview,
  getProducts,
  getSales,
  updateSale,
  voidSale,
} from "@/services/commerce/commerce";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import type {
  CommerceOverview,
  Product,
  Sale,
} from "@/types/commerce/commerce";

type CommerceView =
  | "overview"
  | "products"
  | "inventory"
  | "sales"
  | "returns"
  | "expenses"
  | "budgets";
type Props = { businessId: string; view: CommerceView };
type SaleLine = { product_id: string; quantity: string; unit_price: string };
type IdentifierKind =
  | "imei"
  | "serial"
  | "chassis"
  | "barcode"
  | "engine"
  | "registration";
type IndividualUnit = {
  id: string;
  modelName: string;
  brand: string;
  color: string;
  capacity: string;
  identifierType: IdentifierKind;
  identifierValue: string;
};
type ProductIdentity = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  brand: string;
  variant: string;
  unit: string;
  customUnit: string;
  sellingPrice: string;
  saved: boolean;
};
type StockType = {
  id: string;
  productId: string;
  identityId: string;
  name: string;
  brand: string;
  variant: string;
  quantity: string;
  trackingMode: "quantity" | "individual";
  units: IndividualUnit[];
  unitDraft: IndividualUnit;
  saved: boolean;
};
type StockGroup = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  customUnitName: string;
  baseUnit: string;
  conversion: string;
  buyingPrice: string;
  sellingPrice: string;
  types: StockType[];
  saved: boolean;
  contentMode: "unset" | "quantity" | "individual";
};

const unitOptions = [
  "piece", "pair", "packet", "box", "carton", "crate", "bottle", "can",
  "bag", "sack", "bundle", "set", "dozen", "roll", "meter", "kilogram",
  "gram", "liter", "milliliter", "tonne",
] as const;
const identifierOptions: IdentifierKind[] = [
  "imei", "serial", "chassis", "barcode", "engine", "registration",
];
type StockContainer = {
  id: string;
  name: string;
  recordingMode: "direct" | "grouped";
  detailsSaved: boolean;
  identities: ProductIdentity[];
  identityDraft: ProductIdentity;
  identitiesSaved: boolean;
  groups: StockGroup[];
};
type SavedTrackedUnit = {
  id: string;
  internal_serial: string;
  model_name: string;
  brand: string;
  color: string;
  capacity: string;
  identifiers: Array<{ id: string; kind: string; value: string }>;
};
type SavedStockLine = {
  id: string;
  product_name: string;
  product_sku: string;
  selling_price: string;
  tracking_mode: string;
  quantity_received: string;
  quantity_remaining: string;
  received_unit: string;
  unit_cost: string;
  tracked_units: SavedTrackedUnit[];
};
type SavedStockReceipt = {
  id: string;
  reference: string;
  status: string;
  supplier_name: string;
  supplier_reference: string;
  received_at: string;
  additional_cost: string;
  batches: Array<{
    id: string;
    name: string;
    groups: Array<{
      id: string;
      name: string;
      quantity: string;
      unit: string;
      buying_price: string | null;
      selling_price: string | null;
      types: SavedStockLine[];
    }>;
  }>;
  lines: SavedStockLine[];
};

const nowLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const money = (value: string | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
        Number(value),
      );

function CommerceWorkspace({ businessId, view }: Props) {
  const t = useTranslations("Commerce");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [overview, setOverview] = useState<CommerceOverview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [records, setRecords] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      setError("");
      try {
        if (view === "overview")
          setOverview(
            (await getCommerceOverview(businessId, accessToken, signal)).data ??
              null,
          );
        if (["products", "inventory", "sales", "returns"].includes(view)) {
          setProducts(
            (await getProducts(businessId, accessToken, signal)).data
              ?.products ?? [],
          );
        }
        if (["sales", "returns"].includes(view))
          setSales(
            (await getSales(businessId, accessToken, signal)).data?.sales ?? [],
          );
        if (["inventory", "returns", "expenses", "budgets"].includes(view)) {
          setRecords(
            (await commerceRead(
              businessId,
              accessToken,
              view === "inventory" ? "stock-receipts" : view,
              signal,
            )).data ??
              null,
          );
        }
      } catch (reason) {
        if (!isRequestCancelled(reason))
          setError(reason instanceof Error ? reason.message : t("errors.load"));
      }
    },
    [accessToken, businessId, t, view],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(initial);
      controller.abort();
    };
  }, [load]);

  const submit = async (operation: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await operation();
      notify({ message, tone: "success" });
      await load();
      return result ?? true;
    } catch (reason) {
      const messageText =
        reason instanceof Error ? reason.message : t("errors.save");
      setError(messageText);
      notify({ message: messageText, tone: "error" });
      return null;
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
            {t(`views.${view}.title`)}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {t(`views.${view}.description`)}
          </p>
        </div>
      </header>
      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {view === "overview" ? (
        <Overview businessId={businessId} data={overview} t={t} />
      ) : null}
      {view === "products" ? (
        <Products products={products} t={t} />
      ) : null}
      {view === "inventory" ? (
        <Inventory
          accessToken={accessToken}
          businessId={businessId}
          busy={busy}
          products={products}
          records={records}
          submit={submit}
          t={t}
        />
      ) : null}
      {view === "sales" ? (
        <Sales
          accessToken={accessToken}
          businessId={businessId}
          busy={busy}
          products={products}
          sales={sales}
          submit={submit}
          t={t}
        />
      ) : null}
      {view === "returns" ? (
        <Returns
          accessToken={accessToken}
          businessId={businessId}
          busy={busy}
          sales={sales}
          submit={submit}
          t={t}
        />
      ) : null}
      {view === "expenses" || view === "budgets" ? (
        <Finance
          accessToken={accessToken}
          businessId={businessId}
          busy={busy}
          records={records}
          submit={submit}
          t={t}
          view={view}
        />
      ) : null}
    </section>
  );
}

type T = ReturnType<typeof useTranslations>;
const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950";
const field =
  "space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300";

function Overview({
  businessId,
  data,
  t,
}: {
  businessId: string;
  data: CommerceOverview | null;
  t: T;
}) {
  if (!data) return <Skeleton />;
  const states = [
    [CircleDollarSign, t("pulse.revenue"), money(data.pulse.revenue)],
    [ReceiptText, t("pulse.sales"), String(data.pulse.sales_count)],
    [AlertTriangle, t("pulse.lowStock"), String(data.pulse.low_stock_count)],
    [Boxes, t("pulse.stockValue"), money(data.pulse.stock_value)],
  ] as const;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {states.map(([Icon, label, value], index) => (
          <div className={`${panel} relative overflow-hidden`} key={label}>
            <div
              className={`absolute inset-x-0 top-0 h-1 ${index % 2 ? "bg-orange-500" : "bg-blue-950"}`}
            />
            <Icon className="size-5 text-orange-600" />
            <p className="mt-5 text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className={panel}>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-orange-600" />
            <h2 className="font-bold">{t("decisions.title")}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {t("decisions.description")}
          </p>
          <div className="mt-5 space-y-3">
            {data.decisions.length ? (
              data.decisions.map((decision) => (
                <Link
                  className="group flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 hover:border-orange-300 dark:border-slate-800"
                  href={`/workspace/${businessId}${decision.action_path}`}
                  key={decision.id}
                >
                  <div>
                    <p className="text-sm font-bold">{decision.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {decision.explanation}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
              ))
            ) : (
              <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                {t("decisions.clear")}
              </p>
            )}
          </div>
        </div>
        <div className={panel}>
          <h2 className="font-bold">{t("recentSales")}</h2>
          <div className="mt-4 space-y-3">
            {data.recent_sales.map((sale) => (
              <div
                className="flex justify-between border-b border-slate-100 pb-3 text-sm dark:border-slate-800"
                key={sale.id}
              >
                <span>{sale.receipt_number}</span>
                <strong>{money(sale.total)}</strong>
              </div>
            ))}
            {!data.recent_sales.length ? (
              <p className="text-sm text-slate-500">{t("empty.sales")}</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function Products({ products, t }: { products: Product[]; t: T }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{t("availableItemsHelp")}</p>
      <ListProducts products={products} t={t} />
    </div>
  );
}

function Inventory({
  accessToken,
  businessId,
  busy,
  products,
  records,
  submit,
  t,
}: {
  accessToken: string | null;
  businessId: string;
  busy: boolean;
  products: Product[];
  records: unknown;
  submit: (op: () => Promise<unknown>, msg: string) => Promise<unknown | null>;
  t: T;
}) {
  // IDs are created only for new draft rows and never sent to the API.
  const newId = (prefix: string) =>
    // eslint-disable-next-line react-hooks/purity
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const emptyIdentity = (): ProductIdentity => ({
    id: newId("identity"), productId: "", sku: "", name: "", brand: "", variant: "",
    unit: "piece", customUnit: "", sellingPrice: "", saved: false,
  });
  const emptyBatch = (name = "Batch 1"): StockContainer => ({
    id: newId("batch"), name, recordingMode: "direct", detailsSaved: false,
    identities: [], identityDraft: emptyIdentity(), identitiesSaved: false,
    groups: [],
  });
  const emptyGroup = (): StockGroup => ({
    id: newId("group"), name: "", quantity: "1", unit: "piece", customUnitName: "", baseUnit: "",
    conversion: "1", buyingPrice: "", sellingPrice: "", types: [], saved: false,
    contentMode: "unset",
  });
  const emptyUnit = (): IndividualUnit => ({
    id: newId("unit"), modelName: "", brand: "", color: "", capacity: "",
    identifierType: "serial", identifierValue: "",
  });
  const emptyType = (): StockType => ({
    id: newId("type"), productId: "", identityId: "", name: "", brand: "", variant: "", quantity: "1",
    trackingMode: "quantity", units: [], unitDraft: emptyUnit(), saved: false,
  });
  const [batches, setBatches] = useState<StockContainer[]>(() => [emptyBatch()]);
  const [receiptDetailsSaved, setReceiptDetailsSaved] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState({
    supplier: "", reference: "", receivedAt: nowLocal(),
  });
  const [identityError, setIdentityError] = useState("");
  const [savedReceipt, setSavedReceipt] = useState<SavedStockReceipt | null>(null);
  const identityUnit = (identity: ProductIdentity) =>
    identity.unit === "other" ? identity.customUnit : identity.unit;

  const updateBatch = (batchId: string, change: (batch: StockContainer) => StockContainer) =>
    setBatches((all) => all.map((batch) => batch.id === batchId ? change(batch) : batch));
  const updateGroup = (batchId: string, groupId: string, change: (group: StockGroup) => StockGroup) =>
    updateBatch(batchId, (batch) => ({
      ...batch,
      groups: batch.groups.map((group) => group.id === groupId ? change(group) : group),
    }));
  const chooseGroupContent = (
    batchId: string,
    groupId: string,
    mode: "quantity" | "individual",
  ) => updateGroup(batchId, groupId, (group) => ({
    ...group,
    contentMode: mode,
    types: [{
      ...emptyType(),
      quantity: mode === "quantity" ? group.quantity : "1",
      trackingMode: mode,
    }],
  }));
  const addIndividualToGroup = (batchId: string, groupId: string) =>
    updateGroup(batchId, groupId, (group) => ({
      ...group,
      types: [...group.types, {...emptyType(), trackingMode: "individual"}],
    }));
  const addDirectProduct = (batch: StockContainer) => {
    const group = emptyGroup();
    group.types = [emptyType()];
    updateBatch(batch.id, (item) => ({ ...item, groups: [...item.groups, group] }));
  };
  const saveIdentity = async (batchId: string) => {
    if (!accessToken) return;
    const batch = batches.find((item) => item.id === batchId);
    if (!batch) return;
    let identity = batch.identityDraft;
    if (!identity.name.trim() || !identityUnit(identity).trim()) return;
    setIdentityError("");
    if (!identity.productId) {
      try {
        const response = await createProduct(businessId, accessToken, {
          name: identity.name,
          brand: identity.brand,
          variant: identity.variant,
          unit: identityUnit(identity),
          ...(identity.sellingPrice ? { selling_price: identity.sellingPrice } : {}),
        });
        const product = response.data;
        if (!product) return;
        identity = {
          ...identity,
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          customUnit: "",
        };
      } catch (reason) {
        setIdentityError(reason instanceof Error ? reason.message : t("errors.save"));
        return;
      }
    }
    updateBatch(batchId, (current) => ({
      ...current,
      identities: [...current.identities, { ...identity, saved: true }],
      identityDraft: emptyIdentity(),
    }));
  };
  const saveUnit = (batchId: string, groupId: string, typeId: string) =>
    updateGroup(batchId, groupId, (group) => ({
      ...group,
      types: group.types.map((type) =>
        type.id === typeId && type.units.length < Math.floor(Number(type.quantity) || 0)
          ? { ...type, units: [...type.units, type.unitDraft], unitDraft: emptyUnit() }
          : type,
      ),
    }));
  const updateUnitDraft = (batchId: string, groupId: string, typeId: string, change: Partial<IndividualUnit>) =>
    updateGroup(batchId, groupId, (group) => ({
      ...group,
      types: group.types.map((type) => type.id === typeId
        ? { ...type, unitDraft: { ...type.unitDraft, ...change } }
        : type),
    }));
  const chooseTypeIdentity = (
    batch: StockContainer,
    group: StockGroup,
    type: StockType,
    identityId: string,
  ) => {
    const identity = batch.identities.find((item) => item.id === identityId);
    const product = products.find((item) => item.id === identity?.productId);
    updateGroup(batch.id, group.id, (item) => ({
      ...item,
      name: batch.recordingMode === "direct" ? identity?.name ?? item.name : item.name,
      unit: batch.recordingMode === "direct" && identity ? identityUnit(identity) : item.unit,
      types: item.types.map((entry) => entry.id === type.id ? {
        ...entry,
        identityId,
        productId: identity?.productId ?? "",
        name: identity?.name ?? "",
        brand: identity?.brand ?? "",
        variant: identity?.variant ?? "",
        trackingMode: product?.tracking_mode ?? entry.trackingMode,
        units: [],
      } : entry),
    }));
  };
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const stockLine = (type: StockType, group: StockGroup) => ({
      catalog_key: type.identityId,
      quantity_received: type.quantity,
      tracking_mode: type.trackingMode,
      received_unit: group.unit === "other" ? group.customUnitName : group.unit,
      conversion_to_base: group.conversion || "1",
      ...(group.buyingPrice ? { unit_cost: group.buyingPrice } : {}),
      tracked_units: type.trackingMode === "individual"
        ? type.units.map((unit) => ({
            model_name: unit.modelName,
            brand: unit.brand,
            color: unit.color,
            capacity: unit.capacity,
            identifiers: unit.identifierValue.trim()
              ? [{ kind: unit.identifierType, value: unit.identifierValue.trim() }]
              : [],
          }))
        : [],
    });
    const body = {
      status: hasIncompleteStock ? "draft" : "received",
      supplier_name: receiptDetails.supplier,
      supplier_reference: receiptDetails.reference,
      additional_cost: values.additional_cost || "0",
      notes: values.notes,
      received_at: new Date(receiptDetails.receivedAt).toISOString(),
      catalog_items: batches.flatMap((batch) => batch.identities.map((identity) => ({
        key: identity.id,
        ...(identity.productId
          ? { product_id: identity.productId }
          : { item: {
              name: identity.name,
              brand: identity.brand,
              variant: identity.variant,
              unit: identityUnit(identity),
              ...(identity.sellingPrice ? { selling_price: identity.sellingPrice } : {}),
            } }),
      }))),
      batches: batches.map((batch) => ({
        name: batch.name,
        products: batch.recordingMode === "direct"
          ? batch.groups.flatMap((group) => group.types.map((type) => stockLine(type, group)))
          : [],
        groups: batch.recordingMode === "grouped" ? batch.groups.map((group) => ({
          name: group.name,
          quantity: group.quantity,
          unit: group.unit === "other" ? group.customUnitName : group.unit,
          ...(group.unit === "other" ? { custom_unit_name: group.customUnitName } : {}),
          base_unit: group.baseUnit,
          conversion_to_base: group.conversion || "1",
          ...(group.buyingPrice ? { buying_price: group.buyingPrice } : {}),
          ...(group.sellingPrice ? { selling_price: group.sellingPrice } : {}),
          types: group.types.map((type) => stockLine(type, group)),
        })) : [],
      })),
    };
    const saved = await submit(
      () => commerceWrite(businessId, accessToken, "stock-receipts", body),
      hasIncompleteStock ? t("success.draft") : t("success.stock"),
    );
    const savedResponse = saved as { data?: unknown } | null;
    if (savedResponse?.data)
      setSavedReceipt(savedResponse.data as SavedStockReceipt);
  };
  const startAnotherReceipt = () => {
    setSavedReceipt(null);
    setBatches([emptyBatch()]);
    setReceiptDetailsSaved(false);
    setReceiptDetails({ supplier: "", reference: "", receivedAt: nowLocal() });
    setIdentityError("");
  };
  const receipts = (records as { receipts?: Array<{
    id: string; reference: string; status: string; supplier_name: string;
    batches: Array<{ id: string; name: string; groups: Array<{ id: string }> }>;
  }> } | null)?.receipts ?? [];
  const savedUnits = (records as { units?: Array<{ id: string; name: string }> } | null)?.units ?? [];
  const hasIncompleteStock = batches.some((batch) =>
    !receiptDetailsSaved || !batch.detailsSaved || !batch.identitiesSaved || !batch.identities.length ||
    !batch.groups.length || batch.groups.some((group) =>
      (batch.recordingMode === "grouped" && (!group.saved || group.contentMode === "unset")) ||
      !group.types.length || group.types.some((type) => !type.identityId || !type.saved) ||
      group.types.length > 0 && group.types.reduce(
        (total, type) => total + Number(type.quantity || 0), 0,
      ) !== Number(group.quantity || 0) || group.types.some((type) =>
        type.trackingMode === "individual" && type.units.length !== (
          batch.recordingMode === "grouped" ? 1 : Math.floor(Number(type.quantity) || 0)
        ),
      ),
    ),
  );
  if (savedReceipt)
    return <SavedReceiptSummary receipt={savedReceipt} startAnother={startAnotherReceipt} t={t} />;
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <form className={`${panel} grid gap-4`} onSubmit={onSubmit}>
        <h2 className="font-bold">{t("forms.stock")}</h2>
        {!receiptDetailsSaved ? <div className="grid gap-3"><div className="grid gap-3 sm:grid-cols-2"><Label text={t("fields.supplier")}><Input value={receiptDetails.supplier} onChange={(e) => setReceiptDetails((current) => ({...current, supplier: e.target.value}))} /></Label><Label text={t("fields.reference")}><Input value={receiptDetails.reference} onChange={(e) => setReceiptDetails((current) => ({...current, reference: e.target.value}))} /></Label><Label text={t("fields.date")}><Input required type="datetime-local" value={receiptDetails.receivedAt} onChange={(e) => setReceiptDetails((current) => ({...current, receivedAt: e.target.value}))} /></Label></div><Button type="button" onClick={() => setReceiptDetailsSaved(Boolean(receiptDetails.receivedAt))}>{t("actions.enter")}</Button></div> : <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><span>{receiptDetails.supplier || t("fields.supplierNotEntered")} · {new Date(receiptDetails.receivedAt).toLocaleDateString()}</span><Button type="button" variant="ghost" onClick={() => setReceiptDetailsSaved(false)}>{t("actions.edit")}</Button></div>}
        {receiptDetailsSaved ? <>
        {batches.map((batch, batchIndex) => (
          <div className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800" key={batch.id}>
            {!batch.detailsSaved ? <div className="grid gap-3"><div className="flex items-end gap-3"><Label text={t("fields.batchName")}><Input required value={batch.name} onChange={(e) => updateBatch(batch.id, (item) => ({...item, name: e.target.value}))} /></Label>{batches.length > 1 ? <Button type="button" variant="ghost" onClick={() => setBatches((all) => all.filter((item) => item.id !== batch.id))}>{t("actions.removeBatch")}</Button> : null}</div><Button type="button" onClick={() => updateBatch(batch.id, (item) => ({...item, detailsSaved: Boolean(item.name.trim())}))}>{t("actions.enter")}</Button></div> : <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><div><strong>{batch.name}</strong><p className="text-xs text-slate-500">{t("batchPosition", {number: batchIndex + 1})}</p></div><Button type="button" variant="ghost" onClick={() => updateBatch(batch.id, (item) => ({...item, detailsSaved: false}))}>{t("actions.edit")}</Button></div>}
            {batch.detailsSaved ? <>
            {!batch.identitiesSaved ? <section className="grid gap-3 rounded-xl border border-orange-200 p-3 dark:border-orange-900"><div><h3 className="font-semibold">{t("identitiesTitle")}</h3><p className="text-xs text-slate-500">{t("identitiesHelp")}</p></div>{batch.identities.length ? <div className="flex flex-wrap gap-2">{batch.identities.map((identity) => <span className="rounded-full bg-orange-50 px-3 py-1 text-xs dark:bg-orange-950" key={identity.id}>{identity.name} · {identityUnit(identity)}{identity.sku ? ` · ${identity.sku}` : ""}</span>)}</div> : null}<div className="grid gap-3 sm:grid-cols-2"><Label text={t("fields.product")}><Select value={batch.identityDraft.productId} onChange={(e) => { const product = products.find((item) => item.id === e.target.value); updateBatch(batch.id, (item) => ({...item, identityDraft: {...item.identityDraft, productId: e.target.value, sku: product?.sku ?? "", name: product?.name ?? "", brand: product?.brand ?? "", variant: product?.variant ?? "", unit: product?.unit ?? "piece", customUnit: "", sellingPrice: product?.selling_price ?? ""}})); }}><option value="">{t("actions.newItem")}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku} · {product.unit}</option>)}</Select></Label><Label text={t("fields.name")}><Input disabled={Boolean(batch.identityDraft.productId)} required value={batch.identityDraft.name} onChange={(e) => updateBatch(batch.id, (item) => ({...item, identityDraft: {...item.identityDraft, name: e.target.value}}))} /></Label>{!batch.identityDraft.productId ? <><Label text={t("fields.brandOptional")}><Input value={batch.identityDraft.brand} onChange={(e) => updateBatch(batch.id, (item) => ({...item, identityDraft: {...item.identityDraft, brand: e.target.value}}))} /></Label><Label text={t("fields.variant")}><Input value={batch.identityDraft.variant} onChange={(e) => updateBatch(batch.id, (item) => ({...item, identityDraft: {...item.identityDraft, variant: e.target.value}}))} /></Label></> : null}<Label text={t("fields.baseUnitRequired")}><Select disabled={Boolean(batch.identityDraft.productId)} value={batch.identityDraft.unit} onChange={(e) => updateBatch(batch.id, (item) => ({...item, identityDraft: {...item.identityDraft, unit: e.target.value}}))}>{unitOptions.map((unit) => <option key={unit} value={unit}>{t(`units.${unit}`)}</option>)}{savedUnits.map((unit) => <option key={unit.id} value={unit.name}>{unit.name}</option>)}<option value="other">{t("units.other")}</option></Select></Label>{batch.identityDraft.unit === "other" ? <Label text={t("fields.customUnit")}><Input required value={batch.identityDraft.customUnit} onChange={(e) => updateBatch(batch.id, (item) => ({...item, identityDraft: {...item.identityDraft, customUnit: e.target.value}}))} /></Label> : null}<Label text={t("fields.price")}><Input disabled={Boolean(batch.identityDraft.productId)} min="0" step="0.01" type="number" value={batch.identityDraft.sellingPrice} onChange={(e) => updateBatch(batch.id, (item) => ({...item, identityDraft: {...item.identityDraft, sellingPrice: e.target.value}}))} /></Label></div>{identityError ? <p className="text-sm text-red-600">{identityError}</p> : null}<div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant="outline" onClick={() => saveIdentity(batch.id)}>{t("actions.enter")}</Button><Button disabled={!batch.identities.length} type="button" onClick={() => updateBatch(batch.id, (item) => ({...item, identitiesSaved: true}))}>{t("actions.finishIdentities")}</Button></div></section> : <div className="flex items-center justify-between rounded-lg bg-orange-50 p-3 dark:bg-orange-950"><span>{t("identityCount", {count: batch.identities.length})}</span><Button type="button" variant="ghost" onClick={() => updateBatch(batch.id, (item) => ({...item, identitiesSaved: false}))}>{t("actions.edit")}</Button></div>}
            {batch.identitiesSaved ? <>
            <Label text={t("fields.recordingMode")}><Select value={batch.recordingMode} onChange={(e) => updateBatch(batch.id, (item) => ({...item, recordingMode: e.target.value as StockContainer["recordingMode"], groups: []}))}><option value="direct">{t("values.direct")}</option><option value="grouped">{t("values.grouped")}</option></Select></Label>
            <h3 className="font-semibold">{batch.recordingMode === "direct" ? t("productsInBatch") : t("groupsTitle")}</h3>
            {batch.groups.map((group) => (
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-900" key={group.id}>
                {!group.saved || batch.recordingMode === "direct" ? <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {batch.recordingMode === "grouped" ? <Label text={t("fields.groupName")}><Input required value={group.name} onChange={(e) => updateGroup(batch.id, group.id, (item) => ({...item, name: e.target.value}))} /></Label> : null}
                  <Label text={t("fields.quantity")}><Input min="0.001" required step="0.001" type="number" value={group.quantity} onChange={(e) => updateGroup(batch.id, group.id, (item) => ({...item, quantity: e.target.value, types: batch.recordingMode === "direct" ? item.types.map((type) => ({...type, quantity: e.target.value})) : item.types}))} /></Label>
                  <Label text={t("fields.unit")}><Select required value={group.unit} onChange={(e) => updateGroup(batch.id, group.id, (item) => ({...item, unit: e.target.value}))}>{unitOptions.map((unit) => <option key={unit} value={unit}>{t(`units.${unit}`)}</option>)}{savedUnits.map((unit) => <option key={unit.id} value={unit.name}>{unit.name}</option>)}<option value="other">{t("units.other")}</option></Select></Label>
                  {group.unit === "other" ? <Label text={t("fields.customUnit")}><Input required value={group.customUnitName} onChange={(e) => updateGroup(batch.id, group.id, (item) => ({...item, customUnitName: e.target.value}))} /></Label> : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label text={t("fields.buyingPrice")}><Input min="0" step="0.01" type="number" value={group.buyingPrice} onChange={(e) => updateGroup(batch.id, group.id, (item) => ({...item, buyingPrice: e.target.value}))} /></Label>
                  <Label text={t("fields.price")}><Input min="0" step="0.01" type="number" value={group.sellingPrice} onChange={(e) => updateGroup(batch.id, group.id, (item) => ({...item, sellingPrice: e.target.value}))} /></Label>
                  <Label text={t("fields.baseUnit")}><Input value={group.baseUnit} onChange={(e) => updateGroup(batch.id, group.id, (item) => ({...item, baseUnit: e.target.value}))} /></Label>
                  <Label text={t("fields.conversion")}><Input min="0.000001" step="0.000001" type="number" value={group.conversion} onChange={(e) => updateGroup(batch.id, group.id, (item) => ({...item, conversion: e.target.value}))} /></Label>
                </div>
                {batch.recordingMode === "grouped" ? <Button type="button" onClick={() => updateGroup(batch.id, group.id, (item) => ({...item, saved: Boolean(item.name.trim() && Number(item.quantity) > 0)}))}>{t("actions.enter")}</Button> : null}
                </> : <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"><span><strong>{group.name}</strong> · {group.quantity} {group.unit}</span><Button type="button" variant="ghost" onClick={() => updateGroup(batch.id, group.id, (item) => ({...item, saved: false}))}>{t("actions.edit")}</Button></div>}
                {batch.recordingMode === "grouped" && group.saved && group.contentMode === "unset" ? <div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant="outline" onClick={() => chooseGroupContent(batch.id, group.id, "quantity")}>{t("actions.recordQuantity")}</Button><Button type="button" variant="outline" onClick={() => chooseGroupContent(batch.id, group.id, "individual")}>{t("actions.recordIndividuals")}</Button></div> : null}
                {(batch.recordingMode === "direct" || group.contentMode !== "unset") ? <>
                {group.types.map((type) => (
                  <div className="grid gap-3 border-l-2 border-orange-400 pl-3" key={type.id}>
                    {!type.saved ? <>
                    {group.contentMode !== "individual" ? <div className="grid gap-3 sm:grid-cols-2">
                      <Select required value={type.identityId} onChange={(e) => chooseTypeIdentity(batch, group, type, e.target.value)}><option value="">{t("fields.chooseIdentity")}</option>{batch.identities.map((identity) => <option key={identity.id} value={identity.id}>{identity.name} · {identityUnit(identity)}</option>)}</Select>
                      {type.identityId ? <span className="self-center text-sm">{type.name} · {identityUnit(batch.identities.find((identity) => identity.id === type.identityId)!)}</span> : null}
                      {batch.recordingMode === "grouped" && group.contentMode === "quantity" ? <Input disabled min="0.001" placeholder={t("fields.quantity")} required step="0.001" type="number" value={group.quantity} /> : null}
                    </div> : null}
                    {batch.recordingMode === "direct" ? <Select value={type.trackingMode} onChange={(e) => updateGroup(batch.id, group.id, (item) => ({...item, types: item.types.map((entry) => entry.id === type.id ? {...entry, trackingMode: e.target.value as StockType["trackingMode"], units: []} : entry)}))}><option value="quantity">{t("values.quantity")}</option><option value="individual">{t("values.individual")}</option></Select> : null}
                    {batch.recordingMode === "grouped" && group.contentMode === "individual" ? <><div className="grid gap-3 sm:grid-cols-2"><Label text={t("fields.modelName")}><Input value={type.unitDraft.modelName} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {modelName: e.target.value})} /></Label><Label text={t("fields.brand")}><Input value={type.unitDraft.brand} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {brand: e.target.value})} /></Label><Label text={t("fields.color")}><Input value={type.unitDraft.color} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {color: e.target.value})} /></Label><Label text={t("fields.capacity")}><Input value={type.unitDraft.capacity} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {capacity: e.target.value})} /></Label><Label text={t("fields.identifierType")}><Select value={type.unitDraft.identifierType} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {identifierType: e.target.value as IdentifierKind})}>{identifierOptions.map((kind) => <option key={kind} value={kind}>{t(`identifierTypes.${kind}`)}</option>)}</Select></Label><Label text={t("fields.identifierNumber")}><Input value={type.unitDraft.identifierValue} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {identifierValue: e.target.value})} /></Label></div><Label text={t("fields.chooseIdentity")}><Select required value={type.identityId} onChange={(e) => chooseTypeIdentity(batch, group, type, e.target.value)}><option value="">{t("fields.chooseIdentity")}</option>{batch.identities.map((identity) => <option key={identity.id} value={identity.id}>{identity.name} · {identity.sku}</option>)}</Select></Label></> : null}
                    <Button type="button" onClick={() => updateGroup(batch.id, group.id, (item) => ({...item, types: item.types.map((entry) => entry.id === type.id ? {...entry, quantity: group.contentMode === "quantity" ? group.quantity : entry.quantity, saved: Boolean(entry.identityId), units: group.contentMode === "individual" && entry.identityId ? [entry.unitDraft] : entry.units} : entry)}))}>{t("actions.enter")}</Button>
                    </> : <div className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 dark:bg-slate-950"><div>{batch.recordingMode === "grouped" && group.contentMode === "individual" ? <><strong>{type.units[0]?.modelName || t("individualItem", {number: group.types.findIndex((entry) => entry.id === type.id) + 1})}</strong><p className="text-xs text-slate-500">{[type.units[0]?.brand, type.units[0]?.color, type.units[0]?.capacity, type.units[0]?.identifierValue].filter(Boolean).join(" · ") || t("noIndividualDetails")}</p></> : <span><strong>{type.name}</strong> · {type.quantity} {identityUnit(batch.identities.find((identity) => identity.id === type.identityId)!)}</span>}</div><Button type="button" variant="ghost" onClick={() => updateGroup(batch.id, group.id, (item) => ({...item, types: item.types.map((entry) => entry.id === type.id ? {...entry, saved: false} : entry)}))}>{t("actions.edit")}</Button></div>}
                    {batch.recordingMode === "direct" && type.saved && type.trackingMode === "individual" ? <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"><p className="text-sm font-semibold">{t("unitProgress", {recorded: type.units.length, total: Math.floor(Number(type.quantity) || 0)})}</p>{type.units.length ? <div className="flex flex-wrap gap-2">{type.units.map((unit, unitIndex) => <span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800" key={unit.id}>{unitIndex + 1}. {unit.modelName || type.name}{unit.identifierValue ? ` · ${unit.identifierValue}` : ""}</span>)}</div> : null}{type.units.length < Math.floor(Number(type.quantity) || 0) ? <><div className="grid gap-3 sm:grid-cols-2"><Label text={t("fields.modelName")}><Input value={type.unitDraft.modelName} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {modelName: e.target.value})} /></Label><Label text={t("fields.brand")}><Input value={type.unitDraft.brand} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {brand: e.target.value})} /></Label><Label text={t("fields.color")}><Input value={type.unitDraft.color} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {color: e.target.value})} /></Label><Label text={t("fields.capacity")}><Input value={type.unitDraft.capacity} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {capacity: e.target.value})} /></Label><Label text={t("fields.identifierType")}><Select value={type.unitDraft.identifierType} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {identifierType: e.target.value as IdentifierKind})}>{identifierOptions.map((kind) => <option key={kind} value={kind}>{t(`identifierTypes.${kind}`)}</option>)}</Select></Label><Label text={t("fields.identifierNumber")}><Input value={type.unitDraft.identifierValue} onChange={(e) => updateUnitDraft(batch.id, group.id, type.id, {identifierValue: e.target.value})} /></Label></div><Button type="button" variant="outline" onClick={() => saveUnit(batch.id, group.id, type.id)}>{t("actions.saveAndAdd")}</Button></> : <p className="text-sm text-emerald-600">{t("allUnitsRecorded")}</p>}</div> : null}
                    <Button type="button" variant="ghost" onClick={() => batch.recordingMode === "direct" ? updateBatch(batch.id, (item) => ({...item, groups: item.groups.filter((entry) => entry.id !== group.id)})) : updateGroup(batch.id, group.id, (item) => ({...item, types: item.types.filter((entry) => entry.id !== type.id)}))}>{batch.recordingMode === "direct" ? t("actions.remove") : t("actions.removeType")}</Button>
                  </div>
                ))}
                {batch.recordingMode === "grouped" && group.contentMode === "individual" ? <><p className="text-xs text-slate-500">{t("individualProgress", {recorded: group.types.filter((type) => type.saved).length, total: Math.floor(Number(group.quantity) || 0)})}</p>{group.types.every((type) => type.saved) && group.types.length < Math.floor(Number(group.quantity) || 0) ? <Button type="button" variant="outline" onClick={() => addIndividualToGroup(batch.id, group.id)}>{t("actions.addAnotherIndividual")}</Button> : null}</> : null}
                {batch.recordingMode === "grouped" && group.contentMode === "quantity" && group.types.length ? <p className="text-xs text-slate-500">{t("typeBalance", {recorded: group.types.reduce((total, type) => total + Number(type.quantity || 0), 0), group: Number(group.quantity || 0)})}</p> : null}
                {batch.recordingMode === "grouped" ? <Button type="button" variant="ghost" onClick={() => updateBatch(batch.id, (item) => ({...item, groups: item.groups.filter((entry) => entry.id !== group.id)}))}>{t("actions.removeGroup")}</Button> : null}
                </> : null}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => batch.recordingMode === "direct" ? addDirectProduct(batch) : updateBatch(batch.id, (item) => ({...item, groups: [...item.groups, emptyGroup()]}))}>{batch.recordingMode === "direct" ? t("actions.addProduct") : t("actions.addGroup")}</Button>
            </> : null}
            </> : null}
            <p className="text-xs text-slate-500">{t("batchPosition", {number: batchIndex + 1})}</p>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setBatches((all) => [...all, emptyBatch(`Batch ${all.length + 1}`)])}>{t("actions.addBatch")}</Button>
        <div className="grid gap-3 sm:grid-cols-2"><Label text={t("fields.additionalCost")}><Input defaultValue="0" min="0" name="additional_cost" step="0.01" type="number" /></Label><Label text={t("fields.notes")}><Input name="notes" /></Label></div>
        <div className="sticky bottom-3 z-10 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/95"><Button disabled={busy || batches.some((batch) => !batch.groups.length)} type="submit">{hasIncompleteStock ? t("actions.saveDraft") : t("actions.finishStock")}</Button></div>
        </> : null}
      </form>
      <div className={panel}>
        <h2 className="font-bold">{t("receivedStock")}</h2>
        <div className="mt-4 space-y-2">
          {receipts.map((receipt) => <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900" key={receipt.id}><div className="flex justify-between"><strong>{receipt.reference}</strong><span>{receipt.status}</span></div><p className="text-xs text-slate-500">{receipt.supplier_name || "—"} · {receipt.batches.length} {t("batches")}</p></div>)}
        </div>
      </div>
    </div>
  );
}

function SavedReceiptSummary({
  receipt,
  startAnother,
  t,
}: {
  receipt: SavedStockReceipt;
  startAnother: () => void;
  t: T;
}) {
  const renderLine = (line: SavedStockLine) => (
    <div className="grid gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700" key={line.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><strong>{line.product_name}</strong><p className="text-xs text-slate-500">{line.product_sku}</p></div>
        <span className="text-sm">{line.quantity_remaining} / {line.quantity_received} {line.received_unit}</span>
      </div>
      <p className="text-xs text-slate-500">{t("fields.buyingPrice")}: {line.unit_cost || "—"} · {t("fields.price")}: {line.selling_price || "—"}</p>
      {line.tracked_units.length ? <div className="grid gap-2 sm:grid-cols-2">{line.tracked_units.map((unit) => <div className="rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-900" key={unit.id}><strong>{unit.model_name || line.product_name}</strong><p className="text-xs text-slate-500">{[unit.brand, unit.color, unit.capacity, unit.internal_serial, ...unit.identifiers.map((identifier) => `${identifier.kind}: ${identifier.value}`)].filter(Boolean).join(" · ")}</p></div>)}</div> : null}
    </div>
  );
  return (
    <section className={`${panel} grid gap-5`}>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
        <p className="font-bold">{receipt.status === "received" ? t("savedReceipt.received") : t("savedReceipt.draft")}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{receipt.reference} · {receipt.supplier_name || t("fields.supplierNotEntered")} · {new Date(receipt.received_at).toLocaleDateString()}</p>
      </div>
      <div className="grid gap-4">
        {receipt.batches.map((batch) => <article className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800" key={batch.id}><h3 className="font-bold">{batch.name}</h3>{batch.groups.map((group) => <section className="grid gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900" key={group.id}><div className="flex flex-wrap justify-between gap-2"><strong>{group.name}</strong><span className="text-sm">{group.quantity} {group.unit}</span></div><p className="text-xs text-slate-500">{t("fields.buyingPrice")}: {group.buying_price || "—"} · {t("fields.price")}: {group.selling_price || "—"}</p>{group.types.map(renderLine)}</section>)}</article>)}
        {receipt.lines.length ? <section className="grid gap-3"><h3 className="font-bold">{t("savedReceipt.available")}</h3>{receipt.lines.map(renderLine)}</section> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900"><span className="text-slate-500">{t("fields.additionalCost")}</span><p className="font-semibold">{receipt.additional_cost}</p></div><div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900"><span className="text-slate-500">{t("savedReceipt.status")}</span><p className="font-semibold">{receipt.status}</p></div></div>
      <Button type="button" onClick={startAnother}>{t("actions.recordAnotherStock")}</Button>
    </section>
  );
}

function Sales({
  accessToken,
  businessId,
  busy,
  products,
  sales,
  submit,
  t,
}: {
  accessToken: string | null;
  businessId: string;
  busy: boolean;
  products: Product[];
  sales: Sale[];
  submit: (op: () => Promise<unknown>, msg: string) => Promise<unknown | null>;
  t: T;
}) {
  const { businesses } = useWorkspace();
  const permissions =
    businesses.find((business) => business.id === businessId)?.membership
      .permissions ?? [];
  const [editing, setEditing] = useState<Sale | null>(null);
  const [lines, setLines] = useState<SaleLine[]>([
    { product_id: "", quantity: "1", unit_price: "" },
  ]);
  const beginEdit = (sale: Sale) => {
    setEditing(sale);
    setLines(
      sale.items.map((item) => ({
        product_id: item.product,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const items = lines.map((line) => ({
      ...line,
      unit_price:
        line.unit_price ||
        products.find((p) => p.id === line.product_id)?.selling_price,
    }));
    const body = {
      ...values,
      sold_at: new Date(String(values.sold_at)).toISOString(),
      items,
    };
    void submit(
      () =>
        editing
          ? updateSale(businessId, editing.id, accessToken, body)
          : createSale(businessId, accessToken, body),
      editing ? t("success.saleEdited") : t("success.sale"),
    );
    setEditing(null);
  };
  const onVoid = (sale: Sale) => {
    if (!accessToken) return;
    const reason = window.prompt(t("actions.voidReason"));
    if (reason)
      void submit(
        () => voidSale(businessId, sale.id, accessToken, reason),
        t("success.saleVoided"),
      );
  };
  return (
    <div className="space-y-5">
      <form
        className={`${panel} grid gap-4`}
        key={editing?.id ?? "new"}
        onSubmit={onSubmit}
      >
        <div className="flex justify-between">
          <h2 className="font-bold">
            {editing ? t("forms.editSale") : t("forms.sale")}
          </h2>
          {editing ? (
            <Button
              onClick={() => {
                setEditing(null);
                setLines([{ product_id: "", quantity: "1", unit_price: "" }]);
              }}
              type="button"
              variant="ghost"
            >
              {t("actions.cancel")}
            </Button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Label text={t("fields.saleType")}>
            <Select
              defaultValue={editing?.sale_type ?? "retail"}
              name="sale_type"
            >
              <option value="retail">{t("values.retail")}</option>
              <option value="wholesale">{t("values.wholesale")}</option>
            </Select>
          </Label>
          <Label text={t("fields.customer")}>
            <Input defaultValue={editing?.customer_name} name="customer_name" />
          </Label>
          <Label text={t("fields.phone")}>
            <Input
              defaultValue={editing?.customer_phone}
              name="customer_phone"
            />
          </Label>
        </div>
        {lines.map((line, index) => (
          <div
            className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_8rem_9rem_auto] dark:bg-slate-900"
            key={index}
          >
            <Select
              value={line.product_id}
              onChange={(e) =>
                setLines((all) =>
                  all.map((x, i) =>
                    i === index ? { ...x, product_id: e.target.value } : x,
                  ),
                )
              }
              required
            >
              <option value="">{t("fields.product")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.current_quantity})
                </option>
              ))}
            </Select>
            <Input
              min="0.001"
              onChange={(e) =>
                setLines((all) =>
                  all.map((x, i) =>
                    i === index ? { ...x, quantity: e.target.value } : x,
                  ),
                )
              }
              step="0.001"
              type="number"
              value={line.quantity}
            />
            <Input
              onChange={(e) =>
                setLines((all) =>
                  all.map((x, i) =>
                    i === index ? { ...x, unit_price: e.target.value } : x,
                  ),
                )
              }
              placeholder={t("fields.price")}
              step="0.01"
              type="number"
              value={line.unit_price}
            />
            <Button
              onClick={() =>
                setLines((all) => all.filter((_, i) => i !== index))
              }
              type="button"
              variant="outline"
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          onClick={() =>
            setLines((all) => [
              ...all,
              { product_id: "", quantity: "1", unit_price: "" },
            ])
          }
          type="button"
          variant="outline"
        >
          {t("actions.addLine")}
        </Button>
        <div className="grid gap-3 sm:grid-cols-3">
          <Label text={t("fields.discount")}>
            <Input
              defaultValue={editing?.discount ?? "0"}
              min="0"
              name="discount"
              step="0.01"
              type="number"
            />
          </Label>
          <Label text={t("fields.payment")}>
            <Select
              defaultValue={editing?.payment_status ?? "paid"}
              name="payment_status"
            >
              <option value="paid">{t("values.paid")}</option>
              <option value="partial">{t("values.partial")}</option>
              <option value="unpaid">{t("values.unpaid")}</option>
            </Select>
          </Label>
          <Label text={t("fields.date")}>
            <Input
              defaultValue={editing ? editing.sold_at.slice(0, 16) : nowLocal()}
              name="sold_at"
              type="datetime-local"
            />
          </Label>
        </div>
        <Button disabled={busy || !accessToken} type="submit">
          {editing ? t("actions.saveCorrection") : t("actions.recordSale")}
        </Button>
      </form>
      <SalesList
        canVoid={permissions.includes("commerce.sales.void")}
        onEdit={beginEdit}
        onVoid={onVoid}
        sales={sales}
        t={t}
      />
    </div>
  );
}

function Returns({
  accessToken,
  businessId,
  busy,
  sales,
  submit,
  t,
}: {
  accessToken: string | null;
  businessId: string;
  busy: boolean;
  sales: Sale[];
  submit: (op: () => Promise<unknown>, msg: string) => Promise<unknown | null>;
  t: T;
}) {
  const [saleId, setSaleId] = useState("");
  const items = useMemo(
    () => sales.find((s) => s.id === saleId)?.items ?? [],
    [saleId, sales],
  );
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body: Record<string, unknown> = {
      sale_id: saleId,
      resolution: values.resolution,
      reason: values.reason,
      returned_at: new Date(String(values.returned_at)).toISOString(),
      items: [
        {
          sale_item_id: values.sale_item_id,
          quantity: values.quantity,
          condition: values.condition,
        },
      ],
    };
    void submit(
      () => commerceWrite(businessId, accessToken, "returns", body),
      t("success.return"),
    );
  };
  return (
    <form
      className={`${panel} mx-auto grid max-w-3xl gap-4`}
      onSubmit={onSubmit}
    >
      <h2 className="font-bold">{t("forms.return")}</h2>
      <Label text={t("fields.receipt")}>
        <Select
          onChange={(e) => setSaleId(e.target.value)}
          required
          value={saleId}
        >
          <option value="">—</option>
          {sales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.receipt_number}
            </option>
          ))}
        </Select>
      </Label>
      <Label text={t("fields.product")}>
        <Select name="sale_item_id" required>
          <option value="">—</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.product_name}
            </option>
          ))}
        </Select>
      </Label>
      <div className="grid grid-cols-2 gap-3">
        <Label text={t("fields.quantity")}>
          <Input name="quantity" required step="0.001" type="number" />
        </Label>
        <Label text={t("fields.condition")}>
          <Select name="condition">
            <option value="sellable">{t("values.sellable")}</option>
            <option value="damaged">{t("values.damaged")}</option>
          </Select>
        </Label>
      </div>
      <Label text={t("fields.resolution")}>
        <Select name="resolution">
          <option value="refund">{t("values.refund")}</option>
          <option value="replacement">{t("values.replacement")}</option>
          <option value="credit">{t("values.credit")}</option>
        </Select>
      </Label>
      <Label text={t("fields.reason")}>
        <Input name="reason" required />
      </Label>
      <Input
        defaultValue={nowLocal()}
        name="returned_at"
        type="datetime-local"
      />
      <Button disabled={busy} type="submit">
        {t("actions.recordReturn")}
      </Button>
    </form>
  );
}

function Finance({
  accessToken,
  businessId,
  busy,
  records,
  submit,
  t,
  view,
}: {
  accessToken: string | null;
  businessId: string;
  busy: boolean;
  records: unknown;
  submit: (op: () => Promise<unknown>, msg: string) => Promise<unknown | null>;
  t: T;
  view: "expenses" | "budgets";
}) {
  const list =
    (records as Record<string, Array<Record<string, string>>> | null)?.[view] ??
    [];
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    if (view === "expenses")
      body.incurred_at = new Date(String(body.incurred_at)).toISOString();
    else body.month = `${body.month}-01`;
    void submit(
      () => commerceWrite(businessId, accessToken, view, body),
      t(`success.${view}`),
    );
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <form className={`${panel} grid gap-4`} onSubmit={onSubmit}>
        <h2 className="font-bold">{t(`forms.${view}`)}</h2>
        <Label text={t("fields.category")}>
          <Input name="category" required />
        </Label>
        {view === "expenses" ? (
          <>
            <Label text={t("fields.description")}>
              <Input name="description" />
            </Label>
            <Label text={t("fields.amount")}>
              <Input name="amount" required step="0.01" type="number" />
            </Label>
            <Input
              defaultValue={nowLocal()}
              name="incurred_at"
              type="datetime-local"
            />
          </>
        ) : (
          <>
            <Label text={t("fields.month")}>
              <Input name="month" required type="month" />
            </Label>
            <Label text={t("fields.planned")}>
              <Input name="planned_amount" required step="0.01" type="number" />
            </Label>
          </>
        )}
        <Button disabled={busy} type="submit">
          {t("actions.save")}
        </Button>
      </form>
      <div className={panel}>
        {list.map((row) => (
          <div
            className="flex justify-between border-b border-slate-100 py-3 text-sm dark:border-slate-800"
            key={row.id}
          >
            <span>{row.category}</span>
            <strong>{money(row.amount ?? row.planned_amount)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function Label({ children, text }: { children: ReactNode; text: string }) {
  return (
    <label className={field}>
      {text}
      {children}
    </label>
  );
}
function ListProducts({ products, t }: { products: Product[]; t: T }) {
  return (
    <div className={panel}>
      <h2 className="font-bold">{t("catalog")}</h2>
      <div className="mt-4 space-y-2">
        {products.map((p) => (
          <div
            className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm dark:border-slate-800"
            key={p.id}
          >
            <div>
              <strong>{p.name}</strong>
              <p className="text-xs text-slate-500">
                {p.sku || p.variant || p.unit}
              </p>
            </div>
            <div className="text-right">
              <strong>{p.current_quantity}</strong>
              <p className="text-xs text-slate-500">{money(p.selling_price)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function SalesList({
  canVoid,
  onEdit,
  onVoid,
  sales,
  t,
}: {
  canVoid: boolean;
  onEdit: (sale: Sale) => void;
  onVoid: (sale: Sale) => void;
  sales: Sale[];
  t: T;
}) {
  return (
    <div className={panel}>
      <h2 className="font-bold">{t("recentSales")}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="pb-3">{t("fields.receipt")}</th>
              <th>{t("fields.customer")}</th>
              <th>{t("fields.payment")}</th>
              <th className="text-right">{t("fields.amount")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr
                className="border-t border-slate-100 dark:border-slate-800"
                key={s.id}
              >
                <td className="py-3 font-semibold">{s.receipt_number}</td>
                <td>{s.customer_name || "—"}</td>
                <td>{s.payment_status}</td>
                <td className="text-right font-bold">{money(s.total)}</td>
                <td className="space-x-2 text-right">
                  <Button
                    onClick={() => onEdit(s)}
                    size="small"
                    variant="outline"
                  >
                    {t("actions.edit")}
                  </Button>
                  {canVoid ? (
                    <Button
                      onClick={() => onVoid(s)}
                      size="small"
                      variant="ghost"
                    >
                      {t("actions.void")}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Skeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {[1, 2, 3, 4].map((x) => (
        <div
          className={`${panel} h-32 animate-pulse bg-slate-50 dark:bg-slate-900`}
          key={x}
        />
      ))}
    </div>
  );
}

export { CommerceWorkspace };
export type { CommerceView };
