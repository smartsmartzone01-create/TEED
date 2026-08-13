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
            (await commerceRead(businessId, accessToken, view, signal)).data ??
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
      await operation();
      notify({ message, tone: "success" });
      await load();
    } catch (reason) {
      const messageText =
        reason instanceof Error ? reason.message : t("errors.save");
      setError(messageText);
      notify({ message: messageText, tone: "error" });
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
        <Products
          accessToken={accessToken}
          businessId={businessId}
          busy={busy}
          products={products}
          submit={submit}
          t={t}
        />
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

function Products({
  accessToken,
  businessId,
  busy,
  products,
  submit,
  t,
}: {
  accessToken: string | null;
  businessId: string;
  busy: boolean;
  products: Product[];
  submit: (op: () => Promise<unknown>, msg: string) => Promise<void>;
  t: T;
}) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    const form = new FormData(event.currentTarget);
    void submit(
      () => createProduct(businessId, accessToken, Object.fromEntries(form)),
      t("success.product"),
    );
    event.currentTarget.reset();
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <form className={`${panel} grid gap-4`} onSubmit={onSubmit}>
        <h2 className="font-bold">{t("forms.product")}</h2>
        <Label text={t("fields.name")}>
          <Input name="name" required />
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Label text={t("fields.sku")}>
            <Input name="sku" />
          </Label>
          <Label text={t("fields.variant")}>
            <Input name="variant" />
          </Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Label text={t("fields.price")}>
            <Input
              min="0"
              name="selling_price"
              required
              step="0.01"
              type="number"
            />
          </Label>
          <Label text={t("fields.unit")}>
            <Input defaultValue="item" name="unit" required />
          </Label>
        </div>
        <Label text={t("fields.lowStock")}>
          <Input
            defaultValue="5"
            min="0"
            name="low_stock_threshold"
            step="0.001"
            type="number"
          />
        </Label>
        <Button disabled={busy} type="submit">
          {t("actions.saveProduct")}
        </Button>
      </form>
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
  submit: (op: () => Promise<unknown>, msg: string) => Promise<void>;
  t: T;
}) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    body.received_at = new Date(String(body.received_at)).toISOString();
    void submit(
      () => commerceWrite(businessId, accessToken, "inventory", body),
      t("success.stock"),
    );
    event.currentTarget.reset();
  };
  const movements =
    (
      records as {
        movements?: Array<{
          id: string;
          product_name: string;
          kind: string;
          quantity_delta: string;
        }>;
      } | null
    )?.movements ?? [];
  return (
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <form className={`${panel} grid gap-4`} onSubmit={onSubmit}>
        <h2 className="font-bold">{t("forms.stock")}</h2>
        <ProductSelect products={products} />
        <div className="grid grid-cols-2 gap-3">
          <Label text={t("fields.quantity")}>
            <Input
              min="0.001"
              name="quantity_received"
              required
              step="0.001"
              type="number"
            />
          </Label>
          <Label text={t("fields.unitCost")}>
            <Input
              min="0"
              name="unit_cost"
              required
              step="0.01"
              type="number"
            />
          </Label>
        </div>
        <Label text={t("fields.additionalCost")}>
          <Input
            defaultValue="0"
            min="0"
            name="additional_cost"
            step="0.01"
            type="number"
          />
        </Label>
        <Label text={t("fields.reference")}>
          <Input name="reference" />
        </Label>
        <Label text={t("fields.supplier")}>
          <Input name="supplier_name" />
        </Label>
        <Label text={t("fields.date")}>
          <Input
            defaultValue={nowLocal()}
            name="received_at"
            required
            type="datetime-local"
          />
        </Label>
        <Button disabled={busy} type="submit">
          {t("actions.receiveStock")}
        </Button>
      </form>
      <div className={panel}>
        <h2 className="font-bold">{t("movements")}</h2>
        <div className="mt-4 space-y-2">
          {movements.map((item) => (
            <div
              className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900"
              key={item.id}
            >
              <span>
                {item.product_name} · {item.kind}
              </span>
              <strong>{item.quantity_delta}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
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
  submit: (op: () => Promise<unknown>, msg: string) => Promise<void>;
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
  submit: (op: () => Promise<unknown>, msg: string) => Promise<void>;
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
  submit: (op: () => Promise<unknown>, msg: string) => Promise<void>;
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
function ProductSelect({ products }: { products: Product[] }) {
  return (
    <Select name="product_id" required>
      <option value="">Select product</option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
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
