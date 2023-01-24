import * as React from "react";

////////////////////////////////////////////////////////////////////////////////
//#region Types

export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

// Remove readonly modifiers from existing types to make them mutable
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// Restrict object keys to strings, and don't permit number/Symbol
type KeyOf<T> = Extract<keyof T, string>;

// Extract the value type for an object
type ValueOf<T> = T[keyof T];

type SupportedControlTypes = "input" | "textarea" | "select";
type SupportedHTMLElements =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

/**
 * Validation attributes built-in to the browser
 */
type BuiltInValidationAttrsFunction<T> = (fd: FormData) => T | null | undefined;
interface BuiltInValidationAttrs {
  type?: string | BuiltInValidationAttrsFunction<string>;
  required?: boolean | BuiltInValidationAttrsFunction<boolean>;
  minLength?: number | BuiltInValidationAttrsFunction<number>;
  maxLength?: number | BuiltInValidationAttrsFunction<number>;
  min?: number | BuiltInValidationAttrsFunction<number>;
  max?: number | BuiltInValidationAttrsFunction<number>;
  pattern?: string | BuiltInValidationAttrsFunction<string>;
}

// Valid attributes by input type.  See:
// https://html.spec.whatwg.org/multipage/input.html#do-not-apply

type InputTextValidationAttrs = {
  type?: "text" | "search" | "url" | "tel" | "email" | "password";
} & Pick<
  BuiltInValidationAttrs,
  "required" | "minLength" | "maxLength" | "pattern"
>;

type InputDateValidationAttrs = {
  type: "date" | "month" | "week" | "time" | "datetime-local";
} & Pick<BuiltInValidationAttrs, "required" | "min" | "max">;

type InputNumberValidationAttrs = {
  type: "number";
} & Pick<BuiltInValidationAttrs, "required" | "min" | "max">;

type InputRangeValidationAttrs = {
  type: "range";
} & Pick<BuiltInValidationAttrs, "min" | "max">;

type InputCheckboxValidationAttrs = {
  type: "checkbox";
} & Pick<BuiltInValidationAttrs, "required">;

type InputRadioValidationAttrs = {
  type: "radio";
} & Pick<BuiltInValidationAttrs, "required">;

type TextAreaValidationAttrs = Pick<
  BuiltInValidationAttrs,
  "required" | "minLength" | "maxLength"
>;

type SelectValidationAttrs = Pick<BuiltInValidationAttrs, "required">;

type InputValidationAttrs =
  | InputTextValidationAttrs
  | InputDateValidationAttrs
  | InputNumberValidationAttrs
  | InputRangeValidationAttrs
  | InputCheckboxValidationAttrs
  | InputRadioValidationAttrs;

type ValidityStateKey = KeyOf<
  Pick<
    ValidityState,
    | "typeMismatch"
    | "valueMissing"
    | "tooShort"
    | "tooLong"
    | "rangeUnderflow"
    | "rangeOverflow"
    | "patternMismatch"
  >
>;

/**
 * Custom validation function
 */
export interface CustomValidations {
  [key: string]: (
    val: string,
    formData?: FormData
  ) => boolean | Promise<boolean>;
}

/**
 * Error message - static string or () => string
 */
export type ErrorMessage =
  | string
  | ((attrValue: string | undefined, name: string, value: string) => string);

/**
 * Definition for a single input in a form (validations + error messages)
 */
interface BaseControlDefinition {
  customValidations?: CustomValidations;
  errorMessages?: {
    [key: string]: ErrorMessage;
  };
}

export interface InputDefinition extends BaseControlDefinition {
  element?: "input";
  validationAttrs?: InputValidationAttrs;
}

export interface TextAreaDefinition extends BaseControlDefinition {
  element: "textarea";
  validationAttrs?: TextAreaValidationAttrs;
}

export interface SelectDefinition extends BaseControlDefinition {
  element: "select";
  validationAttrs?: SelectValidationAttrs;
}

type ControlDefinition =
  | InputDefinition
  | TextAreaDefinition
  | SelectDefinition;

/**
 * Form information (inputs, validations, error messages)
 */
export interface FormDefinition {
  inputs: {
    [key: string]: ControlDefinition;
  };
  errorMessages?: {
    [key: string]: ErrorMessage;
  };
}

/**
 * Mutable version of ValidityState that we can write to
 */
type MutableValidityState = Mutable<ValidityState>;

/**
 * Extended ValidityState which weill also contain our custom validations
 */
export type ExtendedValidityState = MutableValidityState &
  Record<string, boolean>;

export type AsyncValidationState = "idle" | "validating" | "done";
/**
 * Client-side state of the input
 */
export interface InputInfo {
  value: string | null;
  touched: boolean;
  dirty: boolean;
  state: AsyncValidationState;
  validity?: ExtendedValidityState;
  errorMessages?: Record<string, string>;
}

export type ServerOnlyCustomValidations<T extends FormDefinition> = Partial<{
  [key in KeyOf<T["inputs"]>]: CustomValidations;
}>;

// Server-side only (currently) - validate all specified inputs in the formData
export type ServerFormInfo<T extends FormDefinition> = {
  submittedValues: Record<KeyOf<T["inputs"]>, string | string[] | null>;
  inputs: Record<KeyOf<T["inputs"]>, InputInfo | InputInfo[]>;
  valid: boolean;
};

