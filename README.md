# Remix Validity State

`remix-validity-state` is a small [React](https://reactjs.org/) form validation library that aims to embrace HTML input validation and play nicely with [Remix](https://remix.run) and [React Router](https://reactrouter.com/en/main) primitives (specifically submitting forms to `action` handlers). However, it's worth noting that this library doesn't use anything specific from Remix or React Router and could be leveraged in any React application.

> **Warning**
>
> This library is still in a beta stage. It's feeling more stable these days but I can't guarantee there won't be breaking changes ahead 😀.

- [Remix Validity State](#remix-validity-state)
  - [Design Goals](#design-goals)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Demo App](#demo-app)
    - [Getting Started](#getting-started)
      - [Define your form validations](#define-your-form-validations)
      - [Provide your validations via `FormProvider`](#provide-your-validations-via-formprovider)
      - [Render `<Input>` Components inside your `FormProvider`](#render-input-components-inside-your-formprovider)
      - [Wire up server-side validations](#wire-up-server-side-validations)
      - [Add your server action response to the `FormProvider`](#add-your-server-action-response-to-the-formprovider)
      - [That's it!](#thats-it)
    - [Advanced Usages and Concepts](#advanced-usages-and-concepts)
      - [`ExtendedValidityState`](#extendedvaliditystate)
      - [Multiple Inputs with the Same Name](#multiple-inputs-with-the-same-name)
      - [Dynamic (Form-Dependent) Validation Attributes](#dynamic-form-dependent-validation-attributes)
      - [Custom Validations](#custom-validations)
      - [Textarea and Select Elements](#textarea-and-select-elements)
      - [Radio and Checkbox Inputs](#radio-and-checkbox-inputs)
      - [Server-only Validations](#server-only-validations)
      - [Error Messages](#error-messages)
      - [useValidatedInput()](#usevalidatedinput)
      - [Styling](#styling)
      - [Typescript](#typescript)
  - [Feedback + Contributing](#feedback--contributing)

## Design Goals

This library is built with the following design goals in mind:

**1. Leverage built-in HTML input validation attributes _verbatim_**

What ever happened to good old `<input required maxlength="30" />`? Far too often we reach for some custom validation library just to check that a value is not empty (and potentially ship a boatload of JS to the client in order to do so). Let's use what we have readily available when we can! That way we don't have to relearn something new. If you already know some of the HTML validation attributes...then you're ready to use this library.

**2. Share validations between client and server**

Thanks to `Remix`, this is finally _much_ more straightforward than it has been in the past. But wait 🤔, aren't we using DOM validations? We don't have a DOM on the server?!? Don't worry - in true Remix spirit, we emulate the DOM validations on the server.

**3. Expose validation results via a [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState)-like API**

We will need an API to explain the validation state of an input...good news - the web already has one! Let's [`#useThePlatform`](https://twitter.com/search?q=%23usetheplatform) and build on top of `ValidityState`.

**4. Permit custom sync/async validations beyond those built into HTML**

Congrats for making it to bullet 4 and not leaving as soon as we mentioned the super-simple HTML validations. Don't worry - it's not lost on me that folks need to check their email addresses for uniqueness in the DB. We've got you covered with custom sync/async validations.

**5. Provide limited abstractions to simplify form markup generation**

Semantically correct and accessible `<form>` markup is verbose. Any convenient form library oughta provide _some_ wrapper components to make simple forms _easy_. However, any form library worth it's weight has to offer low level access to allow for true custom forms, and the ability to built custom abstractions for your application use-case. Therefore, any wrapper components will be little more than syntactic sugar on top of the lower level APIs.

## Installation

```sh
> npm install remix-validity-state

# or

> yarn add remix-validity-state
```

> **Info**
>
> This library is bundled for modern browsers (see `.browserslistrc`). If you need to support older browsers you may need to configure your build process accordingly.

## Usage

### Demo App

There's a sample Remix app deployed to [rvs.fly.dev](https://rvs.fly.dev) that you can check out. This app source code is stored in this repository in the `demo-app/` folder, so you can also run it locally via:

```bash
git clone git@github.com:brophdawg11/remix-validity-state.git
cd remix-validity-state/demo-app
npm ci
npm run dev
```

### Getting Started

#### Define your form validations

In order to share validations between server and client, we define a single object containing all of our form field validations, keyed by the input names. Validations are specified using the built-in HTML validation attributes, exactly as you'd render them onto a JSX `<input>`.

If you're using TypeScript (and you should!) you should define a schema that corresponds to the `FormDefinition` interface so you can benefit from proper type inference on library APIs.

```ts
interface FormSchema {
  inputs: {
    firstName: InputDefinition;
    middleInitial: InputDefinition;
    lastName: InputDefinition;
    emailAddress: InputDefinition;
  };
}

let formDefinition: FormSchema = {
  inputs: {
    firstName: {
      validationAttrs: {
        required: true,
        maxLength: 50,
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
        maxLength: 50,
      },
    },
    emailAddress: {
      validationAttrs: {
        type: "email",
        required: true,
        maxLength: 50,
      },
    },
  },
};
```

This allows us to directly render these attributes onto our HTML inputs internally via something like `<input name="firstName" {...formDefinition.inputs.firstName.validationAttrs} />`

#### Provide your validations via `FormProvider`

In order to make these validations easily accessible, we provide them via a `<FormProvider>` that should wrap your underlying `<form>` element. We do this with a wrapper component around the actual context for better TypeScript inference.

```jsx
import { FormProvider } from "remix-validity-state";

function MyFormPage() {
  return (
    <FormProvider formDefinition={formDefinition}>
      {/* Your <form> goes in here */}
    </FormProvider>
  );
}
```

#### Render `<Input>` Components inside your `FormProvider`

```jsx
import { FormProvider } from "remix-validity-state";

function MyFormPage() {
  return (
    <FormProvider formDefinition={formDefinition}>
      <Input name="firstName" label="First Name" />
      <Input name="middleInitial" label="Middle Name" />
      <Input name="lastName" label="Last Name" />
      <Input name="emailAddress" label="Email Address" />
    </FormProvider>
  );
}
```

The `<Input>` component is our wrapper that handles the `<label>`, `<input>`, and real-time error display. The `name` serves as the key and will look up our validation attributes from your `formDefinition` and include them on the underlying `<input />`.

#### Wire up server-side validations

In Remix, your submit your forms to an `action` which receives the `FormData`. In your action, call `validateServerFormData` with the `formData` and your previously defined `formDefinition`:

```js
import { validateServerFormData } from "remix-validity-state";

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const serverFormInfo = await validateServerFormData(
    formData,
    formDefinitions
  );
  if (!serverFormInfo.valid) {
    // Uh oh - we found some errors, send them back up to the UI for display
    // serverFormInfo contains:
    //  - submittedValues - all of the form input values submitted in formData
    //  - inputs - InputInfo objects representing the ValidityState of each input
    //  - errorMessages - error messages to display
    return json({ serverFormInfo });
  }
  // Congrats!  Your form data is valid - do what ya gotta do with it
}
```

#### Add your server action response to the `FormProvider`

When we validate on the server, we may get errors back that we didn't catch during client-side validation (or we didn't run because JS hadn't yet loaded!). In order to render those, we can provide the response from `validateServerFormData` to our `FormProvider` and it'll be used internally. The `serverFormInfo` also contains all of the submitted input values to be pre-populated into the inputs in a no-JS scenario.

```js
import { Field, FormProvider } from "remix-validity-state";

export default function MyRemixRouteComponent() {
  let actionData = useActionData<typeof action>();

  return (
    <FormProvider
      formDefinition={formDefinition},
      serverFormInfo={actionData?.serverFormInfo},
    >
      <Input name="firstName" label="First Name" />
      <Input name="middleInitial" label="Middle Name" />
      <Input name="lastName" label="Last Name" />
      <Input name="emailAddress" label="Email Address" />
    </FormProvider>
  );
}
```

#### That's it!

You've now got a real-time client-side validated form wired up with your rock-solid server validations!

Play with this complete example on [StackBlitz](https://stackblitz.com/edit/node-okmhgz?file=app%2Froutes%2Findex.tsx)

### Advanced Usages and Concepts

#### `ExtendedValidityState`

Internally, we use what we call an `ExtendedValidityState` data structure which is the same format as `ValidityState`, plus any additional custom validations. This looks like the following:

```js
let extendedValidityState = {
  badInput: false, // currently unused
  customError: false, // currently unused
  rangeOverflow: false, // Did we fail 'max'?
  rangeUnderflow: false, // Did we fail 'min'?
  patternMismatch: false, // Did we fail 'pattern'?
  stepMismatch: false, // Did we fail 'step'?
  tooLong: false, // Did we fail 'maxlength'?
  tooShort: false, // Did we fail 'minlength'?
  typeMismatch: false, // Did we fail 'type'?
  valueMissing: false, // Did we fail 'required'?
  valid: true, // Is the input valid?

  // Custom validations are appended directly in here as well!
  uniqueEmail: false, // Did we fail the unique email check?
};
```

#### Multiple Inputs with the Same Name

It's totally valid in HTML to submit multiple inputs with the same name, and they end up in `FormData` and can be accessed as an array using `FormData.getAll()`. To support this, our `serverFormInfo.inputs` and `serverFormInfo.submittedValues` types are both either a value or an array depending on whether we encountered multiple input values for a given name.

```js
// consider submitting the following inputs:
<input name="username" value="brophdawg11" />
<input name="hobbies" value="golf" />
<input name="hobbies" value="skiing" />
<input name="hobbies" value="coding" />

// In your action:
async function action({ request }) {
  let formData = await request.formData();
  let serverFormInfo = validateServerFormInfo(formData, formDefinition);
  // serverFormInfo will have the shape:
  // {
  //    submittedValues: {
  //      username: 'brophdawg11',
  //      hobbies: ['golf', 'skiing', 'coding']
  //    },
  //    inputs: {
  //      userName: InputInfo,
  //      hobbies: [InputInfo, InputInfo, InputInfo]
  //    }
  // }
```

#### Dynamic (Form-Dependent) Validation Attributes

Most of the time, your built-in validation attributes will be static (`required: true` or `malength: 30` etc.). However, sometimes you need the validation attribute to be dependent on the current value of another input in the form. Consider 2 numeric inputs: `low` and `high`. If `low` has a value, then `high` sets it's `min` validation attribute to the value of `low` and vice versa:

```js
let formDefinition: FormSchema = {
  inputs: {
    low: {
      validationAttrs: {
        type: "number",
        max: (fd) => (fd.get("high") ? Number(fd.get("high")) : undefined),
      },
    },
    high: {
      validationAttrs: {
        type: "number",
        min: (fd) => (fd.get("low") ? Number(fd.get("low")) : undefined),
      },
    },
  },
};
```

In order for dynamic/form-dependent validations like this to work reliably, we have to be able to update one input when the value of _another_ input changes. By default, `useValidatedInput` and `<Input>` are scoped to a single input. So if you are using dynamic built-in validations then you should provide a `<FormProvider formRef>` property with a ref to your form element, that way the library can listen for `change` events and update dependent validations accordingly.

#### Custom Validations

Custom validations are implemented as a sync or async function returning a boolean, and you add them directly into your `formDefinition` object alongside where you define HTML validations:

```js
const formDefinition: FormSchema = {
  inputs: {
    emailAddress: {
      validationAttrs: {
        required: true,
        maxLength: 50,
      },
      customValidations: {
        async uniqueEmail(value) {
            let res = await fetch(...);
            let data = await res.json();
            return data.isUnique === true;
        },
      }
  },
}
```

#### Textarea and Select Elements

Other control types work just like `<input>` but use a different type and are identified with an `element` prop. This allows for differentiation under the hood and proper type inference on the validation attributes allowed for different elements.

```ts
interface FormSchema {
  inputs: {
    biography: TextAreaDefinition;
    country: SelectDefinition;
  };
}

let formDefinition: FormSchema = {
  inputs: {
    biography: {
      element: "textarea",
      validationAttrs: {
        required: true,
        maxLength: 500,
      },
    },
    country: {
      element: "select",
      validationAttrs: {
        required: true,
      },
    },
  },
};
```

#### Radio and Checkbox Inputs

Radio and Checkbox inputs are unique in that they generally have multiple inputs of the same name and validation is dependent upon the state of _all_ of the inputs.

```ts
interface FormSchema {
  inputs: {
    skills: InputDefinition;
    favoriteFood: InputDefinition;
  };
}

let formDefinition: FormSchema = {
  inputs: {
    programmingLanguages: {
      validationAttrs: {
        type: "checkbox",
        required: true,
        maxLength: 500,
      },
    },
    favoriteFood: {
      validationAttrs: {
        type: "radio",
        required: true,
      },
    },
  },
};
```

Because validation is across the group of them, it's not recommended to use the `<Input>` component, because that by default renders errors _per-input_. We really want them for the group of inputs. It's recommended to call `useValidatedInput` manually for these scenarios:

```tsx
function FavoriteSkill() {
  let skills = ["React", "Vue", "Preact", "Angular", "Svelte", "Solid", "Qwik"];
  let { info, getInputAttrs, getLabelAttrs, getErrorsAttrs } =
    useValidatedInput<typeof formDefinition>({ name: "skills" });
  // Since we'll share these attributes across all checkboxes we call these
  // once here to avoid calling per-input.  And since we put the input inside
  // the label we don't need the `for` attribute
  let labelAttrs = getLabelAttrs({ htmlFor: undefined });
  let inputAttrs = getInputAttrs();
  return (
    <fieldset>
      <legend>Which skills do you have?</legend>

      {/* Render checkboxes for each skill, making the id unique based on the skill */}
      {skills.map((s) => (
        <label key={s} {...labelAttrs}>
          <input
            {...{ ...inputAttrs, id: `${inputAttrs.id}--${s.toLowerCase()}` }}
          />
          &nbsp;
          {s}
        </label>
      ))}

      {/* Render errors once for the group of inputs */}
      {info.touched && info.errorMessages ? (
        <ul {...getErrorsAttrs()}>
          {Object.entries(info.errorMessages).map(([validation, msg]) => (
            <li key={validation}>🆘 {msg}</li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}
```

#### Server-only Validations

While this library tries to lean-into shared validations between client and server, there are also good reasons not to share validations entirely. Most of the time, this comes down to keeping client-bundles small and/or needing direct server or DB access for certain validations.

One approach is to just perform server-only validations manually _after_ calling `validateServerFormInfo`:

```js
import { validateServerFormData } from "remix-validity-state";

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const serverFormInfo = await validateServerFormData(
    formData,
    formDefinitions
  );
  if (!serverFormInfo.valid) {
    return json({ serverFormInfo });
  }

  // Now that we know our shared validations passed, we can perform more complex validations
  let isEmailUnique = await checkEmail(
    serverFormInfo.submittedValues.emailAddress
  );
  if (!isEmailUnique) {
    return json({
      serverFormInfo,
      errors: { email: "Email address is not unique " },
    });
  }
  // ...
}
```

This may be sufficient in some cases, but also now requires you to support a new error messaging UI separate from the one already handled via `<Input>` and/or provided by `useValidatedInput().info.errorMessages`.

To support this common use-case, you can pass a set of `customValidations` server-only implementations to `validateServerFormData`, which will be used instead of the validations you define in the shared `formDefinition`. Usually, you'll just put a stub `() => true` in your shared validations so the client is aware of the validation.

```ts
import type { ServerOnlyCustomValidations } from 'remix-validity-state'
import { validateServerFormData } from 'remix-validity-state'

let formDefinition: FormSchema = {
  inputs: {
    emailAddress: {
      validationAttrs: {
        type: "email",
        required: true,
      },
      customValidations: {
        // always "valid" in shared validations
        uniqueEmail: () => true,
      },
      errorMessages: {
        uniqueEmail: () => 'Email address already in use!'',
      },
    },
  }
};

const serverCustomValidations: ServerOnlyCustomValidations<FormSchema> = {
  emailAddress: {
    async uniqueEmail(value) {
      let isUnique = await checkEmail(value);
      return isUnique;
    },
  },
};

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const serverFormInfo = await validateServerFormData(
    formData,
    formDefinitions,
    serverCustomValidations
  );
  // serverFormInfo.valid here will be reflective of the custom server-only
  // validation and will leverage your shared `errorMessages`
  if (!serverFormInfo.valid) {
    return json({ serverFormInfo });
  }
  // ...
}
```

#### Error Messages

Basic error messaging is handled out of the box by `<Input>` for built-in HTML validations. If you are using custom validations, or if you want to override the built-in messaging, you can provide custom error messages in our `formDefinition`. Custom error messages can either be a static string, or a function that receives the attribute value (built-in validations only), the input name, and the input value:

```ts
const formDefinition: FormSchema = {
  inputs: { ... },
  errorMessages: {
    valueMissing: "This field is required",
    tooLong: (attrValue, name, value) =>
      `The ${name} field can only be up to ${attrValue} characters, ` +
      `but you have entered ${value.length}`,
    uniqueEmail: (_, name, value) =>
      `The email address ${value} is already taken`,
  }
};
```

You can also provide field-specific error messages if needed, whioch will override the global error messages:

```ts
const formDefinition: FormSchema = {
  inputs: {
    firstName: {
      validationAttrs: { ... },
      errorMessages: {
        valueMissing: "Please enter a last name!",
      }
    }
  },
  errorMessages: {
    valueMissing: "This field is required",
  }
};
```

#### useValidatedInput()

This is the bread and butter of the library - and `<Input>` is really nothing more than a wrapper around this hook. This is useful if you require more control over the direct rendering of your `input`, `label` or error elements. Let's take a look at what it gives you. The only required input is the input `name`:

```js
let { info, getInputAttrs, getLabelAttrs, getErrorsAttrs } = useValidatedInput({
  name: "firstName",
});
```

The returned `info` value is of the following structure:

```ts
interface InputInfo {
  // Has this input been blur'd?
  touched: boolean;
  // Has this input value changed?
  dirty: boolean;
  // Validation state, 'idle' to start and 'validating' during any
  // custom async validations
  state: "idle" | "validating" | "done";
  // The current validity state of our input
  validity?: ExtendedValidityState;
  // Map of ExtendedValidityState validation name -> error message for all current errors
  errorMessages?: Record<string, string>;
}
```

`validity` contains the current validation state of the input. Most notably `validity.valid`, tells you if the input is in a valid state.

`errorMessages` is present if the input is invalid, and contains the error messages that should be displayed to the user (keyed by the validation name in `validity`):

```js
{
  tooLong: 'The email field can only be up to 50 characters, but you have entered 60',
  uniqueEmail: 'The email address john@doe.com is already taken',
}
```

`getInputAttrs`, `getLabelAttrs`, and `getErrorsAttrs` are [prop getters](https://kentcdodds.com/blog/how-to-give-rendering-control-to-users-with-prop-getters) that allow you to render you own custom `<input>`/`<label>` elements and error displays, while handling all of the validation attrs, `id`, `for`, `aria-*`, and other relevant attribute for your form markup.

Let's look at an example usage:

```jsx
<div>
  <label {...getLabelAttrs()}>Email Address*</label>
  <input {...getInputAttrs()} />
  {info.touched && info.errorMessages ? (
    <ul {...getErrorsAttrs()}>
      {Object.values(info.errorMessages).map((msg) => (
        <li key={msg}>🆘 {msg}</li>
      ))}
    </ul>
  ) : null}
</div>
```

`useValidatedInput` can also be used without a `FormProvider` for `formDefinition` and `serverFormInfo` if necessary:

```js
let { info } = useValidatedInput({
  name: "emailAddress",
  formDefinition,
  serverFormInfo,
});
```

#### Styling

This library aims to be pretty hands-off when it comes to styling, since every use-case is so different. We expect most consumers will choose to create their own custom markup with direct usage of `useValidatedInput`. However, for simple use-cases of `<Input>` we expose a handful of stateful classes on the elements you may hook into with your own custom styles:

- `rvs-label` - added to the built-in `<label>` element
  - `rvs-label--touched` - present when the input has been blur'd
  - `rvs-label--dirty` - present when the input has been changed
  - `rvs-label--invalid` - present when the input is invalid
  - `rvs-label--validating` - present when the input is processing async validations
- `rvs-input` - added to the built-in `<input>` element
  - `rvs-input--touched` - present when the input has been blur'd
  - `rvs-input--dirty` - present when the input has been changed
  - `rvs-input--invalid` - present when the input is invalid
  - `rvs-input--validating` - present when the input is processing async validations
- `rvs-validating` - present on the `<p>` tag that displays a `Validating...` message during async validation
- `rvs-errors` - added to the built-in errors list `<ul>` element

#### Typescript

Now, I'm no TypeScript wizard but I have tried to make this library TypeScript friendly, and even got some good feature requests early on (thanks Kent for #7 and #9!). Hopefully over time the types will improve further, but at the moment here's the best way to get type safety and inference.

```tsx
// Define an interface for your validations thats adheres to the shape of FormDefinition
interface FormSchema {
  inputs: {
    firstName: InputDefinition;
    lastName: InputDefinition;
  }
}

// Create your form definition
const formDefinition: FormSchema = {
  inputs: {
    firstName: {
      validationattrs: { required: true },
    },
    lastName: {
      validationattrs: { required: true },
    },
  }
}

// When passing formDefinition to context/hooks it will automatically infer
// your types:
<FormProvider formDefinition={formDefinition} />
useValidatedInput({ name: "firstName", formDefinition });

// Or if you are using useValidatedInput inside the context, you'll need to
// use the generic signature:
useValidatedInput<FormSchema>({ name: 'firstName' });

// Finally, the return type of validateServerFormData will have serverFormInfo.inputs
// and serverFormInfo.submittedValues properly typed with your fields
```

## Feedback + Contributing

Feedback is absolutely welcomed! This is a bit of a side hobby for me - as I've built plenty of forms over the years and I've never been particularly satisfied with the libraries available. So this is somewhat of an attempt to build my ideal validation library - and I would love ideas that could improve it. So please feel free to file issues, opens PRs, etc.

Here's a few guidelines if you choose to contribute!

- **Find a bug?** Please file an Issue with a minimal reproduction. Ideally a working example in stackblitz/codesandbox/etc., but sample code can suffice in many cases as well.
- **Fix a bug?** You rock 🙌 - please open a PR.
- **Have a feature idea?** Please open feature requests as a Discussion so we can use the forum there to come up with a solid API.
