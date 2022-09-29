import * as React from "react";

////////////////////////////////////////////////////////////////////////////////
//#region Types

export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

// Remove readonly modifiers from existing types to make them mutable
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// Restrict object keys to strings, and don't permit number/Symbol
type KeyOfString<T> = Extract<keyof T, string>;

// Extract the value type for an object
type ValueOf<T> = T[keyof T];

/**
 * Validation attributes built-in to the browser
 */
interface InputValidations {
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

/**
 * An HTML validation attribute that can be placed on an input
 */
export type ValidationAttribute =
  | "type"
  | "required"
  | "minLength"
  | "maxLength"
  | "min"
  | "max"
  | "pattern";

/**
 * Custom validation function
 */
export interface CustomValidation {
  (val: string, formData?: FormData): boolean | Promise<boolean>;
}

/**
 * Union type for both built-in and custom validations
 */
export type Validations =
  | {
      [thing in ValidationAttribute]?: InputValidations[thing];
    }
  | Record<string, CustomValidation>;

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
 * The DOM ValidityState key representing a validation error
 */
export type ValidityStateKey = keyof ValidityState;

/**
 * Map of inputName -> HTML validations for the input
 */
export type FormValidations = Record<string, Validations>;

/**
 * Form level InputInfo
 */
export type FormInfo = Record<string, InputInfo>;

// validation key -> UI message to display
export type ErrorMessage =
  | string
  | ((attrValue: string | undefined, name: string, value: string) => string);
export type ErrorMessages = Record<string, ErrorMessage>;

export interface InputInfo {
  touched: boolean;
  dirty: boolean;
  state: "idle" | "validating" | "done";
  validity?: ExtendedValidityState;
  errorMessages?: Record<string, string>;
}

// Server-side only (currently) - validate all specified inputs in the formData
export type ServerFormInfo<T extends FormValidations = {}> = {
  submittedFormData: Record<string, string>;
  inputs: Record<KeyOfString<T>, InputInfo>;
  valid: boolean;
};

/**
 * Validator to link HTML attribute to ValidityState key as well as provide an
 * implementation for server side validation
 */
interface Validator {
  domKey: ValidityStateKey;
  validate(value: string, attrValue: string): boolean;
  errorMessage: ErrorMessage;
}

interface FormContextObject<T extends FormValidations> {
  formValidations: T;
  errorMessages?: ErrorMessages;
  serverFormInfo?: ServerFormInfo<T>;
  requiredNotation?: string;
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

// Browser built-in validations
const builtInValidations: Record<ValidationAttribute, Validator> = {
  type: {
    domKey: "typeMismatch",
    validate: (value: string, attrValue: string): boolean => {
      // FIXME: How much do we want to do here?
      return true;
    },
    errorMessage: (attrValue) => {
      let messages = {
        date: "Invalid date",
        email: "Invalid email",
        number: "Invalid number",
        tel: "Invalid phone number",
        url: "Invalid URL",
      };
      if (typeof attrValue === "string" && attrValue in messages) {
        // TODO: ???
        //@ts-ignore
        return messages[attrValue];
      }
      return "Invalid value";
    },
  },
  required: {
    domKey: "valueMissing",
    validate: (value: string, attrValue: string): boolean => value.length > 0,
    errorMessage: () => `Field is required`,
  },
  minLength: {
    domKey: "tooShort",
    validate: (value: string, attrValue: string): boolean =>
      value.length === 0 || value.length >= Number(attrValue),
    errorMessage: (attrValue) =>
      `Value must be at least ${attrValue} characters`,
  },
  maxLength: {
    domKey: "tooLong",
    validate: (value: string, attrValue: string): boolean =>
      value.length === 0 || value.length <= Number(attrValue),
    errorMessage: (attrValue) =>
      `Value must be at most ${attrValue} characters`,
  },
  min: {
    domKey: "rangeUnderflow",
    validate: (value: string, attrValue: string): boolean =>
      value.length === 0 || Number(value) < Number(attrValue),
    errorMessage: (attrValue) =>
      `Value must be greater than or equal to ${attrValue}`,
  },
  max: {
    domKey: "rangeOverflow",
    validate: (value: string, attrValue: string): boolean =>
      value.length === 0 || Number(value) > Number(attrValue),
    errorMessage: (attrValue) =>
      `Value must be less than or equal to ${attrValue}`,
  },
  pattern: {
    domKey: "patternMismatch",
    validate: (value: string, attrValue: string): boolean =>
      value.length === 0 || new RegExp(attrValue).test(value),
    errorMessage: () => `Value does not match the expected pattern`,
  },
};

const builtInValidityToAttrMapping: Record<string, ValidationAttribute> =
  Object.entries(builtInValidations).reduce(
    (acc, e) =>
      Object.assign(acc, {
        [e[1].domKey]: e[0],
      }),
    {}
  );

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
  value: unknown
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
const callAll =
  (...fns: (Function | undefined)[]) =>
  (...args: any[]) =>
    fns.forEach((fn) => fn?.(...args));
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
async function validateInput(
  inputEl: HTMLInputElement | null,
  value: string,
  inputValidations: Validations
): Promise<ExtendedValidityState> {
  let validity = getBaseValidityState();
  await Promise.all(
    Object.entries(inputValidations || {}).map(async ([attr, attrValue]) => {
      // FIXME:
      //@ts-ignore
      const builtInValidation: Validator = builtInValidations[attr];
      let isInvalid = false;
      if (builtInValidation) {
        isInvalid = inputEl?.validity
          ? inputEl?.validity[builtInValidation.domKey]
          : !builtInValidation.validate(value, String(attrValue));
      } else {
        let formData = inputEl?.form ? new FormData(inputEl.form) : undefined;
        isInvalid = !(await attrValue(value, formData));
      }
      validity[builtInValidation?.domKey || attr] = isInvalid;
      validity.valid = validity.valid && !isInvalid;
    })
  );
  return validity;
}

// Perform all validations for a submitted form on the server
export async function validateServerFormData<T extends FormValidations>(
  formData: FormData,
  formValidations: T
): Promise<ServerFormInfo<T>> {
  // Echo back submitted form data for input pre-population
  const submittedFormData = Array.from(formData.entries()).reduce(
    (acc, e) => Object.assign(acc, { [e[0]]: e[1] }),
    {}
  );

  const inputs = {} as Record<KeyOfString<T>, InputInfo>;
  let valid = true;
  let entries = Object.entries(formValidations) as Array<
    [KeyOfString<T>, ValueOf<T>]
  >;
  await Promise.all(
    entries.map(async (e) => {
      let name = e[0];
      let inputValidations = e[1];
      const value = formData.get(name);
      if (typeof value === "string") {
        let validity = await validateInput(null, value, inputValidations);
        // Always assume inputs have been modified during SSR validation
        inputs[name] = {
          touched: true,
          dirty: true,
          state: "done",
          validity,
        };
        valid = valid && validity.valid;
      }
    })
  );
  return { submittedFormData, inputs, valid };
}
//#endregion

////////////////////////////////////////////////////////////////////////////////
//#region Contexts + Components + Hooks

export const FormContext =
  React.createContext<FormContextObject<FormValidations> | null>(null);

// Shout out for this nifty little approach!
// https://www.hipsterbrown.com/musings/musing/react-context-with-generics/
export function FormContextProvider<T extends FormValidations>({
  children,
  value,
}: React.PropsWithChildren<{ value: FormContextObject<T> }>) {
  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

export function useFormContext<T extends FormValidations>() {
  const context = React.useContext<FormContextObject<T>>(
    FormContext as unknown as React.Context<FormContextObject<T>>
  );
  invariant(context, "useFormContext must be used under FormContextProvider");
  return context;
}

// Listen/Unlisten for the given event and call at most one time
function useOneTimeListener(
  ref: React.RefObject<HTMLElement>,
  event: string,
  cb: () => void
) {
  let unlisten: (() => void) | null = null;

  let onEvent = React.useCallback(() => {
    cb();
    unlisten?.();
  }, [cb, unlisten]);

  unlisten = React.useCallback<() => void>(() => {
    ref.current?.removeEventListener(event, onEvent);
  }, [event, onEvent, ref]);

  React.useEffect(() => {
    ref.current?.addEventListener(event, onEvent, { once: true });
    return unlisten || (() => {});
  }, [event, onEvent, ref, unlisten]);
}

interface UseValidatedInputOpts<T extends FormValidations> {
  name: KeyOfString<T>;
  formValidations?: T;
  errorMessages?: ErrorMessages;
  serverFormInfo?: ServerFormInfo<T>;
  ref?:
    | React.ForwardedRef<HTMLInputElement | null | undefined>
    | React.Ref<HTMLInputElement | null | undefined>;
}

// Handle validations for a single input
export function useValidatedInput<T extends FormValidations>(
  opts: UseValidatedInputOpts<T>
) {
  let ctx = useFormContext<T>();
  let id = React.useId();
  let name = opts.name;
  let formValidations = opts.formValidations || ctx?.formValidations;
  let errorMessages =
    opts.errorMessages || ctx?.errorMessages
      ? {
          ...ctx?.errorMessages,
          ...opts.errorMessages,
        }
      : undefined;
  // TODO: Can this cast from context be avoided?
  let serverFormInfo =
    opts.serverFormInfo || (ctx?.serverFormInfo as ServerFormInfo<T>);

  invariant(
    formValidations !== undefined,
    "useValidatedInput() must either be used inside a <FormContext.Provider> " +
      "or be passed a formValidations prop"
  );

  let wasSubmitted = serverFormInfo != null;
  let prevServerFormInfo = React.useRef<ServerFormInfo | undefined>(
    serverFormInfo
  );
  let inputRef = React.useRef<HTMLInputElement>(null);
  let userRef = React.useRef<React.RefObject<HTMLInputElement>>(null);
  let composedRef = useComposedRefs(inputRef, userRef.current);
  let [value, setValue] = React.useState("");
  let [dirty, setDirty] = React.useState<boolean>(wasSubmitted);
  let [touched, setTouched] = React.useState<boolean>(wasSubmitted);
  let [validationState, setValidationState] = React.useState<
    InputInfo["state"]
  >(wasSubmitted ? "done" : "idle");
  let [validity, setValidity] = React.useState<
    InputInfo["validity"] | undefined
  >(serverFormInfo?.inputs?.[name]?.validity);
  let controller = React.useRef<AbortController | null>(null);
  let currentErrorMessages: Record<string, string> | undefined;

  if (validity?.valid === false) {
    currentErrorMessages = Object.entries(validity)
      .filter((e) => e[0] !== "valid" && e[1])
      .reduce((acc, [validation, valid]) => {
        let attr = builtInValidityToAttrMapping[validation];
        let message =
          errorMessages?.[validation] || builtInValidations[attr]?.errorMessage;
        if (typeof message === "function") {
          let attrValue = formValidations?.[name]?.[attr];
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

  useOneTimeListener(inputRef, "blur", () => setTouched(true));

  React.useEffect(() => {
    async function go() {
      // If we heard back from the server, consider us validated and mark
      // dirty/touched to show errors
      if (serverFormInfo) {
        setDirty(true);
        setTouched(true);
        setValidationState("done");
        if (serverFormInfo.inputs[name]) {
          setValidity(serverFormInfo.inputs[name].validity);
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
      let inputValidations = formValidations?.[name];
      if (!inputValidations) {
        console.warn(`No validations found for the "${name}" input`);
        setValidationState("done");
        return;
      }
      let localController = new AbortController();
      controller.current = localController;
      setValidationState("validating");
      const validity = await validateInput(
        inputRef.current,
        value,
        inputValidations
      );
      if (localController.signal.aborted) {
        return;
      }
      setValidationState("done");
      setValidity(validity);
    }

    go().catch((e) => console.error("Error in validateInput useEffect", e));
  }, [dirty, touched, value, formValidations, name, serverFormInfo]);

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
    onChange,
    ref,
    ...attrs
  }: React.ComponentProps<"input"> = {}): React.ComponentProps<"input"> {
    let validationAttrs = Object.entries(formValidations?.[name] || {}).reduce(
      (acc, [attr, value]) =>
        attr in builtInValidations
          ? Object.assign(acc, { [attr]: value })
          : acc,
      {}
    );
    if (ref && userRef.current !== ref) {
      assignRef(userRef, ref);
    }
    let inputAttrs = {
      ref: composedRef,
      name,
      id: getInputId(name, id),
      className: getClasses("input", attrs.className),
      defaultValue: serverFormInfo?.submittedFormData?.lastName,
      onChange: callAll(onChange, (e: React.ChangeEvent<HTMLInputElement>) => {
        setDirty(true);
        setValue(e.target.value);
      }),
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
      defaultValue: serverFormInfo?.submittedFormData?.radioThing,
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

export interface FieldProps<T extends FormValidations>
  extends UseValidatedInputOpts<T>,
    Omit<React.ComponentPropsWithoutRef<"input">, "name"> {
  label: string;
}

// Syntactic sugar component to handle <label>/<input> and error displays
export function Field<T extends FormValidations>({
  name,
  formValidations,
  errorMessages,
  serverFormInfo,
  label,
  ...inputAttrs
}: FieldProps<T>) {
  let ctx = useFormContext<T>();
  formValidations = formValidations || ctx?.formValidations;
  serverFormInfo = serverFormInfo || ctx?.serverFormInfo;
  errorMessages = errorMessages || ctx?.errorMessages;
  invariant(
    formValidations,
    `No form validations found for <Field name="${name}">`
  );

  let { info, getInputAttrs, getLabelAttrs, getErrorsAttrs } =
    useValidatedInput({ name, formValidations, errorMessages, serverFormInfo });

  function ValidationDisplay() {
    let showErrors = serverFormInfo != null || info.touched;
    if (!showErrors || info.state === "idle") {
      return null;
    }
    if (info.state === "validating") {
      return <p className="rvs-validating">Validating...</p>;
    }
    if (info.validity?.valid) {
      return null;
    }
    return <Errors {...getErrorsAttrs()} messages={info.errorMessages} />;
  }

  return (
    <>
      <label {...getLabelAttrs()}>
        {label}
        {formValidations[name].required ? "*" : null}
      </label>
      <input
        {...getInputAttrs({
          defaultValue: serverFormInfo?.submittedFormData?.[name],
          ...omit(inputAttrs, "ref"),
        })}
      />

      {/* Display validation state */}
      <ValidationDisplay />
    </>
  );
}

export interface ErrorProps {
  id?: string;
  messages?: ErrorMessages;
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