/**
 * Validator to link HTML attribute to ValidityState key as well as provide an
 * implementation for server side validation
 */
interface BuiltInValidator {
  domKey: ValidityStateKey;
  validate(value: string, attrValue: string): boolean;
  errorMessage: ErrorMessage;
}

interface FormContextObject<T extends FormDefinition> {
  formDefinition: T;
  serverFormInfo?: ServerFormInfo<T>;
  forceUpdate: any;
}

/**
 * See https://github.com/reach/reach-ui/blob/v0.17.0/packages/utils/src/types.ts#L9
 */
type AssignableRef<ValueType> =
  | React.RefCallback<ValueType>
  | React.MutableRefObject<ValueType | null>;
//#endregion

////////////////////////////////////////////////////////////////////////////////
//#region Constants + Utils

// Map of ValidityState key -> HTML attribute (i.e., valueMissing -> required)
const builtInValidityToAttrMapping: Record<
  ValidityStateKey,
  KeyOf<BuiltInValidationAttrs>
> = {
  typeMismatch: "type",
  valueMissing: "required",
  tooShort: "minLength",
  tooLong: "maxLength",
  rangeUnderflow: "min",
  rangeOverflow: "max",
  patternMismatch: "pattern",
};

// Mimic browser built-in validations so we can run the on the server
const builtInValidations: Record<
  KeyOf<BuiltInValidationAttrs>,
  BuiltInValidator
> = {
  type: {
    domKey: "typeMismatch",
    validate: (): boolean => {
      // Not re-implementing the built-in browser type validations :)
      return true;
    },
    errorMessage: (attrValue) => {
      let messages: Record<string, string> = {
        date: "Invalid date",
        email: "Invalid email",
        number: "Invalid number",
        tel: "Invalid phone number",
        url: "Invalid URL",
      };
      return (attrValue ? messages[attrValue] : null) || "Invalid value";
    },
  },
  required: {
    domKey: "valueMissing",
    validate: (value) => value.length > 0,
    errorMessage: () => `Field is required`,
  },
  minLength: {
    domKey: "tooShort",
    validate: (value, attrValue) =>
      value.length === 0 || value.length >= Number(attrValue),
    errorMessage: (attrValue) =>
      `Value must be at least ${attrValue} characters`,
  },
  maxLength: {
    domKey: "tooLong",
    validate: (value, attrValue) =>
      value.length === 0 || value.length <= Number(attrValue),
    errorMessage: (attrValue) =>
      `Value must be at most ${attrValue} characters`,
  },
  min: {
    domKey: "rangeUnderflow",
    validate: (value, attrValue) =>
      value.length === 0 || Number(value) >= Number(attrValue),
    errorMessage: (attrValue) =>
      `Value must be greater than or equal to ${attrValue}`,
  },
  max: {
    domKey: "rangeOverflow",
    validate: (value, attrValue) =>
      value.length === 0 || Number(value) <= Number(attrValue),
    errorMessage: (attrValue) =>
      `Value must be less than or equal to ${attrValue}`,
  },
  pattern: {
    domKey: "patternMismatch",
    validate: (value, attrValue) =>
      value.length === 0 || new RegExp(attrValue).test(value),
    errorMessage: () => `Value does not match the expected pattern`,
  },
};

function invariant(value: boolean, message?: string): asserts value;
function invariant<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T;
function invariant(value: any, message?: string) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}

function assignRef<RefValueType = unknown>(
  ref: AssignableRef<RefValueType> | null | undefined,
  value: RefValueType
) {
  if (ref == null) return;
  if (typeof ref === "function") {
    ref(value);
  } else {
    try {
      ref.current = value;
    } catch (error) {
      throw new Error(`Cannot assign value "${value}" to ref "${ref}"`);
    }
  }
}

function useComposedRefs<RefValueType = unknown>(
  ...refs: (AssignableRef<RefValueType> | null | undefined)[]
): React.RefCallback<RefValueType> {
  return React.useCallback((node) => {
    for (let ref of refs) {
      assignRef(ref, node);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refs);
}

const getInputId = (name: string, reactId: string) => `${name}--${reactId}`;
const getErrorsId = (name: string, reactId: string) =>
  `${name}-errors--${reactId}`;
const composeClassNames = (classes: Array<string | undefined>) =>
  classes.filter((v) => v).join(" ");
const omit = (
  obj: Record<string, any>,
  ...keys: string[]
): Record<string, any> =>
  Object.entries(obj)
    .filter(([k]) => !keys.includes(k))
    .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v }), {});

function getBaseValidityState(): ExtendedValidityState {
  return {
    badInput: false,
    customError: false,
    rangeOverflow: false, // max
    rangeUnderflow: false, // min
    patternMismatch: false, // pattern
    stepMismatch: false, // step
    tooLong: false, // maxlength
    tooShort: false, // minlength
    typeMismatch: false, // type="..."
    valueMissing: false, // required
    // Is the input valid?
    valid: true,
  };
}

function IsInputDefinition(
  inputDef: ControlDefinition
): inputDef is InputDefinition {
  return inputDef.element === "input" || inputDef.element == null;
}

