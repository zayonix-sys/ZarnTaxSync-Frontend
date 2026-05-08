import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { parseISO, format as formatFn } from "date-fns";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BuyerNtnLookup } from "@/components/invoice/BuyerNtnLookup";
import {
  usePostInvoice,
  useValidateInvoice,
} from "@/hooks/useInvoices";
import { useProvinces } from "@/hooks/useReference";
import { useAuthStore } from "@/stores/auth";
import { useTenantProfileStore } from "@/stores/tenantProfile";
import { getApplicableScenarios } from "@/lib/scenarioMatrix";
import { formatPKR } from "@/lib/format";
import { normalizeError } from "@/api/client";
import type {
  InvoiceTypeValue,
  PostInvoiceRequest,
  RegistrationType,
  ValidateInvoiceResponse,
} from "@/api/invoices";

// ---------------- Schema (mirrors backend FluentValidation + FBR rules) -----

const NTN_OR_CNIC = /^(\d{7}|\d{9}|\d{13})$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DEBIT_NOTE_REASONS = [
  "Sales Return",
  "Quantity Adjustment",
  "Price Adjustment",
  "Goods Returned",
  "Tax Rate Change",
  "Others",
] as const;

function isWithinLast30Days(yyyyMmDd: string) {
  const d = new Date(yyyyMmDd);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 86_400_000;
  return diff >= -1 && diff <= 30;
}

const ItemSchema = z.object({
  itemSequence: z.number().int().positive(),
  hsCode: z.string().min(4, "HS code is required"),
  productDescription: z.string().min(2, "Description is required"),
  rate: z.coerce.number().min(0).max(100),
  uoM: z.string().min(1, "UoM is required"),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  totalValues: z.coerce.number().min(0),
  valueSalesExcludingSt: z.coerce.number().min(0),
  fixedNotifiedValueOrRetailPrice: z.coerce.number().min(0).default(0),
  salesTaxApplicable: z.coerce.number().min(0),
  salesTaxWithheldAtSource: z.coerce.number().min(0).default(0),
  extraTax: z.coerce.number().min(0).default(0),
  furtherTax: z.coerce.number().min(0).default(0),
  sroScheduleNo: z.string().optional(),
  fedPayable: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  saleType: z.string().min(1).default("Local"),
  sroItemSerialNo: z.string().optional(),
});

const FormSchema = z
  .object({
    invoiceType: z.enum(["SaleInvoice", "DebitNote"]),
    invoiceDate: z
      .string()
      .regex(DATE_RE, "Format: yyyy-MM-dd")
      .refine(isWithinLast30Days, "Date must be within the last 30 days"),
    saleType: z.string().min(1, "Sale type is required"),
    scenarioId: z
      .union([z.coerce.number().int().positive(), z.literal("")])
      .optional(),

    sellerNtnCnic: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => NTN_OR_CNIC.test(v), "NTN must be 7/9 digits; CNIC 13 digits"),
    sellerBusinessName: z.string().min(2, "Required"),
    sellerProvince: z.string().min(1, "Required"),
    sellerAddress: z.string().min(2, "Required"),

    buyerRegistrationType: z.enum(["Registered", "Unregistered"]),
    buyerNtnCnic: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .optional(),
    buyerBusinessName: z.string().min(2, "Required"),
    buyerProvince: z.string().min(1, "Required"),
    buyerAddress: z.string().min(2, "Required"),

    invoiceRefNo: z.string().optional(),
    debitNoteReason: z.string().optional(),
    debitNoteReasonRemarks: z.string().optional(),

    items: z.array(ItemSchema).min(1, "Add at least one line item"),
  })
  .superRefine((data, ctx) => {
    if (data.invoiceType === "DebitNote") {
      const ref = data.invoiceRefNo?.replace(/\D/g, "") ?? "";
      if (ref.length !== 22 && ref.length !== 28) {
        ctx.addIssue({
          path: ["invoiceRefNo"],
          code: z.ZodIssueCode.custom,
          message: "Debit Note requires a 22 or 28 digit invoice reference",
        });
      }
      if (!data.debitNoteReason) {
        ctx.addIssue({
          path: ["debitNoteReason"],
          code: z.ZodIssueCode.custom,
          message: "Reason is required",
        });
      }
      if (
        data.debitNoteReason === "Others" &&
        (data.debitNoteReasonRemarks ?? "").trim().length < 10
      ) {
        ctx.addIssue({
          path: ["debitNoteReasonRemarks"],
          code: z.ZodIssueCode.custom,
          message: "Remarks of at least 10 characters required when reason is Others",
        });
      }
    }

    if (data.buyerRegistrationType === "Registered") {
      const buyer = data.buyerNtnCnic?.replace(/\D/g, "") ?? "";
      if (!NTN_OR_CNIC.test(buyer)) {
        ctx.addIssue({
          path: ["buyerNtnCnic"],
          code: z.ZodIssueCode.custom,
          message: "Registered buyers need a valid NTN or CNIC",
        });
      }
    }
  });

