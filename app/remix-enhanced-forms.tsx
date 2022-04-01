import { createContext, useContext, useEffect, useRef, useState } from "react";

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

interface Validator {
  domKey: ValidityStateKey;
  validate(value: string, attrValue: string): boolean;
}

interface FormContextObject {
  formValidations: FormValidations;
  errorMessages?: ErrorMessages;
  serverFormInfo?: ServerFormInfo;
  requiredNotation?: string;
  debug?: boolean;
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

export const FormContext = createContext<FormContextObject | null>(null);

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
    Object.entries(inputValidations).map(async (e) => {
      let attr = e[0];
      let attrValue = e[1];
      // FIXME:
      //@ts-ignore
      const builtInValidation: Validator = builtInValidations[attr];
      let isInvalid = false;
      if (builtInValidation) {
        isInvalid = inputEl?.validity
          ? inputEl?.validity[builtInValidation.domKey]
          : !builtInValidation.validate(value, String(attrValue));
      } else if (typeof attrValue === "function") {
        isInvalid = !(await attrValue(value));
      } else {
        console.error(`No validation completed for ${attr}`);
      }
      validity[builtInValidation?.domKey || attr] = isInvalid;
      validity.valid = validity.valid && !isInvalid;
    })
  );
  return validity;
}

// Perform all specified custom validations for a single input
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

function useOneTimeListener(
  ref: React.RefObject<HTMLElement>,
  event: string,
  cb: () => void
) {
  function onEvent() {
    cb();
    unlisten();
  }
  function unlisten() {
    ref.current?.removeEventListener(event, onEvent);
  }
  useEffect(() => {
    ref.current?.addEventListener(event, onEvent, { once: true });
    return unlisten;
  }, [ref]);
}

let callAll =
  (...fns: (Function | undefined)[]) =>
  (...args: any[]) =>
    fns.forEach((fn) => fn?.(...args));

