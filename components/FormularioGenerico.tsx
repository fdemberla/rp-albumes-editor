"use client";

import { useForm } from "@tanstack/react-form";
import { forwardRef, useImperativeHandle, useCallback } from "react";
import type {
  FieldDescriptor,
  FormularioGenericoProps,
  FormularioGenericoHandle,
  LocationValue,
} from "@/types/form";
import type { Fotografo } from "@/types/electron";
import KeywordsField from "./fields/KeywordsField";
import LocationField from "./fields/LocationField";
import FotografoSelector from "./FotografoSelector";

// ─── Shared input classes ───────────────────────────────────────────────────

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const LABEL_CLASS =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

// ─── Component ──────────────────────────────────────────────────────────────

function FormularioGenericoInner<
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  {
    fields,
    defaultValues,
    onSubmit,
    submitLabel = "Guardar",
    cancelLabel,
    onCancel,
    loading = false,
    title,
    columns = 1,
    hideButtons = false,
    className,
  }: FormularioGenericoProps<T>,
  ref: React.Ref<FormularioGenericoHandle<T>>,
) {
  const form = useForm({
    defaultValues: defaultValues as Record<string, unknown>,
    onSubmit: async ({ value }) => {
      await onSubmit(value as T);
    },
  });

  // Imperative handle for parent access
  useImperativeHandle(
    ref,
    () => ({
      getValues: () => form.state.values as T,
      submit: () => form.handleSubmit(),
      reset: () => form.reset(),
    }),
    [form],
  );

  // Determine if a field is hidden based on current form values
  const isHidden = useCallback(
    (field: FieldDescriptor): boolean => {
      if (field.hidden === undefined || field.hidden === false) return false;
      if (field.hidden === true) return true;
      return (field.hidden as (values: Record<string, unknown>) => boolean)(
        form.state.values,
      );
    },
    [form.state.values],
  );

  // Grid class based on column count
  const gridClass =
    columns === 1 ? "space-y-4" : `grid grid-cols-${columns} gap-4 items-start`;

  const getColSpanClass = (field: FieldDescriptor): string => {
    if (columns === 1) return "";
    const span = field.colSpan ?? columns; // default: full width
    if (span === 1) return "col-span-1";
    if (span === 2) return "col-span-2";
    return "col-span-3";
  };

  // ─── Render a single field ──────────────────────────────────────────────

  const renderField = (descriptor: FieldDescriptor) => {
    if (isHidden(descriptor)) return null;

    const { name, label, type } = descriptor;
    const colSpanClass = getColSpanClass(descriptor);

    return (
      <div key={name} className={colSpanClass}>
        {/* Label (skip for checkbox — label is inline) */}
        {type !== "checkbox" && (
          <label htmlFor={`field-${name}`} className={LABEL_CLASS}>
            {label}
            {"required" in descriptor && descriptor.required && (
              <span className="text-red-500 ml-0.5">*</span>
            )}
          </label>
        )}

        <form.Field
          name={name}
          validators={{
            onChange: descriptor.validate
              ? ({ value }: { value: unknown }) => descriptor.validate!(value)
              : undefined,
            onBlur: descriptor.validateOnBlur
              ? ({ value }: { value: unknown }) =>
                  descriptor.validateOnBlur!(value)
              : undefined,
          }}
        >
          {(field) => {
            const errorMsg =
              field.state.meta.isTouched && field.state.meta.errors?.length
                ? field.state.meta.errors.join(", ")
                : undefined;

            switch (type) {
              // ── Text ─────────────────────────────────────────────────
              case "text": {
                const d = descriptor;
                return (
                  <>
                    <input
                      id={`field-${name}`}
                      type={d.inputType || "text"}
                      value={(field.state.value as string) ?? ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder={d.placeholder}
                      required={d.required}
                      disabled={d.disabled || loading}
                      className={`${INPUT_CLASS}${errorMsg ? " border-red-500 dark:border-red-500" : ""}`}
                    />
                    {errorMsg && (
                      <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
                    )}
                  </>
                );
              }

              // ── Textarea ─────────────────────────────────────────────
              case "textarea": {
                const d = descriptor;
                return (
                  <>
                    <textarea
                      id={`field-${name}`}
                      value={(field.state.value as string) ?? ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      rows={d.rows ?? 3}
                      placeholder={d.placeholder}
                      required={d.required}
                      disabled={loading}
                      className={`${INPUT_CLASS} resize-vertical${errorMsg ? " border-red-500 dark:border-red-500" : ""}`}
                    />
                    {errorMsg && (
                      <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
                    )}
                  </>
                );
              }

              // ── Number ───────────────────────────────────────────────
              case "number": {
                const d = descriptor;
                return (
                  <>
                    <input
                      id={`field-${name}`}
                      type="number"
                      value={(field.state.value as number) ?? ""}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      onBlur={field.handleBlur}
                      min={d.min}
                      max={d.max}
                      step={d.step}
                      placeholder={d.placeholder}
                      required={d.required}
                      disabled={loading}
                      className={`${INPUT_CLASS}${errorMsg ? " border-red-500 dark:border-red-500" : ""}`}
                    />
                    {errorMsg && (
                      <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
                    )}
                  </>
                );
              }

              // ── Select ───────────────────────────────────────────────
              case "select": {
                const d = descriptor;
                return (
                  <>
                    <select
                      id={`field-${name}`}
                      value={(field.state.value as string) ?? ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      required={d.required}
                      disabled={loading}
                      className={`${INPUT_CLASS}${errorMsg ? " border-red-500 dark:border-red-500" : ""}`}
                    >
                      {d.placeholder && (
                        <option value="" disabled>
                          {d.placeholder}
                        </option>
                      )}
                      {d.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errorMsg && (
                      <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
                    )}
                  </>
                );
              }

              // ── Checkbox ─────────────────────────────────────────────
              case "checkbox": {
                const d = descriptor;
                return (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      id={`field-${name}`}
                      type="checkbox"
                      checked={!!field.state.value}
                      onChange={(e) => field.handleChange(e.target.checked)}
                      disabled={loading}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {label}
                    </span>
                    {d.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({d.description})
                      </span>
                    )}
                  </label>
                );
              }

              // ── Radio ────────────────────────────────────────────────
              case "radio": {
                const d = descriptor;
                return (
                  <div className="flex gap-4">
                    {d.options.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`field-${name}`}
                          value={opt.value}
                          checked={field.state.value === opt.value}
                          onChange={() => field.handleChange(opt.value)}
                          disabled={loading}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                );
              }

              // ── Keywords ─────────────────────────────────────────────
              case "keywords": {
                const d = descriptor;
                return (
                  <KeywordsField
                    value={(field.state.value as string[]) ?? []}
                    onChange={(kws) => field.handleChange(kws)}
                    placeholder={d.placeholder}
                    error={errorMsg}
                  />
                );
              }

              // ── Location ─────────────────────────────────────────────
              case "location": {
                const d = descriptor;
                return (
                  <LocationField
                    value={
                      (field.state.value as LocationValue) ?? {
                        city: "",
                        state: "",
                        country: "",
                        gpsLatitude: "",
                        gpsLongitude: "",
                      }
                    }
                    onChange={(loc) => field.handleChange(loc)}
                    showGps={d.showGps !== false}
                    error={errorMsg}
                  />
                );
              }

              // ── Fotografo Selector ───────────────────────────────────
              case "fotografo": {
                const d = descriptor;
                // The value stored is the fotografoId (string | null).
                // We also need to track the full object for display.
                return (
                  <>
                    <FotografoSelector
                      value={(field.state.value as string | null) ?? null}
                      onChange={(
                        id: string | null,
                        _fotografo: Fotografo | null,
                      ) => {
                        field.handleChange(id);
                      }}
                      initialFotografo={d.initialFotografo}
                    />
                    {errorMsg && (
                      <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
                    )}
                  </>
                );
              }

              // ── Custom ───────────────────────────────────────────────
              case "custom": {
                const d = descriptor;
                return (
                  <>
                    {d.render({
                      value: field.state.value,
                      onChange: (v) => field.handleChange(v),
                      error: errorMsg,
                    })}
                  </>
                );
              }

              default:
                return null;
            }
          }}
        </form.Field>

        {descriptor.helperText && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {descriptor.helperText}
          </p>
        )}
      </div>
    );
  };

  // ─── Submit handler ─────────────────────────────────────────────────────

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit();
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className={`space-y-4 ${className ?? ""}`}
    >
      {title && (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      )}

      <div className={gridClass}>{fields.map(renderField)}</div>

      {!hideButtons && (
        <div className="flex gap-2 pt-2">
          <form.Subscribe selector={(state) => [state.canSubmit]}>
            {([canSubmit]) => (
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Guardando..." : submitLabel}
              </button>
            )}
          </form.Subscribe>
          {cancelLabel && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      )}
    </form>
  );
}

// Wrap with forwardRef while preserving generic type (cast required)
const FormularioGenerico = forwardRef(FormularioGenericoInner) as <
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  props: FormularioGenericoProps<T> & {
    ref?: React.Ref<FormularioGenericoHandle<T>>;
  },
) => React.ReactElement | null;

export default FormularioGenerico;
