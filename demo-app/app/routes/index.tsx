import { Form, useActionData } from "@remix-run/react";
import type { ActionFunction } from "@remix-run/server-runtime";
import { json, redirect } from "@remix-run/server-runtime";
import * as React from "react";
import type {
  ErrorMessage,
  InputDefinition,
  ServerFormInfo,
} from "remix-validity-state";
import {
  Field,
  FormContextProvider,
  useValidatedInput,
  validateServerFormData,
} from "remix-validity-state";

interface FormSchema {
  inputs: {
    firstName: InputDefinition;
    middleInitial: InputDefinition;
    lastName: InputDefinition;
    emailAddress: InputDefinition;
    hobby: InputDefinition;
  };
  errorMessages: {
    tooShort: ErrorMessage;
  };
}

let formDefinition: FormSchema = {
  inputs: {
    firstName: {
      validationAttrs: {
        required: true,
        minLength: 5,
        pattern: "^[a-zA-Z]+$",
      },
    },
    middleInitial: {
      validationAttrs: {
        pattern: "^[a-zA-Z]{1}$",
      },
    },
    lastName: {
      validationAttrs: {
        required: true,
        minLength: 5,
        pattern: "^[a-zA-Z]+$",
      },
    },
    emailAddress: {
      validationAttrs: {
        type: "email",
        required: true,
      },
      customValidations: {
        async uniqueEmail(value) {
          await new Promise((r) => setTimeout(r, 1000));
          return value !== "john@doe.com" && value !== "jane@doe.com";
        },
      },
      errorMessages: {
        uniqueEmail(attrValue, name, value) {
          return `The email address "${value}" is already in use!`;
        },
      },
    },
    hobby: {
      validationAttrs: {
        required: true,
      },
    },
  },
  errorMessages: {
    tooShort: (attrValue, name, value) =>
      `The ${name} field must be at least ${attrValue} characters long, but you have only entered ${value.length} characters`,
  },
};

type ActionData = {
  serverFormInfo: ServerFormInfo<typeof formDefinition>;
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  // Validate server-side using the same validations specified in the <input>
  // TODO: Can we expose form-level `valid` field somewhere in client?
  // We currently only get it back from the server on serverFormInfo.valid.  At
  // the moment, client side the <form> doesn't really know about any of it's
  // descendant inputs.  Maybe we can do a pub/sub through context?
  const serverFormInfo = await validateServerFormData(formData, formDefinition);

  if (!serverFormInfo.valid) {
    return json<ActionData>({ serverFormInfo });
  }
  return redirect("/");
};

// This is a more complex example of skipping <Field/> in favor of manual
// DOM construction
function EmailAddress() {
  let { info, getInputAttrs, getLabelAttrs, getErrorsAttrs } =
    useValidatedInput<typeof formDefinition>({ name: "emailAddress" });
  return (
    <div>
      <label {...getLabelAttrs()}>Email Address*</label>
      <br />
      <input {...getInputAttrs()} />
      {info.touched && info.errorMessages ? (
        <ul {...getErrorsAttrs()}>
          {Object.entries(info.errorMessages).map(([validation, msg]) => (
            <li key={validation}>🆘 {msg}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function Index() {
  let actionData = useActionData() as ActionData;

  let formRef = React.useRef<HTMLFormElement>(null);

  // Use built-in browser validation prior to JS loading, then switch
  React.useEffect(() => {
    formRef.current?.setAttribute("novalidate", "novalidate");
  }, []);

  return (
    <div>
      <style>{`
        body {
          font-size: 16px;
          box-sizing: border-box;
        }

        code {
          background-color: rgba(220, 220, 220, 0.5);
          padding: 0.2rem;
          font-weight: bold;
          font-size: 0.8rem;
        }

        .italic {
          font-style: italic;
        }

        .demo-input-container {
          margin-bottom: 2rem;
          max-width: 800px;
        }

        .demo-input {
          max-width: 400px;
          padding-left: 2rem;
        }

        .rvs-label {
          display: block;
          padding-right: 1em;
          width: 10rem;
        }

        .rvs-input {
          display: inline-block;
          border: 1px solid lightgrey;
          padding: 0.5rem;
          border-radius: 3px;
          width: calc(100% - 1rem);
        }

        .rvs-input--invalid {
          border-color: red;
        }

        .rvs-input.rvs-input--touched:not(.rvs-input--invalid):not(.rvs-input--validating) {
          border-color: lightgreen;
        }

        .rvs-validating {
          font-style: italic;
          text-align: right;
          margin: 0;
          padding: 0;
        }

        .rvs-errors {
          color: red;
          list-style: none;
          margin: 0;
          padding: 0;
        }
      `}</style>

      <h1>Remix Validity State Demo Form</h1>

      <p>
        This is a sample form using{" "}
        <a
          href="https://github.com/brophdawg11/remix-validity-state"
          target="_blank"
          rel="noreferrer"
        >
          remix-validity-state
        </a>{" "}
        to demonstrate form validation capabilities. You can see the source code
        of this form{" "}
        <a
          href="https://github.com/brophdawg11/remix-validity-state/blob/main/demo-app/app/routes/index.tsx"
          target="_blank"
          rel="noreferrer"
        >
          in github
        </a>
        .
      </p>
      <hr />
      <FormContextProvider
        value={{
          formDefinition,
          // TODO: Can this case go away?  Seems to be coming from the
          // serialization logic in the useActionData generic
          serverFormInfo: actionData?.serverFormInfo as ServerFormInfo<
            typeof formDefinition
          >,
        }}
      >
        <Form method="post" autoComplete="off" ref={formRef}>
          <div className="demo-input-container">
            <p className="demo-input-message">
              This first name input has{" "}
              <code>required="true" minLength="5" pattern="^[a-zA-Z]+$"</code>
            </p>
            <div className="demo-input">
              <Field name="firstName" label="First Name" />
            </div>
          </div>

          <div className="demo-input-container">
            <p className="demo-input-message">
              This middle initial input has{" "}
              <code>
                pattern="^[a-zA-Z]{"{"}1{"}"}$"
              </code>
            </p>
            <div className="demo-input">
              <Field name="middleInitial" label="Middle Initial" />
            </div>
          </div>

          <div className="demo-input-container">
            <p className="demo-input-message">
              This last name input has{" "}
              <code>required="true" minLength="5" pattern="^[a-zA-Z]+$"</code>
            </p>
            <div className="demo-input">
              <Field name="lastName" label="Last Name" />
            </div>
          </div>

          <div className="demo-input-container">
            <p className="demo-input-message">
              This email address input has{" "}
              <code>type="email" required="true"</code>
              , but it also has an async custom validation that can be used to
              check for uniqueness. <br />
              <br />
              <span className="italic">
                Hint: <code>john@doe.com</code> and <code>jane@doe.com</code>{" "}
                are already taken!
              </span>
            </p>
            <div className="demo-input">
              <EmailAddress />
            </div>
          </div>

          <div className="demo-input-container">
            <p className="demo-input-message">
              Each of these hobby inputs has <code>required="true"</code>
            </p>
            <div className="demo-input">
              <Field name="hobby" label="Hobby #1" index={0} />
              <Field name="hobby" label="Hobby #2" index={1} />
              <Field name="hobby" label="Hobby #3" index={2} />
            </div>
          </div>

          <button type="submit">Submit</button>
        </Form>
      </FormContextProvider>
    </div>
  );
}