// Perform all specified html validations for a single input
// Called in a useEffect client side and from validateServerFormIno server-side
async function validateInput(
  inputName: string,
  validationAttrs: ControlDefinition["validationAttrs"],
  customValidations: ControlDefinition["customValidations"],
  value: string,
  inputEl?: SupportedHTMLElements | SupportedHTMLElements[], // CSR
  formData?: FormData // SSR
): Promise<ExtendedValidityState> {
  let validity = getBaseValidityState();

  if (!formData) {
    let formEl = Array.isArray(inputEl) ? inputEl[0]?.form : inputEl?.form;
    invariant(
      formEl,
      `validateInput expected an inputEl.form to be available for input "${inputName}"`
    );
    formData = new FormData(formEl);
  }

  if (validationAttrs) {
    for (let _attr of Object.keys(validationAttrs)) {
      let attr = _attr as KeyOf<BuiltInValidationAttrs>;
      // Ignoring this "error" since the type narrowing to accomplish this
      // would be nasty due to the differences in attribute values per input
      // type.  We're going to rely on the *ValidationAttrs types to ensure
      // users are specifying valid attributes up front in their schemas and
      // just yolo this lookup
      // @ts-expect-error
      let _attrValue = validationAttrs[attr] || null;
      let attrValue = calculateValidationAttr(_attrValue, formData);
      // Undefined attr values means the attribute doesn't exist and there's
      // nothing to validate
      if (attrValue == null) {
        continue;
      }
      let builtInValidation = builtInValidations[attr];
      let isInvalid = false;
      let isElInvalid = (el?: SupportedHTMLElements) =>
        el?.validity
          ? el?.validity[builtInValidation.domKey]
          : !builtInValidation.validate(value, String(attrValue));
      if (Array.isArray(inputEl)) {
        isInvalid = inputEl.every((el) => isElInvalid(el));
      } else {
        isInvalid = isElInvalid(inputEl);
      }
      validity[builtInValidation?.domKey || attr] = isInvalid;
      validity.valid = validity.valid && !isInvalid;
    }
  }

  if (customValidations) {
    for (let name of Object.keys(customValidations)) {
      let validate = customValidations[name];
      let isInvalid = !(await validate(value, formData));
      validity[name] = isInvalid;
      validity.valid = validity.valid && !isInvalid;
    }
  }

  return validity;
}

// Perform all validations for a submitted form on the server
export async function validateServerFormData<T extends FormDefinition>(
  formData: FormData,
  formDefinition: T,
  serverCustomValidations?: ServerOnlyCustomValidations<T>
): Promise<ServerFormInfo<T>> {
  // Unsure if there's a better way to do this type of object mapping while
  // keeping the keys strongly typed - but this currently complains since we
  // haven't filled in the required keys yet
  // @ts-expect-error
  const inputs: ServerFormInfo["inputs"] = {};
  const submittedValues = {} as ServerFormInfo<T>["submittedValues"];

  let valid = true;
  let entries = Object.entries(formDefinition.inputs) as Array<
    [KeyOf<T["inputs"]>, ControlDefinition]
  >;
  await Promise.all(
    entries.map(async ([inputName, inputDef]) => {
      let values = formData.getAll(inputName);
      if (formData.has(inputName)) {
        for (let value of values) {
          if (typeof value === "string") {
            // Always assume inputs have been modified during SSR validation
            let inputInfo: InputInfo = {
              value,
              touched: true,
              dirty: true,
              state: "done",
              validity: await validateInput(
                inputName,
                inputDef.validationAttrs,
                {
                  ...inputDef.customValidations,
                  ...serverCustomValidations?.[inputName],
                },
                value,
                undefined,
                formData
              ),
            };
            // Add the values to inputs/submittedValues properly depending on if
            // we've encountered multiple values for this input name or not
            addValueFromSingleOrMultipleInput(inputName, inputInfo, inputs);
            addValueFromSingleOrMultipleInput(
              inputName,
              value,
              submittedValues
            );
            valid = valid && inputInfo.validity?.valid === true;
          } else {
            console.warn(
              `Skipping non-string value in FormData for field [${inputName}]`
            );
          }
        }
      } else {
        let inputInfo: InputInfo = {
          value: null,
          touched: true,
          dirty: true,
          state: "done",
          validity: await validateInput(
            inputName,
            inputDef.validationAttrs,
            inputDef.customValidations,
            "",
            undefined,
            formData
          ),
        };
        inputs[inputName] = inputInfo;
        submittedValues[inputName] = null;
      }
    })
  );
  return { submittedValues, inputs, valid };
}

// Determine the defaultValue for a rendered input, properly handling inputs
// with multiple values
function getInputDefaultValue<T extends FormDefinition>(
  name: string,
  serverFormInfo?: ServerFormInfo<T>,
  index?: number
) {
  let submittedValue = serverFormInfo?.submittedValues?.[name];
  if (Array.isArray(submittedValue)) {
    invariant(
      index != null && index >= 0,
      `Expected an "index" value for multiple-submission field "${name}"`
    );
    return submittedValue[index];
  } else if (typeof submittedValue === "string") {
    return submittedValue;
  }
}

// Mutate `value` properly depending on whether or not we have multiple values
// for a given input name
function addValueFromSingleOrMultipleInput<T>(
  name: string,
  value: T,
  values: Record<string, T | T[]>
) {
  if (name in values) {
    let existingValue = values[name];
    if (Array.isArray(existingValue)) {
      existingValue.push(value);
    } else {
      values[name] = [existingValue, value];
    }
  } else {
    values[name] = value;
  }
}

