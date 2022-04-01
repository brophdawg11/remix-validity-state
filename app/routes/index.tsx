import * as React from "react";
import { ActionFunction, Form, json, redirect, useActionData } from "remix";

import type { FormValidations, ServerFormInfo } from "~/remix-enhanced-forms";
import {
  Debug,
  ErrorMessages,
  FormContext,
  Field,
  useValidatedInput,
  validateServerFormData,
} from "~/remix-enhanced-forms";

type ActionData = {
  serverFormInfo: ServerFormInfo;
};

// Validations for our entire form, composed of raw HTML validation attributes
// to be spread directly onto <input>, as well as custo validations that will
// run both client and server side.
// Specified in an object here so they can be leveraged for server-side validation
const formValidations: FormValidations = {
  firstName: {
    // Standard HTML validations have primitives as their value
    required: true,
    maxLength: 15,
    // Custom validations provide functions to validate.  Can be sync or async
    // and must return a boolean
    mustBeMatt(value) {
      return !value || value.toLowerCase() === "matt";
    },
  },
  middleInitial: {
    pattern: "^[a-zA-Z]{1}$",
  },
  lastName: {
    required: true,
    minLength: 5,
    // Custom validations can also be async
    // TODO: In remix it would be nice to add some syntactic sugar to directly
    // use a fetcher to validate against an action.  And expose the fetcher
    // state as the validation state.  Also consider aggregating all validation
    // states up to the form level to know if the form overall is idle or validating.
    async mustBeBrophy(value) {
      await new Promise((r) => setTimeout(r, 1000));
      return !value || value.toLowerCase() === "brophy";
    },
  },
};

const customErrorMessages: ErrorMessages = {
  valueMissing: "Hey, yo, this field is required!",
  mustBeMatt: "This field must have a value of 'matt'",
  mustBeBrophy: "This field must have a value of 'brophy'",
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  // Validate server-side using the same validations specified in the <input>
  // TODO: Can we expose form-level `valid` field somewhere in client?
  // We currently only get it back from the server on serverFormInfo.valid.  At
  // the moment, client side the <form> doesn't really know about any of it's
  // descendant inputs.  Maybe we can do a pub/sub through context?
  const serverFormInfo = await validateServerFormData(
    formData,
    formValidations
  );
  if (!serverFormInfo.valid) {
    return json<ActionData>({ serverFormInfo });
  }
  return redirect("/");
};

interface LastNameInputProps {
  serverFormInfo?: ServerFormInfo;
  debug?: boolean;
}

export function LastNameInput({ serverFormInfo, debug }: LastNameInputProps) {
  let { info, getInputAttrs } = useValidatedInput({
    name: "lastName",
    formValidations: formValidations,
    serverFormInfo,
  });

  return (
    <div>
      {/* TODO: add getLabelAttrs to useValidatedInput */}
      <label htmlFor={"lastName"}>Last Name*</label>
      <br />
      <input
        {...getInputAttrs({
          defaultValue: serverFormInfo?.submittedFormData?.lastName,
        })}
      />

      {/* Display validation state */}
      {/* TODO: add getErrorAttrs to useValidatedInput */}
      {info.touched &&
        (info.state === "validating" ? (
          <p>Validating...</p>
        ) : info.validity?.valid ? (
          <p>✅</p>
        ) : !info.validity?.valid ? (
          <p>Something's wrong, but I ain't gonna tell ya what!</p>
        ) : null)}

      {debug && (
        <Debug
          name="lastName"
          info={info}
          formValidations={formValidations}
          serverFormInfo={serverFormInfo}
        />
      )}
    </div>
  );
}

export default function Index() {
  let actionData = useActionData<ActionData>();
  let formRef = React.useRef<HTMLFormElement>(null);
  let [debug, setDebug] = React.useState(true);

  // Use built-in browser validation prior to JS loading, then switch
  React.useEffect(() => {
    formRef.current?.setAttribute("novalidate", "novalidate");
  }, []);

  return (
    <div>
      <label style={{ float: "right" }}>
        <input
          type="checkbox"
          value="true"
          checked={debug}
          onChange={(e) => setDebug(e.currentTarget.checked)}
        />
        Enable Debug?
      </label>

      {/* Provide form-level validation info and server response */}
      <FormContext.Provider
        value={{
          formValidations,
          errorMessages: customErrorMessages,
          requiredNotation: "*",
          serverFormInfo: actionData?.serverFormInfo,
          debug,
        }}
      >
        <Form
          method="post"
          autoComplete="off"
          ref={formRef}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          {/* Least UI control */}
          <Field name="firstName" label="First Name" />

          <Field name="middleInitial" label="Middle Initial" />

          {/* Most UI control - see above */}
          <LastNameInput
            serverFormInfo={actionData?.serverFormInfo}
            debug={debug}
          />

          <div>
            <button type="submit">Submit</button>
          </div>
        </Form>
      </FormContext.Provider>
    </div>
  );
}
