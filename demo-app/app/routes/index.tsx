import * as React from "react";
import type { ActionFunction } from "@remix-run/server-runtime";
import { json, redirect } from "@remix-run/server-runtime";
import { Form, useActionData } from "@remix-run/react";
import type {
  ErrorMessages,
  FormValidations,
  ServerFormInfo,
} from "remix-validity-state";
import {
  FormContext,
  Field,
  validateServerFormData,
} from "remix-validity-state";

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
    maxLength: 20,
    pattern: "^[a-zA-Z]+$",
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
  tooShort: (attrValue, name, value) =>
    `The ${name} field must be at least ${attrValue} characters long, but you have only entered ${value.length} characters`,
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

export default function Index() {
  let actionData = useActionData<ActionData>();
  let formRef = React.useRef<HTMLFormElement>(null);

  // Use built-in browser validation prior to JS loading, then switch
  React.useEffect(() => {
    formRef.current?.setAttribute("novalidate", "novalidate");
  }, []);

  return (
    <div>
      <FormContext.Provider
        value={{
          formValidations,
          errorMessages: customErrorMessages,
          serverFormInfo: actionData?.serverFormInfo,
        }}
      >
        <Form method="post" autoComplete="off" ref={formRef}>
          <Field name="firstName" label="First Name" />
          <br />
          <Field name="middleInitial" label="Middle Initial" />
          <br />
          <Field name="lastName" label="Last Name" />
          <br />
          <button type="submit">Submit</button>
        </Form>
      </FormContext.Provider>
    </div>
  );
}
