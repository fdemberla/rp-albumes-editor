import type { Fotografo } from "./electron";

// ─── Location Value ─────────────────────────────────────────────────────────

export interface LocationValue {
  city: string;
  state: string;
  country: string;
  gpsLatitude: string;
  gpsLongitude: string;
}

export const EMPTY_LOCATION: LocationValue = {
  city: "",
  state: "",
  country: "",
  gpsLatitude: "",
  gpsLongitude: "",
};

// ─── Select / Radio Option ─────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

// ─── Validator ──────────────────────────────────────────────────────────────

/** Simple sync validator — return a string error message or undefined. */
export type FieldValidator<T = unknown> = (value: T) => string | undefined;

// ─── Field Descriptors (discriminated union by `type`) ──────────────────────

interface FieldBase {
  /** Key in the form values object. */
  name: string;
  /** Display label. */
  label: string;
  /** Number of grid columns this field spans (1–3). Default: full width. */
  colSpan?: 1 | 2 | 3;
  /** Hide the field statically or dynamically based on current values. */
  hidden?: boolean | ((values: Record<string, unknown>) => boolean);
  /** Inline onChange validator. Return error string or undefined. */
  validate?: FieldValidator<unknown>;
  /** onBlur validator. Return error string or undefined. */
  validateOnBlur?: FieldValidator<unknown>;
  /** Helper text displayed below the field. */
  helperText?: string;
}

export interface TextField extends FieldBase {
  type: "text";
  inputType?: "text" | "email" | "url" | "password" | "date";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface TextareaField extends FieldBase {
  type: "textarea";
  rows?: number;
  placeholder?: string;
  required?: boolean;
}

export interface NumberField extends FieldBase {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
}

export interface SelectField extends FieldBase {
  type: "select";
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
}

export interface CheckboxField extends FieldBase {
  type: "checkbox";
  /** Text displayed next to the checkbox. */
  description?: string;
}

export interface RadioField extends FieldBase {
  type: "radio";
  options: SelectOption[];
}

export interface KeywordsField extends FieldBase {
  type: "keywords";
  placeholder?: string;
}

export interface LocationField extends FieldBase {
  type: "location";
  /** Whether to show GPS latitude/longitude inputs. Default: true */
  showGps?: boolean;
}

export interface FotografoField extends FieldBase {
  type: "fotografo";
  /** Pre-selected fotografo for display. */
  initialFotografo?: Fotografo | null;
}

export interface CustomField extends FieldBase {
  type: "custom";
  render: (props: {
    value: unknown;
    onChange: (value: unknown) => void;
    error?: string;
  }) => React.ReactNode;
}

export type FieldDescriptor =
  | TextField
  | TextareaField
  | NumberField
  | SelectField
  | CheckboxField
  | RadioField
  | KeywordsField
  | LocationField
  | FotografoField
  | CustomField;

// ─── FormularioGenerico Props ───────────────────────────────────────────────

export interface FormularioGenericoProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Array of field descriptors defining the form shape. */
  fields: FieldDescriptor[];
  /** Initial/default values for the form. */
  defaultValues: T;
  /** Called with the validated values on successful submit. */
  onSubmit: (values: T) => Promise<void> | void;
  /** Label for the submit button. Default: "Guardar" */
  submitLabel?: string;
  /** Label for the cancel button. Omit to hide cancel button. */
  cancelLabel?: string;
  /** Cancel callback. */
  onCancel?: () => void;
  /** Disables the form. */
  loading?: boolean;
  /** Optional title rendered above the form. */
  title?: string;
  /** Grid column count for the layout. Default: 1 */
  columns?: 1 | 2 | 3;
  /** Hide the submit/cancel buttons (for embedded forms where the parent controls submission). */
  hideButtons?: boolean;
  /** CSS class applied to the outer form element. */
  className?: string;
}

/**
 * Imperative handle exposed via `ref` on FormularioGenerico.
 * Allows parent components to read values or trigger submit externally.
 */
export interface FormularioGenericoHandle<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Get current form values. */
  getValues: () => T;
  /** Trigger validation and submit programmatically. */
  submit: () => void;
  /** Reset form to default values. */
  reset: () => void;
}
