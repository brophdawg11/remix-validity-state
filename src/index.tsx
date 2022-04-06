import * as React from "react";

////////////////////////////////////////////////////////////////////////////////
//#region Types

export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Validation attributes built-in to the browser
 */
interface InputValidations {
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
  | "required"
  | "minLength"
  | "maxLength"
  | "min"
  | "max"
  | "pattern";

/**
 * Custom validation function
 */
interface CustomValidation {
  (val: string, attrValue?: string): boolean | Promise<boolean>;
}

/**
 * Union type for both built-in and custom validations
 */
type Validations =
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
type ExtendedValidityState = MutableValidityState & Record<string, boolean>;

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
export type ErrorMessages = Record<string, string>;

export interface InputInfo {
  touched: boolean;
  dirty: boolean;
  state: "idle" | "validating" | "done";
  validity?: ExtendedValidityState;
}

// Server-side only (currently) - validate all specified inputs in the formData
export type ServerFormInfo = {
  submittedFormData: Record<string, string>;
  inputs: FormInfo;
  valid: boolean;
};

/**
 * Validator to link HTML attribute to ValidityState key as well as provide an
 * implementation for server side validation
 */
interface Validator {
  domKey: ValidityStateKey;
  validate(value: string, attrValue: string): boolean;
}

interface FormContextObject {
  formValidations: FormValidations;
  errorMessages?: ErrorMessages;
  serverFormInfo?: ServerFormInfo;
  requiredNotation?: string;
}
//#endregion

////////////////////////////////////////////////////////////////////////////////
//#region Constants + Utils

// Browser built-in validations
const builtInValidations: Record<ValidationAttribute, Validator> = {
  required: {
    domKey: "valueMissing",
    validate: (value: string, attrValue: string): boolean => value.length > 0,
  },
  minLength: {
    domKey: "tooShort",
    validate: (value: string, attrValue: string): boolean =>
      value.length === 0 || value.length >= Number(attrValue),
  },
  maxLength: {
    domKey: "tooLong",
    validate: (value: string, attrValue: string): boolean =>
      value.length === 0 || value.length <= Number(attrValue),
  },
  min: {
    domKey: "rangeUnderflow",
    validate: (value: string, attrValue: string): boolean =>
      value.length === 0 || Number(value) < Number(attrValue),
  },
  max: {
    domKey: "rangeOverflow",
    validate: (value: string, attrValue: string): boolean =>
      value.length === 0 || Number(value) > Number(attrValue),
  },
  pattern: {
    domKey: "patternMismatch",
    validate: (value: string, attrValue: string): boolean =>
      value.length === 0 || new RegExp(attrValue).test(value),
  },
};

export const FormContext = React.createContext<FormContextObject | null>(null);

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

const getInputId = (name: string) => name;
const getErrorsId = (name: string) => getInputId(name) + "-errors";
const callAll =
  (...fns: (Function | undefined)[]) =>
  (...args: any[]) =>
    fns.forEach((fn) => fn?.(...args));

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
        isInvalid = !(await attrValue(value));
      }
      validity[builtInValidation?.domKey || attr] = isInvalid;
      validity.valid = validity.valid && !isInvalid;
    })
  );
  return validity;
}

