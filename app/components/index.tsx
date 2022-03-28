import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ActionFunction, Form, json, LoaderFunction, redirect } from "remix";

////////////////////////////////////////////////////////////////////////////////
//#region Types

export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

interface InputValidations {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

interface CustomValidateFunction {
  (val: string, attrValue?: string): boolean;
}

interface CustomValidationDefinition {
  validate: CustomValidateFunction;
  attrValue: any;
}

type CustomValidation = CustomValidateFunction | CustomValidationDefinition;

/**
 * An HTML validation attribute that can be placed on an input
 */
export type ValidationAttribute = keyof InputValidations;

interface InternalValidityState {
  badInput: boolean;
  customError: boolean;
  rangeOverflow: boolean;
  rangeUnderflow: boolean;
  patternMismatch: boolean;
  stepMismatch: boolean;
  tooLong: boolean;
  tooShort: boolean;
  typeMismatch: boolean;
  valueMissing: boolean;
  valid: boolean;
}

/**
 * The DOM ValidityState key representing a validation error
 */
export type ValidityStateKey = keyof InternalValidityState;

/**
 * Map of inputName -> HTML validations for the input
 */
export type FormValidations = Record<string, InputValidations>;
export type CustomValidations = Record<
  string,
  Record<string, CustomValidation>
>;

interface InputValidationResult {
  validityState: InternalValidityState;
  customValidityState?: Record<string, boolean>;
}

/**
 * Form level InputInfo
 */
export type FormInfo = Record<string, InputInfo>;

// ValidityState key -> UI message to display
export type ErrorMessages = Record<ValidityStateKey, string>;

export interface InputInfo {
  touched: boolean;
  dirty: boolean;
  validityState: ValidityState;
  customValidityState?: Record<string, boolean>;
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

type Validators = Record<ValidationAttribute, Validator>;

interface FormContextObject {
  formValidations: FormValidations;
  customValidations?: CustomValidations;
  serverFormInfo?: ServerFormInfo;
  requiredNotation?: string;
  debug?: boolean;
}
//#endregion

////////////////////////////////////////////////////////////////////////////////
//#region Constants + Utils

// Browser built-in validations
const builtInValidations: Validators = {
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

export function getBaseValidityState(): InternalValidityState {
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
function validateInput(
  inputEl: HTMLInputElement | null,
  value: string,
  inputValidations: InputValidations,
  customValidations?: Record<string, CustomValidation>
): InputValidationResult {
  const validityState = getBaseValidityState();
  Object.entries(inputValidations).forEach(([attr, attrValue]) => {
    const { domKey, validate } =
      builtInValidations[attr as ValidationAttribute];
    let isInvalid =
      inputEl?.validity?.[domKey] ?? !validate(value, String(attrValue));
    validityState[domKey] = isInvalid;
    validityState.valid = validityState.valid && !isInvalid;
  });

  if (!customValidations) {
    return { validityState };
  }

  let customValidityState: Record<string, boolean> = {};
  Object.entries(customValidations).forEach(([validationName, validation]) => {
    let isInvalid =
      typeof validation === "function"
        ? !validation(value)
        : !validation.validate(value, validation.attrValue);
    customValidityState[validationName] = isInvalid;
    validityState.valid = validityState.valid && !isInvalid;
  });

  return {
    validityState,
    customValidityState,
  };
}

// Perform all specified custom validations for a single input
export function validateServerFormData(
  formData: FormData,
  formValidations: FormValidations,
  customValidations?: CustomValidations
): ServerFormInfo {
  // Echo back submitted form data for input pre-population
  const submittedFormData = Array.from(formData.entries()).reduce(
    (acc, e) => Object.assign(acc, { [e[0]]: e[1] }),
    {}
  );
  const inputs: Record<string, InputInfo> = {};
  let valid = true;
  Object.entries(formValidations).forEach(([name, inputValidations]) => {
    const value = formData.get(name);
    if (typeof value === "string") {
      let { validityState, customValidityState } = validateInput(
        null,
        value,
        inputValidations,
        customValidations?.[name]
      );
      // Always assume inputs have been modified during SSR validation
      inputs[name] = { touched: true, dirty: true, validityState };
      valid =
        valid &&
        validityState.valid &&
        (!customValidityState ||
          !Object.values(customValidityState).some(Boolean));
    }
  });
  return { submittedFormData, inputs, valid };
}
//#endregion

////////////////////////////////////////////////////////////////////////////////
//#region Components

export interface InputProps extends React.ComponentPropsWithoutRef<"input"> {
  initialValue: string | undefined;
  customValidations?: Record<string, CustomValidation>;
  onUpdate?: (info: InputInfo) => void;
}

// Wrapper around <input> to handle syncing with ValidityState
// TODO: add forwardRef
export function Input(props: InputProps) {
  const { onUpdate, initialValue, customValidations, ...inputAttrs } = props;
  const validationAttrs = Object.entries(inputAttrs)
    .filter(([attr]) => attr in builtInValidations)
    .reduce(
      (acc, [attr, attrValue]) => Object.assign(acc, { [attr]: attrValue }),
      {}
    );
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue || "");

  const [dirty, setDirty] = useState(false);
  const [touched, setTouched] = useState(false);

  let setTouchedWrapper = () => {
    setTouched(true);
    inputRef.current?.removeEventListener("blur", setTouchedWrapper);
  };
  useEffect(() => {
    inputRef.current?.addEventListener("blur", setTouchedWrapper);
    return () =>
      inputRef.current?.removeEventListener("blur", setTouchedWrapper);
  }, []);

  useEffect(() => {
    const { validityState, customValidityState } = validateInput(
      inputRef.current,
      value,
      validationAttrs,
      props.customValidations
    );
    onUpdate?.({ touched, dirty, validityState, customValidityState });
  }, [value, inputRef, touched, dirty]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => {
        setDirty(true);
        setValue(e.target.value);
      }}
      {...inputAttrs}
    />
  );
}

export interface ErrorProps {
  validityState: InternalValidityState;
  messages?: ErrorMessages;
}

// Display errors for a given input
export function Errors({ validityState, messages }: ErrorProps) {
  const errorMessages: ErrorMessages =
    messages ||
    ({
      valueMissing: "Field is required",
      tooShort: "Value must be at least N characters",
      tooLong: "Value must be at least N characters",
      rangeUnderflow: "Value must be at least N",
      rangeOverflow: "Value must be at most N",
      patternMismatch: "Value does not match the required pattern",
    } as ErrorMessages);
  return (
    <ul style={{ color: "red" }}>
      {Object.entries(validityState)
        .filter((e) => e[0] !== "valid" && e[1])
        .map(([validation]) => (
          <li key={validation}>
            {validation}: {errorMessages[validation as ValidityStateKey]}
          </li>
        ))}
    </ul>
  );
}

export interface FieldProps {
  name: string;
  label: string;
  debug?: boolean;
  onUpdate?: (info: InputInfo) => void;
}

// Syntactic sugar component to handle <label>/<input> and error displays
export function Field(props: FieldProps) {
  let ctx = useContext(FormContext);
  invariant(ctx, "<Field> must be used inside a <FormContext.Provider>");

  // Use the errors returned from the action if they exist
  let wasSubmitted = ctx.serverFormInfo != null;
  const [info, setInfo] = useState<InputInfo>({
    // Assume touched/dirty if this is after a form submission
    touched: wasSubmitted,
    dirty: wasSubmitted,
    validityState: ctx.serverFormInfo?.inputs?.[props.name]
      ?.validityState as InternalValidityState,
    customValidityState:
      ctx.serverFormInfo?.inputs?.[props.name].customValidityState,
  });

  useEffect(() => {
    props.onUpdate?.(info);
  }, [info]);

  return (
    <div>
      <label htmlFor={props.name}>
        {props.label}
        {ctx.requiredNotation && ctx.formValidations[props.name].required
          ? ctx.requiredNotation
          : null}
      </label>
      <br />
      <Input
        id={props.name}
        name={props.name}
        initialValue={ctx.serverFormInfo?.submittedFormData?.[props.name]}
        customValidations={ctx.customValidations?.[props.name]}
        onUpdate={setInfo}
        {...ctx.formValidations[props.name]}
      />
      {(wasSubmitted || info.touched) && !info.validityState.valid && (
        <Errors validityState={info.validityState} />
      )}

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
