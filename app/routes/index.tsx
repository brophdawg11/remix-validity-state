import * as React from "react";
import { ActionFunction, Form, json, redirect, useActionData } from "remix";

import type {
  CustomValidations,
  ErrorMessages,
  FormValidations,
  ServerFormInfo,
} from "~/remix-enhanced-forms";
import {
  FormContext,
  Field,
  validateServerFormData,
} from "~/remix-enhanced-forms";

type ActionData = {
  serverFormInfo: ServerFormInfo;
};

// Raw HTML validation attributes, to be spread directly onto <input>
// Specified in an object here so they can be leveraged for server-side validation
const formValidations: FormValidations = {
  firstName: {
    required: true,
  },
  middleInitial: {
    pattern: "^[a-zA-Z]{1}$",
  },
  lastName: {
    required: true,
    minLength: 5,
  },
};

// TODO: Inline with the above and use types detection?
//  - Reserved attrs are built-in
//  - Functions are automatically custom
//  - Disambiguate string for fetcher?
const customValidations: CustomValidations = {
  firstName: {
    mustBeMatt(value) {
      return value.toLowerCase() === "matt";
    },
  },
  lastName: {
    async mustBeBrophy(value) {
      await new Promise((r) => setTimeout(r, 1000));
      return value.toLowerCase() === "brophy";
    },
  },
  /**
   * TODO: Async validation notes
   *  - potentially make an array to control order of validations
   *  - In Remix - async validations can be driven by useFetcher
   *    - Expose fetcher transition on InputInfo
   *    - Expose an aggregate "transition" on FormInfo
   *    - validate: (value, attrValue): Promise<boolean>
   *      validate: '.',             // Validate using a fetcher against the current route
   *      validate: 'path/to/route', //  validate using a fetcher against another route
   *      validate: 'https://...',   // validate using a fetcher against an external service?
   *    - Provide some form of utility for easy single-field validation in your action
   *    - In React Router
   *       - Might not be a fetcher - just an async function - so use RR equivalent
   *         of useFetcher - useAsyncThing or whatever
   */
};

const errorMessages: ErrorMessages = {
  valueMissing: "Hey, yo, this field is required!",
  mustBeMatt: "This field must have a value of 'matt'",
  mustBeBrophy: "This field must have a value of 'brophy'",
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  // Validate server-side using the same validations specified in the <input>
  const serverFormInfo = await validateServerFormData(
    formData,
    formValidations,
    customValidations
  );
  if (!serverFormInfo.valid) {
    return json<ActionData>({ serverFormInfo });
  }
  return redirect("/");
};

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
          customValidations,
          errorMessages,
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
          <Field name="firstName" label="First Name" />

          <Field name="middleInitial" label="Middle Initial" />

          <Field name="lastName" label="Last Name" />

          <div>
            <button type="submit">Submit</button>
          </div>
        </Form>
      </FormContext.Provider>
    </div>
  );
}