// Generate a FormData object from our submittedValues structure.  This is
// needed for the _initial_ render after a document POST submission where we
// don't yet have an input ref to access the <form>, but we need a FormData
// instance to determine the initial validation attribute values (in case any
// are dynamic).  So we can re-construct from what we just submitted.
// Subsequent renders then use ne wFormData(inputRef.current.form)
function generateFormDataFromServerFormInfo<T extends FormDefinition>(
  submittedValues: ServerFormInfo<T>["submittedValues"]
) {
  let formData = new FormData();
  Object.keys(submittedValues).forEach((k) => {
    let v = submittedValues[k];
    if (Array.isArray(v)) {
      v.forEach((v2) => formData.append(k, v2));
    } else if (typeof v === "string") {
      formData.set(k, v);
    }
  });
  return formData;
}

// Calculate a single validation attribute value to render onto an individual input
function calculateValidationAttr(
  attrValue: ValueOf<BuiltInValidationAttrs> | null,
  formData: FormData
) {
  return typeof attrValue === "function" ? attrValue(formData) : attrValue;
}

// Calculate the validation attribute values to render onto an individual input
function calculateValidationAttrs(
  validationAttrs: ControlDefinition["validationAttrs"],
  formData: FormData
) {
  let entries = Object.entries(validationAttrs || {}) as [
    KeyOf<BuiltInValidationAttrs>,
    ValueOf<BuiltInValidationAttrs>
  ][];
  return entries.reduce((acc, [attrName, attrValue]) => {
    let value = calculateValidationAttr(attrValue, formData);
    if (value != null) {
      acc[attrName] = value;
    }
    return acc;
  }, {} as Record<string, string | number | boolean>);
}

// Does our form have any dynamic attribute values that require re-evaluation
// on all form changes?
function hasDynamicAttributes(formDefinition: FormDefinition) {
  return Object.values(formDefinition.inputs).some((inputDef) =>
    Object.values(inputDef.validationAttrs || {}).some(
      (attr) => typeof attr === "function"
    )
  );
}

function getClasses(
  info: InputInfo,
  type: "label" | SupportedControlTypes,
  className?: string
) {
  let { validity, state, touched, dirty } = info;
  return composeClassNames([
    `rvs-${type}`,
    shouldShowErrors(validity, state, touched) ? `rvs-${type}--invalid` : "",
    state === "validating" ? `rvs-${type}--validating` : "",
    touched ? `rvs-${type}--touched` : "",
    dirty ? `rvs-${type}--dirty` : "",
    className,
  ]);
}

function shouldShowErrors(
  validity: ExtendedValidityState | undefined,
  state: AsyncValidationState,
  touched: boolean
) {
  return validity?.valid === false && state === "done" && touched;
}

// Get attributes shared across input/textarea/select elements
function getControlAttrs<T extends SupportedControlTypes>(
  ctx: ReturnType<typeof useValidatedControl>,
  controlType: T,
  name?: string,
  className?: string,
  index?: number
) {
  return {
    ref: ctx.composedRef,
    name: ctx.name,
    id: getInputId(ctx.name, ctx.id),
    className: getClasses(ctx.info, controlType, className),
    defaultValue: getInputDefaultValue(ctx.name, ctx.serverFormInfo, index),
    ...(shouldShowErrors(ctx.info.validity, ctx.info.state, ctx.info.touched)
      ? {
          "aria-invalid": true,
          "aria-errormessage": getErrorsId(name || ctx.name, ctx.id),
        }
      : {}),
    ...ctx.validationAttrs,
  };
}

// For checkbox/radio inputs, we need to listen across all inputs for the given
// name to update the validate as a group
function registerMultipleEventListeners(
  inputEl: SupportedHTMLElements,
  event: "blur" | "change" | "input",
  handler: () => void
) {
  let selector = `input[type="${inputEl.type}"][name="${inputEl.name}"]`;
  Array.from(inputEl.form?.querySelectorAll(selector) || []).forEach((el) =>
    el.addEventListener(event, handler)
  );
  return () => {
    Array.from(inputEl?.form?.querySelectorAll(selector) || []).forEach((el) =>
      el.removeEventListener(event, handler)
    );
  };
}

// Determine the current error messages to display based on the ExtendedValidityState
// On the initial client render, when we don't have a ref, we accept
// currentValidationAttrs.  On subsequent renders we use the ref and read the
// up-to-date attribute value
function getCurrentErrorMessages<T extends FormDefinition>(
  formDefinition: T,
  inputName: KeyOf<T["inputs"]>,
  inputValue: string,
  validity?: ExtendedValidityState,
  currentValidationAttrs?: Record<string, string | number | boolean>,
  inputEl?: SupportedHTMLElements
) {
  let messages = Object.entries(validity || {})
    .filter((e) => e[0] !== "valid" && e[1])
    .reduce((acc, [validation, valid]) => {
      let attr = builtInValidityToAttrMapping[
        validation as ValidityStateKey
      ] as KeyOf<BuiltInValidationAttrs>;
      let message =
        formDefinition?.inputs?.[inputName]?.errorMessages?.[validation] ||
        formDefinition?.errorMessages?.[validation] ||
        builtInValidations[attr]?.errorMessage;
      if (typeof message === "function") {
        let attrValue = inputEl
          ? inputEl.getAttribute(attr)
          : currentValidationAttrs?.[attr];
        message = message(
          attrValue != null ? String(attrValue) : undefined,
          inputName,
          inputValue
        );
      }
      return Object.assign(acc, {
        [validation]: message,
      });
    }, {});
  return Object.keys(messages).length > 0 ? messages : undefined;
}
//#endregion