export function useValidatedInput({
  name,
  formValidations,
  serverFormInfo,
}: {
  name: string;
  formValidations: FormValidations;
  serverFormInfo?: ServerFormInfo;
}) {
  let wasSubmitted = serverFormInfo != null;
  let inputRef = useRef<HTMLInputElement>(null);
  let [value, setValue] = useState("");
  let [dirty, setDirty] = useState<boolean>(wasSubmitted);
  let [touched, setTouched] = useState<boolean>(wasSubmitted);
  let [validationState, setValidationState] = useState<InputInfo["state"]>(
    wasSubmitted ? "done" : "idle"
  );
  let [validity, setValidity] = useState<InputInfo["validity"] | undefined>(
    serverFormInfo?.inputs?.[name]?.validity
  );
  let controller = useRef<AbortController | null>(null);

  useOneTimeListener(inputRef, "blur", () => setTouched(true));

  //FIXME: Still have a small flicker with this dual effect approach

  // Trigger validation from value changes
  useEffect(() => {
    // If we heard back from the server, consider us validated and mark
    // dirty/touched to show errors
    if (serverFormInfo) {
      setDirty(true);
      setTouched(true);
      setValidationState("done");
      setValidity(serverFormInfo.inputs[name].validity);
    }
  }, [serverFormInfo]);

  // Trigger validation from value changes
  useEffect(() => {
    if (dirty || touched) {
      // Otherwise start validation if we're dirty/touched
      setValidationState("validating");
    }
  }, [value, dirty, touched]);

  useEffect(() => {
    async function go() {
      if (validationState !== "validating") {
        return;
      }
      if (controller.current) {
        controller.current.abort();
      }
      let localController = new AbortController();
      controller.current = localController;
      console.log("calling validateInpout", name);
      const validity = await validateInput(
        inputRef.current,
        value,
        formValidations[name]
      );
      console.log("done calling validateInpout", name);
      if (localController.signal.aborted) {
        return;
      }
      setValidationState("done");
      setValidity(validity);
    }
    go().catch((e) =>
      console.error("Caught error in validateInput useEffect", e)
    );
  }, [value, validationState, inputRef.current]);

  function getInputAttrs({
    onChange,
    ...attrs
  }: React.ComponentPropsWithoutRef<"input"> = {}) {
    let validationAttrs = Object.entries(formValidations[name]).reduce(
      (acc, [attr, value]) =>
        attr in builtInValidations
          ? Object.assign(acc, { [attr]: value })
          : acc,
      {}
    );
    return {
      ref: inputRef,
      name,
      "aria-invalid": validity?.valid === false,
      // TODO: aria-described-by?
      onChange: callAll(onChange, (e: React.ChangeEvent<HTMLInputElement>) => {
        setDirty(true);
        setValue(e.target.value);
      }),
      ...validationAttrs,
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
  };
}

export interface InputProps extends React.ComponentPropsWithoutRef<"input"> {
  name: string;
  formValidations: FormValidations;
}

// Wrapper around <input> to handle syncing with ValidityState
// TODO: add forwardRef
function Input({ name, formValidations, ...attrs }: InputProps) {
  let { getInputAttrs } = useValidatedInput({
    name,
    formValidations,
  });
  return <input {...getInputAttrs(attrs)} />;
}

export interface ErrorProps {
  validity: InputInfo["validity"];
  messages?: ErrorMessages;
}

// Display errors for a given input
export function Errors({ validity, messages }: ErrorProps) {
  const errorMessages: ErrorMessages = {
    valueMissing: "Field is required",
    tooShort: "Value must be at least N characters",
    tooLong: "Value must be at least N characters",
    rangeUnderflow: "Value must be at least N",
    rangeOverflow: "Value must be at most N",
    patternMismatch: "Value does not match the required pattern",
    ...messages,
  };
  return (
    <ul style={{ color: "red" }}>
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
  debug?: boolean;
}

// Syntactic sugar component to handle <label>/<input> and error displays
export function Field(props: FieldProps) {
  let ctx = useContext(FormContext);
  invariant(ctx, "<Field> must be used inside a <FormContext.Provider>");

  let { info, getInputAttrs } = useValidatedInput({
    name: props.name,
    formValidations: ctx.formValidations,
    serverFormInfo: ctx.serverFormInfo,
  });

  let validationDisplay = {
    idle: null,
    validating: <p>Validating...</p>,
    done: info.validity?.valid ? (
      <p>✅</p>
    ) : (
      <Errors messages={ctx.errorMessages} validity={info.validity} />
    ),
  };
  return (
    <div>
      <label htmlFor={props.name}>
        {props.label}
        {ctx.requiredNotation && ctx.formValidations[props.name].required
          ? ctx.requiredNotation
          : null}
      </label>
      <br />
      <input
        {...getInputAttrs({
          defaultValue: ctx.serverFormInfo?.submittedFormData?.[props.name],
        })}
      />

      {/* Display validation state */}
      {(ctx.serverFormInfo != null || info.touched) &&
        validationDisplay[info.state]}

      {ctx?.debug && (
        <Debug
          name={props.name}
          info={info}
          formValidations={ctx.formValidations}
          serverFormInfo={ctx.serverFormInfo}
        />
      )}
    </div>
  );
}

interface DebugProps {
  name: string;
  info: InputInfo;
  formValidations: FormValidations;
  serverFormInfo?: ServerFormInfo;
}

// Useful for debugging :)
export function Debug({
  name,
  info,
  formValidations,
  serverFormInfo,
}: DebugProps) {
  return (
    <div style={{ paddingTop: "1rem" }}>
      <pre style={{ margin: 0, fontWeight: "bold" }}>Input Validations:</pre>
      <pre style={{ margin: 0 }}>
        {JSON.stringify(formValidations[name], null, 2)}
      </pre>
      <pre style={{ margin: 0, fontWeight: "bold" }}>Input Info:</pre>
      <pre style={{ margin: 0 }}>{JSON.stringify(info, null, 2)}</pre>
      <br />
      <pre style={{ margin: 0, fontWeight: "bold" }}>
        Server Form/Input Info:
      </pre>
      <pre style={{ margin: 0 }}>
        {JSON.stringify(
          {
            valid: serverFormInfo?.valid,
            submittedFormData: serverFormInfo?.submittedFormData,
            [`inputs.${name}`]: serverFormInfo?.inputs[name],
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}
//#endregion