type FormValues = z.infer<typeof FormSchema>;

// ---------------- Route ------------------------------------------------------

export const Route = createFileRoute("/_auth/invoices/new")({
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;
  const profile = useTenantProfileStore((s) =>
    tenantId ? s.profiles[tenantId] : undefined,
  );
  const { data: provinces } = useProvinces();

  const validate = useValidateInvoice();
  const post = usePostInvoice();

  // Idempotency-Key per Phase 4 plan — generated once per form mount.
  const idempotencyKey = useMemo(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, []);

  const applicableScenarios = useMemo(
    () =>
      profile
        ? getApplicableScenarios(profile.businessActivity, profile.sector)
        : null,
    [profile],
  );

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      invoiceType: "SaleInvoice",
      invoiceDate: today,
      saleType: "Local",
      scenarioId: "",

      sellerNtnCnic: "",
      sellerBusinessName: "",
      sellerProvince: "",
      sellerAddress: "",

      buyerRegistrationType: "Unregistered",
      buyerNtnCnic: "",
      buyerBusinessName: "",
      buyerProvince: "",
      buyerAddress: "",

      invoiceRefNo: "",
      debitNoteReason: "",
      debitNoteReasonRemarks: "",

      items: [makeBlankItem(1)],
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const items = useFieldArray({ control, name: "items" });

  const invoiceType = watch("invoiceType");
  const invoiceDate = watch("invoiceDate");
  const buyerRegistrationType = watch("buyerRegistrationType");
  const buyerNtnCnic = watch("buyerNtnCnic") ?? "";
  const watchedItems = watch("items");

  const totals = useMemo(() => {
    const totalQuantity = watchedItems.reduce(
      (s, i) => s + (Number(i.quantity) || 0),
      0,
    );
    const totalSalesTax = watchedItems.reduce(
      (s, i) => s + (Number(i.salesTaxApplicable) || 0),
      0,
    );
    const totalBillAmount = watchedItems.reduce(
      (s, i) => s + (Number(i.totalValues) || 0),
      0,
    );
    return { totalQuantity, totalSalesTax, totalBillAmount };
  }, [watchedItems]);

  const [validationResult, setValidationResult] =
    useState<ValidateInvoiceResponse | null>(null);

  const buildPayload = (values: FormValues): PostInvoiceRequest => ({
    invoiceType: values.invoiceType,
    invoiceDate: values.invoiceDate,
    sellerNtnCnic: values.sellerNtnCnic,
    sellerBusinessName: values.sellerBusinessName,
    sellerProvince: values.sellerProvince,
    sellerAddress: values.sellerAddress,
    buyerNtnCnic: values.buyerNtnCnic || undefined,
    buyerBusinessName: values.buyerBusinessName,
    buyerProvince: values.buyerProvince,
    buyerAddress: values.buyerAddress,
    buyerRegistrationType: values.buyerRegistrationType,
    invoiceRefNo: values.invoiceRefNo || undefined,
    scenarioId:
      typeof values.scenarioId === "number" ? values.scenarioId : undefined,
    saleType: values.saleType,
    totalQuantity: totals.totalQuantity,
    totalSalesTax: totals.totalSalesTax,
    totalBillAmount: totals.totalBillAmount,
    debitNoteReason:
      values.invoiceType === "DebitNote" ? values.debitNoteReason : undefined,
    debitNoteReasonRemarks:
      values.invoiceType === "DebitNote"
        ? values.debitNoteReasonRemarks
        : undefined,
    items: values.items.map((it, idx) => ({
      itemSequence: idx + 1,
      hsCode: it.hsCode,
      productDescription: it.productDescription,
      rate: Number(it.rate),
      uoM: it.uoM,
      quantity: Number(it.quantity),
      totalValues: Number(it.totalValues),
      valueSalesExcludingSt: Number(it.valueSalesExcludingSt),
      fixedNotifiedValueOrRetailPrice: Number(it.fixedNotifiedValueOrRetailPrice),
      salesTaxApplicable: Number(it.salesTaxApplicable),
      salesTaxWithheldAtSource: Number(it.salesTaxWithheldAtSource),
      extraTax: Number(it.extraTax),
      furtherTax: Number(it.furtherTax),
      sroScheduleNo: it.sroScheduleNo || undefined,
      fedPayable: Number(it.fedPayable),
      discount: Number(it.discount),
      saleType: it.saleType,
      sroItemSerialNo: it.sroItemSerialNo || undefined,
    })),
  });

  const onValidate = handleSubmit(async (values) => {
    try {
      const res = await validate.mutateAsync(buildPayload(values));
      setValidationResult(res);
      if (res.isValid) toast.success("Validation passed — ready to submit");
      else toast.warning("Validation found issues");
    } catch (err) {
      const norm = normalizeError(err);
      toast.error(norm.errors[0] ?? norm.message);
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await post.mutateAsync({
        body: buildPayload(values),
        idempotencyKey,
      });
      if (result.fbrInvoiceNumber) {
        toast.success(`IRN allocated: ${result.fbrInvoiceNumber}`);
      } else {
        toast.success("Invoice saved");
      }
      navigate({ to: "/invoices/$id", params: { id: result.localInvoiceId } });
    } catch (err) {
      const norm = normalizeError(err);
      toast.error(norm.errors[0] ?? norm.message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New invoice</h1>
        <p className="text-sm text-muted-foreground">
          Submit a Sale Invoice or Debit Note to FBR Digital Invoicing.
        </p>
      </div>

      {/* ---------------- Section 1 — Header ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice header</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
            <Controller
              control={control}
              name="invoiceType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as InvoiceTypeValue)}
                >
                  <SelectTrigger id="invoiceType" label="Invoice type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SaleInvoice">Sale Invoice</SelectItem>
                    <SelectItem value="DebitNote">Debit Note</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />

            <Controller
              control={control}
              name="invoiceDate"
              render={({ field }) => (
                <DatePicker
                  id="invoiceDate"
                  label="Invoice date"
                  date={field.value ? parseISO(field.value) : undefined}
                  onChange={(d) => field.onChange(d ? formatFn(d, "yyyy-MM-dd") : "")}
                />
              )}
            />

          <Input id="saleType" label="Sale type" placeholder="Local" {...register("saleType")} />

            <Controller
              control={control}
              name="scenarioId"
              render={({ field }) => (
                <Select
                  value={field.value === "" || field.value === undefined ? "none" : String(field.value)}
                  onValueChange={(v) =>
                    field.onChange(v === "none" ? "" : Number(v))
                  }
                >
                  <SelectTrigger id="scenarioId" label="Scenario (Sandbox only)">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No scenario</SelectItem>
                    {(applicableScenarios ?? Array.from({ length: 28 }, (_, i) => i + 1)).map(
                      (n) => (
                        <SelectItem key={n} value={String(n)}>
                          Scenario {n}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              )}
            />

          {invoiceType === "DebitNote" && (
            <>
                <Input
                  id="invoiceRefNo"
                  label="Original invoice reference"
                  {...register("invoiceRefNo")}
                />

                <Controller
                  control={control}
                  name="debitNoteReason"
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="debitNoteReason" label="Reason">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEBIT_NOTE_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />

                <Textarea
                  id="debitNoteReasonRemarks"
                  label="Remarks"
                  rows={2}
                  {...register("debitNoteReasonRemarks")}
                />
            </>
          )}

          {invoiceType === "DebitNote" && (
            <Alert variant="warning" className="md:col-span-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Backend gap B2 pending</AlertTitle>
              <AlertDescription>
                FBR will reject Debit Note submissions until the backend ships
                the <code>debitNoteReason</code> + <code>debitNoteReasonRemarks</code>{" "}
                fields. Frontend already sends them — one-line cutover.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Section 2 — Seller ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Seller</CardTitle>
          <CardDescription>Pre-fill from your tenant profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
            <Input id="sellerNtnCnic" label="NTN / CNIC" {...register("sellerNtnCnic")} />
            <Input id="sellerBusinessName" label="Business name" {...register("sellerBusinessName")} />
            <Controller
              control={control}
              name="sellerProvince"
              render={({ field }) => (
                <ProvinceSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={provinces}
                  label="Province"
                />
              )}
            />
            <Input id="sellerAddress" label="Address" {...register("sellerAddress")} />
        </CardContent>
      </Card>

      {/* ---------------- Section 3 — Buyer ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Buyer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Registration type</Label>
            <Controller
              control={control}
              name="buyerRegistrationType"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as RegistrationType)}
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="Registered" />
                    Registered
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="Unregistered" />
                    Unregistered
                  </label>
                </RadioGroup>
              )}
            />
          </div>

          {buyerRegistrationType === "Registered" && (
            <>
              <Input id="buyerNtnCnic" label="Buyer NTN / CNIC" {...register("buyerNtnCnic")} />
              <BuyerNtnLookup
                value={buyerNtnCnic}
                invoiceDate={invoiceDate}
                onRegistrationMismatch={(serverType) => {
                  if (serverType !== buyerRegistrationType) {
                    setValue("buyerRegistrationType", serverType, {
                      shouldDirty: true,
                    });
                    toast.info(`FBR reports buyer is ${serverType}; updated radio.`);
                  }
                }}
              />
            </>
          )}

            <Input id="buyerBusinessName" label="Business name" {...register("buyerBusinessName")} />
            <Controller
              control={control}
              name="buyerProvince"
              render={({ field }) => (
                <ProvinceSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={provinces}
                  label="Province"
                />
              )}
            />
            <Input id="buyerAddress" label="Address" {...register("buyerAddress")} />
        </CardContent>
      </Card>

      {/* ---------------- Section 4 — Line items ---------------- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Line items</CardTitle>
            <CardDescription>
              {items.fields.length} item{items.fields.length === 1 ? "" : "s"} ·{" "}
              auto-calculated totals shown below.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => items.append(makeBlankItem(items.fields.length + 1))}
          >
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>HS code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20 text-right">Qty</TableHead>
                <TableHead className="w-24">UoM</TableHead>
                <TableHead className="w-20 text-right">Rate %</TableHead>
                <TableHead className="w-32 text-right">Excl. ST</TableHead>
                <TableHead className="w-28 text-right">Sales tax</TableHead>
                <TableHead className="w-32 text-right">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.fields.map((field, index) => (
                <TableRow key={field.id} className="align-top">
                  <TableCell className="pt-3 font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      placeholder="0000.00.00"
                      {...register(`items.${index}.hsCode` as const)}
                    />
                    <FieldError msg={errors.items?.[index]?.hsCode?.message} />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      placeholder="Description"
                      {...register(`items.${index}.productDescription` as const)}
                    />
                    <FieldError
                      msg={errors.items?.[index]?.productDescription?.message}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-right"
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.quantity` as const)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      placeholder="PCS"
                      {...register(`items.${index}.uoM` as const)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-right"
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.rate` as const)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-right"
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.valueSalesExcludingSt` as const)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-right"
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.salesTaxApplicable` as const)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-right"
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.totalValues` as const)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => items.remove(index)}
                      disabled={items.fields.length === 1}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 grid gap-2 border-t pt-4 text-sm sm:max-w-sm sm:ml-auto">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total quantity</span>
              <span className="font-medium">{totals.totalQuantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total sales tax</span>
              <span className="font-medium">{formatPKR(totals.totalSalesTax)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total bill amount</span>
              <span>{formatPKR(totals.totalBillAmount)}</span>
            </div>
          </div>

          {errors.items && typeof errors.items.message === "string" && (
            <p className="mt-2 text-xs text-destructive">{errors.items.message}</p>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Validation results panel ---------------- */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.isValid ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              Pre-flight validation{" "}
              <Badge
                variant={validationResult.isValid ? "success" : "warning"}
                className="ml-1"
              >
                {validationResult.isValid ? "Passed" : "Issues"}
              </Badge>
            </CardTitle>
            <CardDescription>
              No IRN allocated — this is a server-side dry run.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {validationResult.errorCode && (
              <p>
                <span className="font-mono text-xs">
                  {validationResult.errorCode}
                </span>{" "}
                — {validationResult.error}
              </p>
            )}
            {validationResult.itemStatuses.filter((s) => s.statusCode !== "00")
              .length > 0 && (
              <ul className="ml-4 list-disc space-y-1 text-xs">
                {validationResult.itemStatuses
                  .filter((s) => s.statusCode !== "00")
                  .map((s) => (
                    <li key={s.itemSequence}>
                      Item {s.itemSequence}: {s.errorCode} — {s.error}
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------- Actions ---------------- */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
        <Badge variant="outline" className="mr-auto font-mono text-[10px]">
          Idempotency: {idempotencyKey.slice(0, 8)}…
        </Badge>
        <Button
          type="button"
          variant="outline"
          onClick={onValidate}
          disabled={validate.isPending || isSubmitting}
        >
          {validate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Validate (pre-flight)
        </Button>
        <Button type="submit" disabled={post.isPending || isSubmitting}>
          {(post.isPending || isSubmitting) && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Submit to FBR
        </Button>
      </div>
    </form>
  );
}

// ---------------- Sub-components --------------------------------------------

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

function ProvinceSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options?: Array<{ code: string; description: string }>;
  label?: string;
}) {
  const provinces = options?.length
    ? options
    : [
        { code: "PB", description: "Punjab" },
        { code: "SD", description: "Sindh" },
        { code: "KP", description: "Khyber Pakhtunkhwa" },
        { code: "BL", description: "Balochistan" },
        { code: "IS", description: "Islamabad" },
        { code: "AJK", description: "Azad Jammu & Kashmir" },
        { code: "GB", description: "Gilgit-Baltistan" },
      ];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {provinces.map((p) => (
          <SelectItem key={p.code} value={p.description}>
            {p.description}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------- Helpers ---------------------------------------------------

function makeBlankItem(seq: number) {
  return {
    itemSequence: seq,
    hsCode: "",
    productDescription: "",
    rate: 18,
    uoM: "PCS",
    quantity: 1,
    totalValues: 0,
    valueSalesExcludingSt: 0,
    fixedNotifiedValueOrRetailPrice: 0,
    salesTaxApplicable: 0,
    salesTaxWithheldAtSource: 0,
    extraTax: 0,
    furtherTax: 0,
    sroScheduleNo: "",
    fedPayable: 0,
    discount: 0,
    saleType: "Local",
    sroItemSerialNo: "",
  };
}