////////////////////////////////////////////////////////////////////////////////
//#region Contexts + Components + Hooks

export const FormContext =
  React.createContext<FormContextObject<FormDefinition> | null>(null);

export function useOptionalFormContext<
  T extends FormDefinition
>(): FormContextObject<T> | null {
  const context = React.useContext<FormContextObject<T>>(
    FormContext as unknown as React.Context<FormContextObject<T>>
  );
  if (context) {
    return context;
  }
  return null;
}

interface UseValidatedControlOpts<
  T extends FormDefinition,
  E extends SupportedHTMLElements
> {
  name: KeyOf<T["inputs"]>;
  formDefinition?: T;
  serverFormInfo?: ServerFormInfo<T>;
  ref?:
    | React.ForwardedRef<E | null | undefined>
    | React.Ref<E | null | undefined>;
  index?: number;
  forceUpdate?: any;
}

// Handle validations for a single form control
function useValidatedControl<
  T extends FormDefinition,
  E extends SupportedHTMLElements
>(opts: UseValidatedControlOpts<T, E>) {
  let ctx = useOptionalFormContext<T>();
  let name = opts.name;
  let formDefinition = opts.formDefinition || ctx?.formDefinition;
  let forceUpdate = opts.forceUpdate || ctx?.forceUpdate;
  invariant(
    formDefinition,
    "useValidatedControl() must either be used inside a <FormProvider> " +
      "or be passed a `formDefinition` object"
  );

  let inputDef = formDefinition.inputs[name];
  invariant(
    inputDef,
    `useValidatedControl() could not find a corresponding definition ` +
      `for the "${name}" input`
  );

  let serverFormInfo = opts.serverFormInfo || ctx?.serverFormInfo;
  let wasSubmitted = false;
  let serverValue: string | null = null;
  let serverValidity: InputInfo["validity"] = undefined;

  if (serverFormInfo != null) {
    wasSubmitted = true;
    let submittedValue = serverFormInfo.submittedValues[name];
    let inputInfo = serverFormInfo.inputs[name];
    if (Array.isArray(inputInfo) || Array.isArray(submittedValue)) {
      invariant(
        Array.isArray(inputInfo) && Array.isArray(submittedValue),
        `Incompatible serverFormInfo structure for field "${name}"`
      );
      invariant(
        opts.index != null && opts.index >= 0,
        `Expected an "index" value for multiple-submission field "${name}"`
      );
      serverValue = submittedValue[opts.index];
      serverValidity = inputInfo[opts.index].validity;
    } else {
      serverValue = submittedValue;
      serverValidity = inputInfo.validity;
    }
  }

  // Setup React state

  // Need a ref to grab formData for attribute generation
  let inputRef = React.useRef<E>(null);

  let formData = inputRef.current?.form
    ? new FormData(inputRef.current.form)
    : serverFormInfo
    ? generateFormDataFromServerFormInfo(serverFormInfo.submittedValues)
    : new FormData();

  let currentValidationAttrs = calculateValidationAttrs(
    inputDef.validationAttrs,
    formData
  );

  let id = React.useId();
  let prevServerFormInfo = React.useRef<ServerFormInfo<T> | undefined>(
    serverFormInfo
  );
  let composedRef = useComposedRefs(inputRef, opts.ref);
  let [value, setValue] = React.useState(serverValue || "");
  let [dirty, setDirty] = React.useState<boolean>(wasSubmitted);
  let [touched, setTouched] = React.useState<boolean>(wasSubmitted);
  let [validationState, setValidationState] = React.useState<
    InputInfo["state"]
  >(wasSubmitted ? "done" : "idle");
  let [validity, setValidity] = React.useState<
    InputInfo["validity"] | undefined
  >(serverValidity);
  let [currentErrorMessages, setCurrentErrorMessages] = React.useState<
    Record<string, string> | undefined
  >(() =>
    getCurrentErrorMessages(
      formDefinition!,
      name,
      value,
      validity,
      currentValidationAttrs,
      undefined
    )
  );
  let controller = React.useRef<AbortController | null>(null);

  // Set InputInfo.touched on `blur` events
  React.useEffect(() => {
    let inputEl = inputRef.current;
    if (!inputEl) {
      return;
    }

    let inputType = IsInputDefinition(inputDef)
      ? inputDef.validationAttrs?.type
      : null;

    let handler = () => setTouched(true);

    if (inputType === "checkbox" || inputType === "radio") {
      return registerMultipleEventListeners(inputEl, "blur", handler);
    }

    inputEl.addEventListener("blur", handler);
    return () => inputEl?.removeEventListener("blur", handler);
  }, [inputDef, inputRef, name]);

  // Set value and InputInfo.dirty on `input` events
  React.useEffect(() => {
    let inputEl = inputRef.current;
    if (!inputEl) {
      return;
    }

    let elementType = !IsInputDefinition(inputDef) ? inputDef.element : null;
    let inputType = IsInputDefinition(inputDef)
      ? inputDef.validationAttrs?.type
      : null;

    let event: "change" | "input" =
      elementType === "select" ||
      inputType === "radio" ||
      inputType === "checkbox"
        ? "change"
        : "input";

    let handler = function (this: E) {
      setDirty(true);
      setValue(this.value);
    };

    if (inputType === "checkbox" || inputType === "radio") {
      return registerMultipleEventListeners(inputEl, event, handler);
    }

    inputEl.addEventListener(event, handler);
    return () => inputEl?.removeEventListener(event, handler);
  }, [inputDef]);

  // Run validations on input value changes
  React.useEffect(() => {
    async function go() {
      // If this is the first render after a server validation, consider us
      // validated and mark dirty/touched to show errors.  Then skip re-running
      // validations on the client
      if (prevServerFormInfo.current !== serverFormInfo) {
        prevServerFormInfo.current = serverFormInfo;
        setDirty(true);
        setTouched(true);
        setValidationState("done");
        if (serverValidity) {
          setValidity(serverValidity);
        }
        return;
      }

      // Abort any ongoing async validations
      if (controller.current) {
        controller.current.abort();
      }

      // Validate the input
      if (!inputDef) {
        setValidationState("done");
        return;
      }
      let localController = new AbortController();
      controller.current = localController;
      setValidationState("validating");

      let validity: ExtendedValidityState;
      let inputType = IsInputDefinition(inputDef)
        ? inputDef.validationAttrs?.type
        : null;
      if (inputType === "radio" || inputType === "checkbox") {
        validity = await validateInput(
          name,
          inputDef.validationAttrs,
          inputDef.customValidations,
          value,
          Array.from(
            inputRef.current?.form?.querySelectorAll(
              `input[type="${inputType}"][name="${name}"]`
            ) || []
          )
        );
      } else {
        validity = await validateInput(
          name,
          inputDef.validationAttrs,
          inputDef.customValidations,
          value,
          inputRef.current || undefined
        );
      }
      if (localController.signal.aborted) {
        return;
      }
      setValidationState("done");
      setValidity(validity);

      // Generate error messages based on the validations
      if (validity?.valid === false) {
        invariant(formDefinition, "No formDefinition available in useEffect");
        invariant(
          inputRef.current,
          "Expected an input to be present for client-side error message generation"
        );
        let messages = getCurrentErrorMessages(
          formDefinition,
          name,
          value,
          validity,
          undefined,
          inputRef.current
        );
        setCurrentErrorMessages(messages);
      } else {
        setCurrentErrorMessages(undefined);
      }
    }

    go().catch((e) => console.error("Error in validateInput useEffect", e));

    return () => controller.current?.abort();

    // Important: forceUpdate must remain included in the deps array for
    // auto-revalidation on dynamic attribute value changes
  }, [
    forceUpdate,
    formDefinition,
    inputDef,
    name,
    serverFormInfo,
    serverValidity,
    value,
  ]);

  let info: InputInfo = {
    value,
    dirty,
    touched,
    state: validationState,
    validity,
    errorMessages: currentErrorMessages,
  };

  // Provide the caller a prop getter to be spread onto the <label>
  function getLabelAttrs({
    ...attrs
  }: React.ComponentPropsWithoutRef<"label"> = {}): React.ComponentPropsWithoutRef<"label"> {
    return {
      className: getClasses(info, "label", attrs.className),
      htmlFor: getInputId(name, id),
      ...omit(attrs, "className"),
    };
  }

  // Provide the caller a prop getter to be spread onto the element containing
  // their rendered validation errors
  function getErrorsAttrs({
    ...attrs
  }: React.ComponentPropsWithoutRef<"ul"> = {}): React.ComponentPropsWithoutRef<"ul"> {
    return {
      className: composeClassNames(["rvs-errors", attrs.className]),
      id: getErrorsId(name, id),
      ...(shouldShowErrors(info.validity, info.state, info.touched)
        ? { role: "alert" }
        : {}),
      ...omit(attrs, "className"),
    };
  }

  return {
    name,
    id,
    validationAttrs: currentValidationAttrs,
    ref: inputRef,
    composedRef,
    info,
    serverFormInfo,
    controller,
    getLabelAttrs,
    getErrorsAttrs,
  };
}