// Perform all validations for a submitted form on the server
export async function validateServerFormData(
  formData: FormData,
  formValidations: FormValidations
): Promise<ServerFormInfo> {
  // Echo back submitted form data for input pre-population
  const submittedFormData = Array.from(formData.entries()).reduce(
    (acc, e) => Object.assign(acc, { [e[0]]: e[1] }),
    {}
  );
  const inputs: Record<string, InputInfo> = {};
  let valid = true;
  await Promise.all(
    Object.entries(formValidations).map(async ([name, inputValidations]) => {
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
//#region Components + Hooks

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

// Handle validations for a single input
export function useValidatedInput({
  name,
  formValidations: formValidationsProp,
  serverFormInfo: serverFormInfoProp,
}: {
  name: string;
  formValidations?: FormValidations;
  serverFormInfo?: ServerFormInfo;
}) {
  let ctx = React.useContext(FormContext);
  let formValidations = formValidationsProp || ctx?.formValidations;
  let serverFormInfo = serverFormInfoProp || ctx?.serverFormInfo;

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
  let showErrors = validity?.valid === false && touched;

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

  // Provide the caller a prop getter to be spread onto the <input>
  function getInputAttrs({
    onChange,
    ...attrs
  }: React.ComponentPropsWithoutRef<"input"> = {}) {
    let validationAttrs = Object.entries(formValidations?.[name] || {}).reduce(
      (acc, [attr, value]) =>
        attr in builtInValidations
          ? Object.assign(acc, { [attr]: value })
          : acc,
      {}
    );
    let inputAttrs = {
      ref: inputRef,
      name,
      id: getInputId(name),
      defaultValue: serverFormInfo?.submittedFormData?.lastName,
      onChange: callAll(onChange, (e: React.ChangeEvent<HTMLInputElement>) => {
        setDirty(true);
        setValue(e.target.value);
      }),
      ...(showErrors
        ? {
            "aria-invalid": true,
            "aria-errormessage": getErrorsId(attrs.name || name),
          }
        : {}),
      ...validationAttrs,
      ...attrs,
    };

    return inputAttrs;
  }

  // Provide the caller a prop getter to be spread onto the <label>
  function getLabelAttrs({
    ...attrs
  }: React.ComponentPropsWithoutRef<"label"> = {}): React.ComponentPropsWithoutRef<"label"> {
    return {
      htmlFor: getInputId(name),
      defaultValue: serverFormInfo?.submittedFormData?.radioThing,
      ...attrs,
    };
  }

  // Provide the caller a prop getter to be spread onto the element containing
  // their rendered validation errors
  function getErrorsAttrs({
    ...attrs
  }: React.ComponentPropsWithoutRef<"div"> = {}): React.ComponentPropsWithoutRef<"div"> {
    return {
      id: getErrorsId(name),
      ...(showErrors ? { role: "alert" } : {}),
      ...attrs,
    };
  }

  return {
    info: {
      dirty,
      touched,
      state: validationState,
      validity,
    } as InputInfo,
    controller,
    getInputAttrs,
    getLabelAttrs,
    getErrorsAttrs,
  };
}

export interface ErrorProps {
  id?: string;
  validity: InputInfo["validity"];
  messages?: ErrorMessages;
}

// Display errors for a given input
export function Errors({ id, validity, messages }: ErrorProps) {
  //TODO: Support for interpolating the attribute value into the error message
  const errorMessages: ErrorMessages = {
    valueMissing: "Field is required",
    tooShort: "Value is too short",
    tooLong: "Value is too long",
    rangeUnderflow: "Value is too small",
    rangeOverflow: "Value is too large",
    patternMismatch: "Value does not match the required pattern",
    ...messages,
  };
  return (
    <ul id={id} role="alert" style={{ color: "red" }}>
      {Object.entries(validity || {})
        .filter((e) => e[0] !== "valid" && e[1])
        .map(([validation]) => (
          <li key={validation}>🆘 {errorMessages[validation]}</li>
        ))}
    </ul>
  );
}

export interface FieldProps {
  name: string;
  label: string;
}

// Syntactic sugar component to handle <label>/<input> and error displays
export function Field({ name, label }: FieldProps) {
  let ctx = React.useContext(FormContext);
  invariant(ctx, "<Field> must be used inside a <FormContext.Provider>");

  let { info, getInputAttrs, getLabelAttrs, getErrorsAttrs } =
    useValidatedInput({ name });

  function getValidationDisplay() {
    if (info.state === "idle") {
      return null;
    }
    if (info.state === "validating") {
      return <p>Validating...</p>;
    }
    if (info.validity?.valid) {
      return <p>✅</p>;
    }
    return (
      <Errors
        {...getErrorsAttrs({})}
        messages={ctx?.errorMessages}
        validity={info.validity}
      />
    );
  }

  return (
    <div>
      <label {...getLabelAttrs({ "data-custom-thing": "2" })}>
        {label}
        {ctx.formValidations[name].required ? "*" : null}
      </label>
      <br />
      <input
        {...getInputAttrs({
          defaultValue: ctx.serverFormInfo?.submittedFormData?.[name],
        })}
      />

      {/* Display validation state */}
      {(ctx.serverFormInfo != null || info.touched) && getValidationDisplay()}
    </div>
  );
}
//#endregion
