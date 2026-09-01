"use client";

import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  HandCoins,
  Plus,
  Printer,
  Share2,
  Upload,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import {
  createFinancingAgreement,
  createFinancingPayment,
  downloadFinancingDocument,
  getFinancingAgreements,
  getFinancingAvailability,
  uploadFinancingDocument,
} from "@/services/commerce/financing";
import { isRequestCancelled } from "@/services/global/api-client";
import type {
  FinancingAgreement,
  FinancingAgreementType,
  FinancingAvailabilityProduct,
  FinancingFrequency,
  FinancingMarketType,
  FinancingMode,
  FinancingSource,
  FinancingTransactionType,
  FinancingWarrantyMonths,
} from "@/types/commerce/financing";
import { formatQuantityWithUnit } from "@/utils/commerce/quantity";

const shell =
  "rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";
const field = "grid gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 sm:text-xs";
const control =
  "h-9 rounded-md border-slate-300 bg-white text-sm shadow-none dark:border-slate-700 dark:bg-slate-950";
const warrantyOptions: FinancingWarrantyMonths[] = [3, 6, 12, 24];
const stepKeys = ["setup", "customer", "products", "terms", "review"] as const;

type LineDraft = {
  product_id: string;
  tracked_unit_id: string;
  item_name: string;
  quantity: string;
  unit_price: string;
  acquisition_unit_cost: string;
  warranty_months: FinancingWarrantyMonths | null;
};

const emptyLine = (): LineDraft => ({
  product_id: "",
  tracked_unit_id: "",
  item_name: "",
  quantity: "1",
  unit_price: "",
  acquisition_unit_cost: "",
  warranty_months: null,
});

const money = (value: string | number, locale: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(parsed)
    : String(value);
};

function FinancingWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceFinancing");
  const locale = useLocale();
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const { businesses } = useWorkspace();
  const membership = businesses.find((business) => business.id === businessId)?.membership;
  const permissions = membership?.permissions ?? [];
  const canRecord = permissions.includes("commerce.financing.record");
  const canRecordPayment = permissions.includes("commerce.financing.payment.record");
  const canManageDocuments = permissions.includes("commerce.financing.documents.manage");

  const [agreements, setAgreements] = useState<FinancingAgreement[]>([]);
  const [availability, setAvailability] = useState<FinancingAvailabilityProduct[]>([]);
  const [showRecorder, setShowRecorder] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [agreementType, setAgreementType] = useState<FinancingAgreementType>("loan");
  const [transactionType, setTransactionType] = useState<FinancingTransactionType>("normal");
  const [source, setSource] = useState<FinancingSource>("stock");
  const [marketType, setMarketType] = useState<FinancingMarketType>("retail");
  const [financingMode, setFinancingMode] = useState<FinancingMode>("business");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerRegion, setCustomerRegion] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [contractTotal, setContractTotal] = useState("");
  const [upfrontCash, setUpfrontCash] = useState("0");
  const [tradeInItem, setTradeInItem] = useState("");
  const [tradeInCredit, setTradeInCredit] = useState("0");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [frequency, setFrequency] = useState<FinancingFrequency>("monthly");
  const [nextDueDate, setNextDueDate] = useState("");
  const [releaseThreshold, setReleaseThreshold] = useState("100");
  const [partnerName, setPartnerName] = useState("");
  const [partnerSettlement, setPartnerSettlement] = useState("");
  const [businessCommission, setBusinessCommission] = useState("0");
  const [notes, setNotes] = useState("");
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, string>>({});
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({});
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, File | null>>({});

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      try {
        const [agreementResponse, availabilityResponse] = await Promise.all([
          getFinancingAgreements(businessId, accessToken, signal),
          getFinancingAvailability(businessId, accessToken, signal),
        ]);
        setAgreements(agreementResponse.data?.agreements ?? []);
        setAvailability(availabilityResponse.data?.products ?? []);
      } catch (reason) {
        if (!isRequestCancelled(reason)) {
          notify({
            message: reason instanceof Error ? reason.message : t("loadError"),
            tone: "error",
          });
        }
      }
    },
    [accessToken, businessId, notify, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const activeCount = agreements.filter((agreement) =>
    ["active", "due", "overdue"].includes(agreement.status),
  ).length;
  const dueCount = agreements.filter((agreement) =>
    ["due", "overdue"].includes(agreement.status),
  ).length;
  const outstandingTotal = agreements.reduce(
    (total, agreement) => total + Number(agreement.outstanding_balance || 0),
    0,
  );

  const reset = () => {
    setStep(0);
    setAgreementType("loan");
    setTransactionType("normal");
    setSource("stock");
    setMarketType("retail");
    setFinancingMode("business");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerRegion("");
    setLines([emptyLine()]);
    setContractTotal("");
    setUpfrontCash("0");
    setTradeInItem("");
    setTradeInCredit("0");
    setInstallmentAmount("");
    setFrequency("monthly");
    setNextDueDate("");
    setReleaseThreshold("100");
    setPartnerName("");
    setPartnerSettlement("");
    setBusinessCommission("0");
    setNotes("");
  };

  const closeRecorder = () => {
    reset();
    setShowRecorder(false);
  };

  const updateLine = (index: number, change: Partial<LineDraft>) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...change } : line,
      ),
    );
  };

  const chooseProduct = (index: number, productId: string) => {
    const product = availability.find((item) => item.id === productId);
    updateLine(index, {
      product_id: productId,
      tracked_unit_id: "",
      quantity: "1",
      unit_price: product?.selling_price ?? "",
    });
  };

  const stepValid = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return Boolean(customerName.trim());
    if (step === 2) {
      return lines.every((line) => {
        if (!line.unit_price || Number(line.quantity) <= 0) return false;
        if (source === "independent") return Boolean(line.item_name.trim());
        const product = availability.find((item) => item.id === line.product_id);
        if (!product) return false;
        return product.tracking_mode !== "individual" || Boolean(line.tracked_unit_id);
      });
    }
    if (step === 3) {
      if (!contractTotal || !installmentAmount || !nextDueDate) return false;
      if (transactionType === "upfront" && Number(upfrontCash) <= 0) return false;
      if (
        transactionType === "trade_in" &&
        (!tradeInItem.trim() || Number(tradeInCredit) <= 0)
      )
        return false;
      if (
        financingMode === "partner" &&
        (!partnerName.trim() || !partnerSettlement)
      )
        return false;
      return true;
    }
    return true;
  }, [
    availability,
    contractTotal,
    customerName,
    financingMode,
    installmentAmount,
    lines,
    nextDueDate,
    partnerName,
    partnerSettlement,
    source,
    step,
    tradeInCredit,
    tradeInItem,
    transactionType,
    upfrontCash,
  ]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !canRecord || !stepValid) return;
    setBusy(true);
    try {
      await createFinancingAgreement(businessId, accessToken, {
        agreement_type: agreementType,
        transaction_type: transactionType,
        source,
        market_type: marketType,
        financing_mode: financingMode,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_region: customerRegion.trim(),
        contract_total: contractTotal,
        upfront_cash: upfrontCash || "0",
        trade_in_item_name: transactionType === "trade_in" ? tradeInItem.trim() : "",
        trade_in_credit: transactionType === "trade_in" ? tradeInCredit : "0",
        installment_amount: installmentAmount,
        frequency,
        next_due_date: nextDueDate,
        release_threshold_percent: agreementType === "installment" ? releaseThreshold : "100",
        partner_name: financingMode === "partner" ? partnerName.trim() : "",
        partner_settlement_amount:
          financingMode === "partner" ? partnerSettlement : null,
        business_commission: financingMode === "partner" ? businessCommission || "0" : "0",
        notes: notes.trim(),
        items: lines.map((line) => ({
          ...(source === "stock"
            ? { product_id: line.product_id }
            : {
                item_name: line.item_name.trim(),
                ...(line.acquisition_unit_cost
                  ? { acquisition_unit_cost: line.acquisition_unit_cost }
                  : {}),
              }),
          ...(line.tracked_unit_id ? { tracked_unit_id: line.tracked_unit_id } : {}),
          quantity: line.tracked_unit_id ? "1" : line.quantity,
          unit_price: line.unit_price,
          warranty_months: line.warranty_months,
        })),
      });
      notify({ message: t("saved"), tone: "success" });
      closeRecorder();
      await load();
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("saveError"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const customerSummary = (agreement: FinancingAgreement) =>
    t("summaryTemplate", {
      reference: agreement.reference,
      customer: agreement.customer_name,
      type: t(agreement.agreement_type),
      total: money(agreement.contract_total, locale),
      contribution: money(agreement.contribution_total, locale),
      paid: money(agreement.payments_total, locale),
      balance: money(agreement.outstanding_balance, locale),
      due: agreement.next_due_date ?? "—",
    });

  const reminderText = (agreement: FinancingAgreement) =>
    t("dueReminderTemplate", {
      customer: agreement.customer_name,
      reference: agreement.reference,
      date: agreement.next_due_date ?? "—",
      amount: money(agreement.installment_amount, locale),
      balance: money(agreement.outstanding_balance, locale),
    });

  const copyText = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    notify({ message, tone: "success" });
  };

  const shareText = async (title: string, text: string) => {
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }
    await navigator.clipboard.writeText(text);
    notify({ message: t("copied"), tone: "success" });
  };

  const printSummary = (agreement: FinancingAgreement) => {
    const text = customerSummary(agreement)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.opacity = "0";
    document.body.appendChild(frame);
    const printDocument = frame.contentDocument;
    const printWindow = frame.contentWindow;
    if (!printDocument || !printWindow) return frame.remove();
    printDocument.open();
    printDocument.write(
      `<!doctype html><html><body><pre style="white-space:pre-wrap;font:14px/1.55 Arial,sans-serif">${text}</pre></body></html>`,
    );
    printDocument.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      window.setTimeout(() => frame.remove(), 500);
    }, 100);
  };

  const savePayment = async (agreement: FinancingAgreement) => {
    if (!accessToken || !canRecordPayment) return;
    const amount = paymentDrafts[agreement.id];
    if (!amount || Number(amount) <= 0) return;
    try {
      await createFinancingPayment(businessId, agreement.id, accessToken, {
        amount,
        paid_at: new Date().toISOString(),
        reference: paymentRefs[agreement.id] ?? "",
      });
      setPaymentDrafts((current) => ({ ...current, [agreement.id]: "" }));
      setPaymentRefs((current) => ({ ...current, [agreement.id]: "" }));
      notify({ message: t("paymentSaved"), tone: "success" });
      await load();
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("saveError"),
        tone: "error",
      });
    }
  };

  const saveDocument = async (agreement: FinancingAgreement) => {
    if (!accessToken || !canManageDocuments) return;
    const file = documentDrafts[agreement.id];
    if (!file) return;
    try {
      await uploadFinancingDocument(
        businessId,
        agreement.id,
        accessToken,
        file,
      );
      setDocumentDrafts((current) => ({ ...current, [agreement.id]: null }));
      notify({ message: t("documentUploaded"), tone: "success" });
      await load();
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("saveError"),
        tone: "error",
      });
    }
  };

  return (
    <section className="w-full space-y-4 py-4">
      <section
        aria-label={t("statusTitle")}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950 sm:px-4 sm:py-3"
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_10%,white)] text-[var(--workspace-primary,var(--brand-navy))] dark:bg-[color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_20%,transparent)] dark:[color:color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_35%,white)]">
            <HandCoins className="size-3.5" />
          </span>
          <h2 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {t("statusTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-md bg-slate-50 dark:divide-slate-800 dark:bg-slate-900/55">
          <div className="min-w-0 px-2 py-2 sm:px-3">
            <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
              {t("activeAgreements")}
            </span>
            <strong className="mt-0.5 block truncate text-[11px] font-semibold text-slate-950 dark:text-white sm:text-xs">
              {activeCount}
            </strong>
          </div>
          <div className="min-w-0 px-2 py-2 sm:px-3">
            <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
              {t("dueAgreements")}
            </span>
            <strong className="mt-0.5 block truncate text-[11px] font-semibold text-slate-950 dark:text-white sm:text-xs">
              {dueCount}
            </strong>
          </div>
          <div className="min-w-0 px-2 py-2 sm:px-3">
            <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
              {t("outstanding")}
            </span>
            <strong className="mt-0.5 block truncate text-[11px] font-semibold text-slate-950 dark:text-white sm:text-xs">
              {money(outstandingTotal, locale)}
            </strong>
          </div>
        </div>
      </section>

      {canRecord ? (
        <section className={`${shell} px-2 py-2`}>
          <div className="flex items-center justify-between gap-2">
            <strong className="text-sm">{t("recordAgreement")}</strong>
            <Button
              className="h-8 px-3 text-xs"
              onClick={showRecorder ? closeRecorder : () => setShowRecorder(true)}
              type="button"
              variant="outline"
            >
              {showRecorder ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              {showRecorder ? t("closeRecorder") : t("recordAgreement")}
            </Button>
          </div>
        </section>
      ) : null}

      {showRecorder ? (
        <form className={`${shell} grid gap-3 p-3 sm:p-4`} onSubmit={(event) => void onSubmit(event)}>
          <div className="flex overflow-x-auto border-b border-slate-100 pb-2 dark:border-slate-800">
            {stepKeys.map((key, index) => (
              <button
                className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${index === step ? "text-slate-950 dark:text-white" : "text-slate-400"}`}
                key={key}
                onClick={() => index <= step && setStep(index)}
                type="button"
              >
                <span>{index + 1}. {t(`steps.${key}`)}</span>
                {index < stepKeys.length - 1 ? <ChevronRight className="mx-1 size-3" /> : null}
              </button>
            ))}
          </div>

          {step === 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <label className={field}>{t("agreementType")}<Select className={control} value={agreementType} onChange={(event) => setAgreementType(event.target.value as FinancingAgreementType)}><option value="loan">{t("loan")}</option><option value="installment">{t("installment")}</option></Select></label>
              <label className={field}>{t("transactionType")}<Select className={control} value={transactionType} onChange={(event) => setTransactionType(event.target.value as FinancingTransactionType)}><option value="normal">{t("normal")}</option><option value="upfront">{t("upfront")}</option><option value="trade_in">{t("tradeIn")}</option></Select></label>
              <label className={field}>{t("source")}<Select className={control} value={source} onChange={(event) => { setSource(event.target.value as FinancingSource); setLines([emptyLine()]); }}><option value="stock">{t("stock")}</option><option value="independent">{t("independent")}</option></Select></label>
              <label className={field}>{t("marketType")}<Select className={control} value={marketType} onChange={(event) => setMarketType(event.target.value as FinancingMarketType)}><option value="retail">{t("retail")}</option><option value="wholesale">{t("wholesale")}</option></Select></label>
              <label className={field}>{t("financingMode")}<Select className={control} value={financingMode} onChange={(event) => setFinancingMode(event.target.value as FinancingMode)}><option value="business">{t("businessFinanced")}</option><option value="partner">{t("partnerFinanced")}</option></Select></label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <label className={field}>{t("customerName")}<Input className={control} required value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
              <label className={field}>{t("customerPhone")}<Input className={control} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></label>
              <label className={field}>{t("customerRegion")}<Input className={control} value={customerRegion} onChange={(event) => setCustomerRegion(event.target.value)} /></label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-2">
              <p className="text-xs text-slate-500">{source === "stock" ? t("stockReservedHint") : null}</p>
              {lines.map((line, index) => {
                const product = availability.find((item) => item.id === line.product_id);
                return (
                  <div className="grid gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800" key={index}>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {source === "stock" ? (
                        <Select className={control} value={line.product_id} onChange={(event) => chooseProduct(index, event.target.value)}>
                          <option value="">{t("chooseProduct")}</option>
                          {availability.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku} · {formatQuantityWithUnit(item.current_quantity, item.unit, locale)}</option>)}
                        </Select>
                      ) : (
                        <Input className={control} placeholder={t("itemName")} value={line.item_name} onChange={(event) => updateLine(index, { item_name: event.target.value })} />
                      )}
                      {source === "stock" && product?.tracking_mode === "individual" ? (
                        <Select className={control} value={line.tracked_unit_id} onChange={(event) => updateLine(index, { tracked_unit_id: event.target.value, quantity: "1" })}>
                          <option value="">{t("chooseItem")}</option>
                          {product.available_units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
                        </Select>
                      ) : (
                        <Input className={control} min="0.001" placeholder={t("quantity")} step="0.001" type="number" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                      )}
                      <Input className={control} min="0" placeholder={t("unitPrice")} step="0.01" type="number" value={line.unit_price} onChange={(event) => updateLine(index, { unit_price: event.target.value })} />
                      {source === "independent" ? <Input className={control} min="0" placeholder={t("acquisitionCost")} step="0.01" type="number" value={line.acquisition_unit_cost} onChange={(event) => updateLine(index, { acquisition_unit_cost: event.target.value })} /> : null}
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <label className={`${field} max-w-56 flex-1`}>{t("warranty")}<Select className={control} value={line.warranty_months ?? ""} onChange={(event) => updateLine(index, { warranty_months: event.target.value ? Number(event.target.value) as FinancingWarrantyMonths : null })}><option value="">{t("noWarranty")}</option>{warrantyOptions.map((months) => <option key={months} value={months}>{t("warrantyMonths", { months })}</option>)}</Select></label>
                      <Button className="h-9 px-2 text-xs" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} type="button" variant="outline">{t("remove")}</Button>
                    </div>
                  </div>
                );
              })}
              <Button className="h-8 w-fit px-2.5 text-xs" onClick={() => setLines((current) => [...current, emptyLine()])} type="button" variant="outline"><Plus className="size-3.5" />{t("addProduct")}</Button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-3">
              {agreementType === "installment" ? <p className="text-xs text-slate-500">{t("installmentHint")}</p> : null}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className={field}>{t("contractTotal")}<Input className={control} min="0" step="0.01" type="number" value={contractTotal} onChange={(event) => setContractTotal(event.target.value)} /></label>
                {transactionType === "upfront" ? <label className={field}>{t("upfrontCash")}<Input className={control} min="0" step="0.01" type="number" value={upfrontCash} onChange={(event) => setUpfrontCash(event.target.value)} /></label> : null}
                {transactionType === "trade_in" ? <><label className={field}>{t("tradeInItem")}<Input className={control} value={tradeInItem} onChange={(event) => setTradeInItem(event.target.value)} /></label><label className={field}>{t("tradeInCredit")}<Input className={control} min="0" step="0.01" type="number" value={tradeInCredit} onChange={(event) => setTradeInCredit(event.target.value)} /></label></> : null}
                <label className={field}>{t("installmentAmount")}<Input className={control} min="0" step="0.01" type="number" value={installmentAmount} onChange={(event) => setInstallmentAmount(event.target.value)} /></label>
                <label className={field}>{t("frequency")}<Select className={control} value={frequency} onChange={(event) => setFrequency(event.target.value as FinancingFrequency)}><option value="weekly">{t("weekly")}</option><option value="monthly">{t("monthly")}</option></Select></label>
                <label className={field}>{t("nextDueDate")}<Input className={control} type="date" value={nextDueDate} onChange={(event) => setNextDueDate(event.target.value)} /></label>
                {agreementType === "installment" ? <label className={field}>{t("releaseThreshold")}<Input className={control} max="100" min="1" step="0.01" type="number" value={releaseThreshold} onChange={(event) => setReleaseThreshold(event.target.value)} /></label> : null}
              </div>
              {financingMode === "partner" ? <div className="grid gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-3"><label className={field}>{t("partnerName")}<Input className={control} value={partnerName} onChange={(event) => setPartnerName(event.target.value)} /></label><label className={field}>{t("partnerSettlement")}<Input className={control} min="0" step="0.01" type="number" value={partnerSettlement} onChange={(event) => setPartnerSettlement(event.target.value)} /></label><label className={field}>{t("businessCommission")}<Input className={control} min="0" step="0.01" type="number" value={businessCommission} onChange={(event) => setBusinessCommission(event.target.value)} /></label></div> : null}
              <label className={field}>{t("notes")}<Input className={control} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-3 text-sm">
              <p className="text-xs text-slate-500">{t("reviewHint")}</p>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900 sm:grid-cols-4">
                <div><span className="text-xs text-slate-500">{t("agreementType")}</span><strong className="block">{t(agreementType)}</strong></div>
                <div><span className="text-xs text-slate-500">{t("customerName")}</span><strong className="block">{customerName}</strong></div>
                <div><span className="text-xs text-slate-500">{t("contractTotal")}</span><strong className="block">{money(contractTotal || 0, locale)}</strong></div>
                <div><span className="text-xs text-slate-500">{t("installmentAmount")}</span><strong className="block">{money(installmentAmount || 0, locale)}</strong></div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <Button className="h-8 px-2.5 text-xs" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button" variant="outline"><ChevronLeft className="size-3.5" />{t("previous")}</Button>
            {step < stepKeys.length - 1 ? <Button className="h-8 px-2.5 text-xs" disabled={!stepValid} onClick={() => setStep((value) => Math.min(stepKeys.length - 1, value + 1))} type="button">{t("next")}<ChevronRight className="size-3.5" /></Button> : <Button className="h-8 px-3 text-xs" disabled={busy || !stepValid} type="submit">{busy ? t("saving") : t("save")}</Button>}
          </div>
        </form>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-bold">{t("recentAgreements")}</h2>
        {agreements.map((agreement) => (
          <details className={`${shell} group p-3`} key={agreement.id}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="truncate text-sm">{agreement.customer_name}</strong>
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold dark:border-slate-800">{agreement.reference}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{agreement.items[0]?.product_name || agreement.items[0]?.item_name || "—"} · {t(agreement.agreement_type)} · {t(`status${agreement.status.charAt(0).toUpperCase()}${agreement.status.slice(1)}`)}</p>
              </div>
              <div className="shrink-0 text-right">
                <strong className="block text-sm">{money(agreement.outstanding_balance, locale)}</strong>
                <span className="text-[10px] text-slate-500">{t("balance")}</span>
              </div>
            </summary>

            <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div><span className="text-slate-500">{t("contract")}</span><strong className="block">{money(agreement.contract_total, locale)}</strong></div>
                <div><span className="text-slate-500">{t("paid")}</span><strong className="block">{money(Number(agreement.contribution_total) + Number(agreement.payments_total), locale)}</strong></div>
                <div><span className="text-slate-500">{t("balance")}</span><strong className="block">{money(agreement.outstanding_balance, locale)}</strong></div>
                <div><span className="text-slate-500">{t("nextDue")}</span><strong className="block">{agreement.next_due_date ?? "—"}</strong></div>
              </div>

              <div className="grid gap-1 text-xs">
                {agreement.items.map((item) => <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-900" key={item.id}><strong>{item.product_name || item.item_name}</strong><span className="ml-2 text-slate-500">{item.product_unit ? formatQuantityWithUnit(item.quantity, item.product_unit, locale) : item.quantity} · {money(item.line_total, locale)}</span>{item.warranty_months ? <span className="ml-2 text-slate-500">{t("warrantyMonths", { months: item.warranty_months })}</span> : null}</div>)}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="h-8 px-2 text-xs" onClick={() => void copyText(customerSummary(agreement), t("copied"))} type="button" variant="outline"><Copy className="size-3.5" />{t("copy")}</Button>
                <Button className="h-8 px-2 text-xs" onClick={() => void shareText(agreement.reference, customerSummary(agreement))} type="button" variant="outline"><Share2 className="size-3.5" />{t("share")}</Button>
                <Button className="h-8 px-2 text-xs" onClick={() => printSummary(agreement)} type="button" variant="outline"><Printer className="size-3.5" />{t("print")}</Button>
                {agreement.next_due_date ? <><Button className="h-8 px-2 text-xs" onClick={() => void copyText(reminderText(agreement), t("reminderCopied"))} type="button" variant="outline"><Copy className="size-3.5" />{t("copyReminder")}</Button><Button className="h-8 px-2 text-xs" onClick={() => void shareText(t("reminder"), reminderText(agreement))} type="button" variant="outline"><Share2 className="size-3.5" />{t("shareReminder")}</Button></> : null}
              </div>

              {canRecordPayment && !["paid", "cancelled"].includes(agreement.status) ? <div className="grid gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800 sm:grid-cols-[1fr_1fr_auto]"><Input className={control} min="0" placeholder={t("paymentAmount")} step="0.01" type="number" value={paymentDrafts[agreement.id] ?? ""} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [agreement.id]: event.target.value }))} /><Input className={control} placeholder={t("paymentReference")} value={paymentRefs[agreement.id] ?? ""} onChange={(event) => setPaymentRefs((current) => ({ ...current, [agreement.id]: event.target.value }))} /><Button className="h-9 px-3 text-xs" onClick={() => void savePayment(agreement)} type="button">{t("recordPayment")}</Button></div> : null}

              {canManageDocuments ? <div className="grid gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"><div className="flex items-center justify-between gap-2"><strong className="text-xs">{t("documents")}</strong><label className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold"><Upload className="size-3.5" />{t("uploadDocument")}<input className="sr-only" type="file" onChange={(event) => setDocumentDrafts((current) => ({ ...current, [agreement.id]: event.target.files?.[0] ?? null }))} /></label></div>{documentDrafts[agreement.id] ? <Button className="h-8 w-fit px-2 text-xs" onClick={() => void saveDocument(agreement)} type="button">{t("uploadDocument")}: {documentDrafts[agreement.id]?.name}</Button> : null}{agreement.documents.length ? <div className="grid gap-1">{agreement.documents.map((document) => <div className="flex items-center justify-between gap-2 text-xs" key={document.id}><span className="truncate">{document.original_name}</span><Button className="h-7 px-2 text-[11px]" onClick={() => accessToken && void downloadFinancingDocument(document.download_path, accessToken, document.original_name)} type="button" variant="outline"><Download className="size-3" />{t("download")}</Button></div>)}</div> : <p className="text-xs text-slate-500">{t("noDocuments")}</p>}</div> : null}

              {agreement.expected_business_income ? <div className="rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-900"><strong>{t("internalFinance")}</strong><div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3"><div><span className="text-slate-500">{t("expectedIncome")}</span><strong className="block">{money(agreement.expected_business_income, locale)}</strong></div>{agreement.partner_settlement_amount ? <div><span className="text-slate-500">{t("partnerSettlementLabel")}</span><strong className="block">{money(agreement.partner_settlement_amount, locale)}</strong></div> : null}{agreement.business_commission ? <div><span className="text-slate-500">{t("commission")}</span><strong className="block">{money(agreement.business_commission, locale)}</strong></div> : null}</div></div> : null}
            </div>
          </details>
        ))}
        {!agreements.length ? <div className={`${shell} p-4 text-sm text-slate-500`}>{t("noAgreements")}</div> : null}
      </section>
    </section>
  );
}

export { FinancingWorkspace };