interface UseValidatedInputOpts<T extends FormDefinition> {
  name: KeyOf<T["inputs"]>;
  formDefinition?: T;
  serverFormInfo?: ServerFormInfo<T>;
  ref?:
    | React.ForwardedRef<HTMLInputElement | null | undefined>
    | React.Ref<HTMLInputElement | null | undefined>;
  index?: number;
  forceUpdate?: any;
}

// User-facing useValidatedControl wrapper for <input> elements
export function useValidatedInput<T extends FormDefinition>(
  opts: UseValidatedInputOpts<T>
) {
  let ctx = useValidatedControl<T, HTMLInputElement>(opts);

  // Provide the caller a prop getter to be spread onto the <input>
  function getInputAttrs({
    ...attrs
  }: React.ComponentPropsWithoutRef<"input"> = {}): React.ComponentPropsWithoutRef<"input"> {
    let controlAttrs = getControlAttrs(
      ctx,
      "input",
      attrs.name,
      attrs.className,
      opts.index
    );
    return {
      ...controlAttrs,
      ...omit(attrs, "className", "ref"),
    };
  }

  return {
    info: ctx.info,
    ref: ctx.ref,
    controller: ctx.controller,
    getLabelAttrs: ctx.getLabelAttrs,
    getErrorsAttrs: ctx.getErrorsAttrs,
    getInputAttrs,
  };
}

