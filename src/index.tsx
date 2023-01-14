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

/**
 * Validation attributes built-in to the browser
 */
interface BuiltInValidationAttrs {
  type?: string | ((fd: FormData) => string | null | undefined);
  required?: boolean | ((fd: FormData) => boolean | null | undefined);
  minLength?: number | ((fd: FormData) => number | null | undefined);
  maxLength?: number | ((fd: FormData) => number | null | undefined);
  min?: number | ((fd: FormData) => number | null | undefined);
  max?: number | ((fd: FormData) => number | null | undefined);
  pattern?: string | ((fd: FormData) => string | null | undefined);
}

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
export interface InputDefinition {
  validationAttrs?: BuiltInValidationAttrs;
  customValidations?: CustomValidations;
  errorMessages?: {
    [key: string]: ErrorMessage;
  };
}

/**
 * Form information (inputs, validations, error messages)
 */
export interface FormDefinition {
  inputs: {
    [key: string]: InputDefinition;
  };
  errorMessages: {
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

/**
 * Client-side state of the input
 */
export interface InputInfo {
  touched: boolean;
  dirty: boolean;
  state: "idle" | "validating" | "done";
  validity?: ExtendedValidityState;
  errorMessages?: Record<string, string>;
}

// Server-side only (currently) - validate all specified inputs in the formData
export type ServerFormInfo<T extends FormDefinition> = {
  submittedValues: Record<KeyOf<T["inputs"]>, string | string[]>;
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

// Perform all specified html validations for a single input
// Called in a useEffect client side and from validateServerFormIno server-side
async function validateInput(
  inputName: string,
  inputDef: InputDefinition,
  value: string,
  inputEl?: HTMLInputElement, // CSR
  formData?: FormData // SSR
): Promise<ExtendedValidityState> {
  let validity = getBaseValidityState();

  if (!formData) {
    invariant(
      inputEl?.form,
      `validateInput expected an inputEl.form to be available for input "${inputName}"`
    );
    formData = new FormData(inputEl.form);
  }

  if (inputDef.validationAttrs) {
    for (let _attr of Object.keys(inputDef.validationAttrs)) {
      let attr = _attr as KeyOf<BuiltInValidationAttrs>;
      let attrValue = calculateValidationAttr(
        inputDef.validationAttrs[attr],
        formData
      );
      // Undefined attr values means the attribute doesn't exist and there's
      // nothing to validate
      if (attrValue == null) {
        continue;
      }
      let builtInValidation = builtInValidations[attr];
      let isInvalid = inputEl?.validity
        ? inputEl?.validity[builtInValidation.domKey]
        : !builtInValidation.validate(value, String(attrValue));
      validity[builtInValidation?.domKey || attr] = isInvalid;
      validity.valid = validity.valid && !isInvalid;
    }
  }

  if (inputDef.customValidations) {
    let currentFormData =
      formData || (inputEl?.form ? new FormData(inputEl.form) : undefined);
    for (let name of Object.keys(inputDef.customValidations)) {
      let validate = inputDef.customValidations[name];
      let isInvalid = !(await validate(value, currentFormData));
      validity[name] = isInvalid;
      validity.valid = validity.valid && !isInvalid;
    }
  }

  return validity;
}

// Perform all validations for a submitted form on the server
export async function validateServerFormData<T extends FormDefinition>(
  formData: FormData,
  formDefinition: T
): Promise<ServerFormInfo<T>> {
  // Unsure if there's a better way to do this type of object mapping while
  // keeping the keys strongly typed - but this currently complains since we
  // haven't filled in the required keys yet
  // @ts-expect-error
  const inputs: ServerFormInfo["inputs"] = {};
  // @ts-expect-error
  const submittedValues: ServerFormInfo["submittedValues"] = {};

  let valid = true;
  let entries = Object.entries(formDefinition.inputs) as Array<
    [KeyOf<T["inputs"]>, InputDefinition]
  >;
  await Promise.all(
    entries.map(async ([inputName, inputDef]) => {
      let values = formData.getAll(inputName);
      for (let value of values) {
        if (typeof value === "string") {
          // Always assume inputs have been modified during SSR validation
          let inputInfo = {
            touched: true,
            dirty: true,
            state: "done",
            validity: await validateInput(
              inputName,
              inputDef,
              value,
              undefined,
              formData
            ),
          };
          // Add the values to inputs/submittedValues properly depending on if
          // we've encountered multiple values for this input name or not
          addValueFromSingleOrMultipleInput(inputName, inputInfo, inputs);
          addValueFromSingleOrMultipleInput(inputName, value, submittedValues);
          valid = valid && inputInfo.validity.valid;
        } else {
          console.warn(
            `Skipping non-string value in FormData for field [${inputName}]`
          );
        }
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
  attrValue: ValueOf<BuiltInValidationAttrs>,
  formData: FormData
) {
  return typeof attrValue === "function" ? attrValue(formData) : attrValue;
}

// Calculate the validation attribute values to render onto an individual input
function calculateValidationAttrs<T extends FormDefinition>(
  validationAttrs: InputDefinition["validationAttrs"],
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
//#endregion

////////////////////////////////////////////////////////////////////////////////
//#region Contexts + Components + Hooks

export const FormContext =
  React.createContext<FormContextObject<FormDefinition> | null>(null);

// Shout out for this nifty little approach!
// https://www.hipsterbrown.com/musings/musing/react-context-with-generics/
export function FormContextProvider<T extends FormDefinition>({
  children,
  value,
}: React.PropsWithChildren<{ value: FormContextObject<T> }>) {
  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

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

// Handle validations for a single input
export function useValidatedInput<T extends FormDefinition>(
  opts: UseValidatedInputOpts<T>
) {
  let ctx = useOptionalFormContext<T>();
  let id = React.useId();
  let name = opts.name;
  let formDefinition = opts.formDefinition || ctx?.formDefinition;
  let forceUpdate = opts.forceUpdate || ctx?.forceUpdate;

  invariant(
    formDefinition,
    "useValidatedInput() must either be used inside a <FormContext.Provider> " +
      "or be passed a `formDefinition` object"
  );

  let inputDef = formDefinition.inputs[name];

  invariant(
    inputDef,
    `useValidatedInput() could not find a corresponding definition for the "${name}" input`
  );

  let errorMessages = (key: ValidityStateKey, inputName: KeyOf<T["inputs"]>) =>
    formDefinition?.inputs?.[inputName]?.errorMessages?.[key] ||
    formDefinition?.errorMessages?.[key];

  let serverFormInfo = opts.serverFormInfo || ctx?.serverFormInfo;
  let wasSubmitted = false;
  let serverValue: string | undefined = undefined;
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

  let prevServerFormInfo = React.useRef<ServerFormInfo<T> | undefined>(
    serverFormInfo
  );
  let inputRef = React.useRef<HTMLInputElement>(null);
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
  let controller = React.useRef<AbortController | null>(null);

  let formData = inputRef.current?.form
    ? new FormData(inputRef.current.form)
    : serverFormInfo
    ? generateFormDataFromServerFormInfo(serverFormInfo.submittedValues)
    : new FormData();

  let validationAttrs = calculateValidationAttrs(
    inputDef.validationAttrs,
    formData
  );

  let currentErrorMessages: Record<string, string> | undefined;
  if (validity?.valid === false) {
    currentErrorMessages = Object.entries(validity)
      .filter((e) => e[0] !== "valid" && e[1])
      .reduce((acc, [validation, valid]) => {
        let attr = builtInValidityToAttrMapping[
          validation as ValidityStateKey
        ] as KeyOf<BuiltInValidationAttrs>;
        let message =
          errorMessages(validation as ValidityStateKey, name) ||
          builtInValidations[attr]?.errorMessage;
        if (typeof message === "function") {
          let attrValue = validationAttrs[attr];
          message = message(
            attrValue ? String(attrValue) : undefined,
            name,
            value
          );
        }
        return Object.assign(acc, {
          [validation]: message,
        });
      }, {});
  }

  let showErrors =
    validity?.valid === false && validationState === "done" && touched;

  React.useEffect(() => {
    let inputEl = inputRef.current;
    if (!inputEl) {
      return;
    }
    let handler = () => setTouched(true);
    inputEl.addEventListener("blur", handler);
    return () => inputEl?.removeEventListener("blur", handler);
  }, [inputRef]);

  React.useEffect(() => {
    let inputEl = inputRef.current;
    if (!inputEl) {
      return;
    }
    let handler = function (this: HTMLInputElement) {
      setDirty(true);
      setValue(this.value);
    };
    inputEl.addEventListener("input", handler);
    return () => inputEl?.removeEventListener("input", handler);
  }, [inputRef]);

  React.useEffect(() => {
    async function go() {
      // If we heard back from the server, consider us validated and mark
      // dirty/touched to show errors
      if (serverFormInfo) {
        setDirty(true);
        setTouched(true);
        setValidationState("done");
        if (serverValidity) {
          setValidity(serverValidity);
        }
      }

      // If this is the first render after a server validation, don't re-run
      // validations on the client
      if (prevServerFormInfo.current !== serverFormInfo) {
        prevServerFormInfo.current = serverFormInfo;
        return;
      }

      // Abort any ongoing async validations
      if (controller.current) {
        controller.current.abort();
      }

      // Validate the input
      if (!inputDef) {
        console.warn(`No validations found for the "${name}" input`);
        setValidationState("done");
        return;
      }
      let localController = new AbortController();
      controller.current = localController;
      setValidationState("validating");
      const validity = await validateInput(
        name,
        inputDef,
        value,
        inputRef.current || undefined
      );
      if (localController.signal.aborted) {
        return;
      }
      setValidationState("done");
      setValidity(validity);
    }

    go().catch((e) => console.error("Error in validateInput useEffect", e));

    return () => controller.current?.abort();

    // Important: forceUpdate must remain included in the deps array for
    // auto-revalidation on dynamic attribute value changes
  }, [forceUpdate, name, inputDef, value, serverFormInfo, serverValidity]);

  function getClasses(type: "label" | "input", className?: string) {
    return composeClassNames([
      `rvs-${type}`,
      showErrors ? `rvs-${type}--invalid` : "",
      validationState === "validating" ? `rvs-${type}--validating` : "",
      touched ? `rvs-${type}--touched` : "",
      dirty ? `rvs-${type}--dirty` : "",
      className,
    ]);
  }

  // Provide the caller a prop getter to be spread onto the <input>
  function getInputAttrs({
    ...attrs
  }: React.ComponentPropsWithoutRef<"input"> = {}): React.ComponentPropsWithoutRef<"input"> {
    let inputAttrs = {
      ref: composedRef,
      name,
      id: getInputId(name, id),
      className: getClasses("input", attrs.className),
      defaultValue: getInputDefaultValue(name, serverFormInfo, opts.index),
      ...(showErrors
        ? {
            "aria-invalid": true,
            "aria-errormessage": getErrorsId(attrs.name || name, id),
          }
        : {}),
      ...validationAttrs,
      ...omit(attrs, "className", "ref"),
    };

    return inputAttrs;
  }

  // Provide the caller a prop getter to be spread onto the <label>
  function getLabelAttrs({
    ...attrs
  }: React.ComponentPropsWithoutRef<"label"> = {}): React.ComponentPropsWithoutRef<"label"> {
    return {
      className: getClasses("label", attrs.className),
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
      ...(showErrors ? { role: "alert" } : {}),
      ...omit(attrs, "className"),
    };
  }

  return {
    info: {
      dirty,
      touched,
      state: validationState,
      validity,
      errorMessages: currentErrorMessages,
    } as InputInfo,
    controller,
    getInputAttrs,
    getLabelAttrs,
    getErrorsAttrs,
  };
}

export interface FormProviderProps<
  T extends FormDefinition
> extends React.PropsWithChildren<{
    formDefinition: T;
    serverFormInfo: ServerFormInfo<T>;
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

export interface FieldProps<T extends FormDefinition>
  extends UseValidatedInputOpts<T>,
    Omit<React.ComponentPropsWithoutRef<"input">, "name"> {
  label: string;
  index?: number;
}

// Syntactic sugar component to handle <label>/<input> and error displays
export function Field<T extends FormDefinition>({
  name,
  formDefinition: formDefinitionProp,
  serverFormInfo: serverFormInfoProp,
  label,
  index,
  ...inputAttrs
}: FieldProps<T>) {
  let ctx = useOptionalFormContext<T>();
  let formDefinition = formDefinitionProp || ctx?.formDefinition;
  let serverFormInfo = serverFormInfoProp || ctx?.serverFormInfo;
  let { info, getInputAttrs, getLabelAttrs, getErrorsAttrs } =
    useValidatedInput({ name, formDefinition, serverFormInfo, index });

  invariant(
    formDefinition,
    `No form definition found for <Field name="${name}">`
  );

  let showErrors = serverFormInfo != null || info.touched;

  return (
    <>
      <label {...getLabelAttrs()}>
        {label}
        {formDefinition.inputs[name]?.validationAttrs?.required ? "*" : null}
      </label>
      <input
        {...getInputAttrs({
          defaultValue: getInputDefaultValue(name, serverFormInfo, index),
          ...inputAttrs,
        })}
      />

      {/* Display validation state */}
      {showErrors ? <FieldErrors info={info} {...getErrorsAttrs()} /> : null}
    </>
  );
}

interface FieldErrorsProps extends React.ComponentPropsWithoutRef<"ul"> {
  info: InputInfo;
}

function FieldErrors({ info, ...attrs }: FieldErrorsProps) {
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