interface UseValidatedTextAreaOpts<T extends FormDefinition> {
  name: KeyOf<T["inputs"]>;
  formDefinition?: T;
  serverFormInfo?: ServerFormInfo<T>;
  ref?:
    | React.ForwardedRef<HTMLTextAreaElement | null | undefined>
    | React.Ref<HTMLTextAreaElement | null | undefined>;
  index?: number;
  forceUpdate?: any;
}

// User-facing useValidatedControl wrapper for <textarea> elements
export function useValidatedTextArea<T extends FormDefinition>(
  opts: UseValidatedTextAreaOpts<T>
) {
  let ctx = useValidatedControl<T, HTMLTextAreaElement>(opts);

  // Provide the caller a prop getter to be spread onto the <textarea>
  function getTextAreaAttrs({
    ...attrs
  }: React.ComponentPropsWithoutRef<"textarea"> = {}): React.ComponentPropsWithoutRef<"textarea"> {
    let controlAttrs = getControlAttrs(
      ctx,
      "textarea",
      attrs.name,
      attrs.className,
      opts.index
    );
    return {
      ...controlAttrs,
      ...omit(attrs, "className", "ref"),
    };
  }

  return {
    info: ctx.info,
    ref: ctx.ref,
    controller: ctx.controller,
    getLabelAttrs: ctx.getLabelAttrs,
    getErrorsAttrs: ctx.getErrorsAttrs,
    getTextAreaAttrs,
  };
}

interface UseValidatedSelectOpts<T extends FormDefinition> {
  name: KeyOf<T["inputs"]>;
  formDefinition?: T;
  serverFormInfo?: ServerFormInfo<T>;
  ref?:
    | React.ForwardedRef<HTMLSelectElement | null | undefined>
    | React.Ref<HTMLSelectElement | null | undefined>;
  index?: number;
  forceUpdate?: any;
}

// User-facing useValidatedControl wrapper for <textarea> elements
export function useValidatedSelect<T extends FormDefinition>(
  opts: UseValidatedSelectOpts<T>
) {
  let ctx = useValidatedControl<T, HTMLSelectElement>(opts);

  // Provide the caller a prop getter to be spread onto the <textarea>
  function getSelectAttrs({
    ...attrs
  }: React.ComponentPropsWithoutRef<"select"> = {}): React.ComponentPropsWithoutRef<"select"> {
    let controlAttrs = getControlAttrs(
      ctx,
      "select",
      attrs.name,
      attrs.className,
      opts.index
    );
    return {
      ...controlAttrs,
      ...omit(attrs, "className", "ref"),
    };
  }

  return {
    info: ctx.info,
    ref: ctx.ref,
    controller: ctx.controller,
    getLabelAttrs: ctx.getLabelAttrs,
    getErrorsAttrs: ctx.getErrorsAttrs,
    getSelectAttrs,
  };
}

export interface FormProviderProps<
  T extends FormDefinition
> extends React.PropsWithChildren<{
    formDefinition: T;
    serverFormInfo?: ServerFormInfo<T>;
    formRef?: React.RefObject<HTMLFormElement>;
  }> {}

export function FormProvider<T extends FormDefinition>(
  props: FormProviderProps<T>
) {
  // If we have inputs using dynamic attributes, then we need to be able to
  // trigger re-renders o those inputs at a higher level an time the formData
  // changes, in case the dynamic attributes values need to be updated.
  let [forcedUpdate, forceUpdate] = React.useState({});
  React.useEffect(() => {
    let formEl = props.formRef?.current;
    if (!formEl || !hasDynamicAttributes(props.formDefinition)) {
      return;
    }
    let handler = () => forceUpdate({});
    formEl.addEventListener("change", handler, { capture: true });
    return () =>
      formEl?.removeEventListener("change", handler, { capture: true });
  }, [props.formDefinition, props.formRef]);

  return (
    <FormContext.Provider
      value={{
        formDefinition: props.formDefinition,
        serverFormInfo: props.serverFormInfo,
        forceUpdate: forcedUpdate,
      }}
    >
      {props.children}
    </FormContext.Provider>
  );
}

export interface ControlWrapperProps<
  T extends FormDefinition
> extends React.PropsWithChildren<{
    name: string;
    label?: string;
    labelAttrs: React.ComponentPropsWithoutRef<"label">;
    errorAttrs: React.ComponentPropsWithoutRef<"ul">;
    formDefinition?: T;
    serverFormInfo?: ServerFormInfo<T>;
    info: InputInfo;
  }> {}

// Internal utility component to handle <label> and error displays while leaving
// the <input></<textarea> control rendering to the calling component
function ControlWrapper<T extends FormDefinition>({
  name,
  label,
  labelAttrs,
  errorAttrs,
  formDefinition,
  serverFormInfo,
  info,
  children,
}: ControlWrapperProps<T>) {
  invariant(
    formDefinition,
    `No form definition found for form control with name "${name}">`
  );

  // Not all input types can have a required attribute
  let validationAttrs =
    formDefinition.inputs[name] && formDefinition.inputs[name].validationAttrs
      ? formDefinition.inputs[name].validationAttrs
      : null;
  let isRequired =
    validationAttrs && "required" in validationAttrs
      ? validationAttrs.required === true
      : false;

  let showErrors = serverFormInfo != null || info.touched;

  return (
    <>
      {label ? (
        <label {...labelAttrs}>
          {label}
          {isRequired ? "*" : null}
        </label>
      ) : null}
      {children}
      {/* Display validation state */}
      {showErrors ? <ControlErrors info={info} {...errorAttrs} /> : null}
    </>
  );
}

interface ControlErrorsProps extends React.ComponentPropsWithoutRef<"ul"> {
  info: InputInfo;
}

function ControlErrors({ info, ...attrs }: ControlErrorsProps) {
  if (info.state === "idle") {
    return null;
  }
  if (info.state === "validating") {
    return <p className="rvs-validating">Validating...</p>;
  }
  if (info.validity?.valid) {
    return null;
  }
  return <Errors {...attrs} messages={info.errorMessages} />;
}

export interface InputProps<T extends FormDefinition>
  extends UseValidatedInputOpts<T>,
    Omit<React.ComponentPropsWithoutRef<"input">, "name"> {
  label: string;
  index?: number;
}

// Syntactic sugar component to handle <label>/<input> and error displays
export function Input<T extends FormDefinition>({
  name,
  formDefinition: formDefinitionProp,
  serverFormInfo: serverFormInfoProp,
  label,
  index,
  ...inputAttrs
}: InputProps<T>) {
  let ctx = useOptionalFormContext<T>();
  let formDefinition = formDefinitionProp || ctx?.formDefinition;
  let serverFormInfo = serverFormInfoProp || ctx?.serverFormInfo;
  let { info, getInputAttrs, getLabelAttrs, getErrorsAttrs } =
    useValidatedInput({ name, formDefinition, serverFormInfo, index });

  return (
    <ControlWrapper
      name={name}
      label={label}
      labelAttrs={getLabelAttrs()}
      errorAttrs={getErrorsAttrs()}
      formDefinition={formDefinition}
      serverFormInfo={serverFormInfo}
      info={info}
    >
      <input
        {...getInputAttrs({
          defaultValue: getInputDefaultValue(name, serverFormInfo, index),
          ...inputAttrs,
        })}
      />
    </ControlWrapper>
  );
}

export interface TextAreaProps<T extends FormDefinition>
  extends UseValidatedInputOpts<T>,
    Omit<React.ComponentPropsWithoutRef<"textarea">, "name"> {
  label: string;
  index?: number;
}

// Syntactic sugar component to handle <label>/<input> and error displays
export function TextArea<T extends FormDefinition>({
  name,
  formDefinition: formDefinitionProp,
  serverFormInfo: serverFormInfoProp,
  label,
  index,
  ...inputAttrs
}: TextAreaProps<T>) {
  let ctx = useOptionalFormContext<T>();
  let formDefinition = formDefinitionProp || ctx?.formDefinition;
  let serverFormInfo = serverFormInfoProp || ctx?.serverFormInfo;
  let { info, getTextAreaAttrs, getLabelAttrs, getErrorsAttrs } =
    useValidatedTextArea({ name, formDefinition, serverFormInfo, index });

  return (
    <ControlWrapper
      name={name}
      label={label}
      labelAttrs={getLabelAttrs()}
      errorAttrs={getErrorsAttrs()}
      formDefinition={formDefinition}
      serverFormInfo={serverFormInfo}
      info={info}
    >
      <textarea
        {...getTextAreaAttrs({
          defaultValue: getInputDefaultValue(name, serverFormInfo, index),
          ...inputAttrs,
        })}
      />
    </ControlWrapper>
  );
}

export interface SelectProps<T extends FormDefinition>
  extends UseValidatedSelectOpts<T>,
    Omit<React.ComponentPropsWithoutRef<"select">, "name"> {
  label: string;
  index?: number;
}

// Syntactic sugar component to handle <label>/<input> and error displays
export function Select<T extends FormDefinition>({
  name,
  formDefinition: formDefinitionProp,
  serverFormInfo: serverFormInfoProp,
  label,
  index,
  children,
  ...inputAttrs
}: SelectProps<T>) {
  let ctx = useOptionalFormContext<T>();
  let formDefinition = formDefinitionProp || ctx?.formDefinition;
  let serverFormInfo = serverFormInfoProp || ctx?.serverFormInfo;
  let { info, getSelectAttrs, getLabelAttrs, getErrorsAttrs } =
    useValidatedSelect({ name, formDefinition, serverFormInfo, index });

  return (
    <ControlWrapper
      name={name}
      label={label}
      labelAttrs={getLabelAttrs()}
      errorAttrs={getErrorsAttrs()}
      formDefinition={formDefinition}
      serverFormInfo={serverFormInfo}
      info={info}
    >
      <select
        {...getSelectAttrs({
          defaultValue: getInputDefaultValue(name, serverFormInfo, index),
          ...inputAttrs,
        })}
      >
        {children}
      </select>
    </ControlWrapper>
  );
}

export interface ErrorProps {
  id?: string;
  messages?: Record<string, string>;
}

// Display errors for a given input
export function Errors({ id, messages, ...attrs }: ErrorProps) {
  if (!messages) {
    return null;
  }
  return (
    <ul {...attrs} id={id} role="alert">
      {Object.entries(messages).map(([validation, message]) => (
        <li key={validation}>{`🆘 ${message}`}</li>
      ))}
    </ul>
  );
}
//#endregion
