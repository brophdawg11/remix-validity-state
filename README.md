# Remix Validity State

`remix-validity-state` is a small [React](https://reactjs.org/) form validation library that aims to embrace HTML input validation and play nicely with [Remix](https://remix.run) primitives.

> **Warning**
>
> This library is in very much in an alpha stage. Feedback is welcome, however production usage is strongly discouraged.

- [Remix Validity State](#remix-validity-state)
  - [Design Goals](#design-goals)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Demo App](#demo-app)
    - [Getting Started](#getting-started)
      - [Define your form validations](#define-your-form-validations)
      - [Provide your validations via `FormContextProvider`](#provide-your-validations-via-formcontextprovider)
      - [Render `<Field>` Components inside your `FormContextProvider`](#render-field-components-inside-your-formcontextprovider)
      - [Wire up server-side validations](#wire-up-server-side-validations)
      - [Add your server action response to the `FormContext`](#add-your-server-action-response-to-the-formcontext)
      - [That's it!](#thats-it)
    - [Advanced Usages and Concepts](#advanced-usages-and-concepts)
      - [`EnhancedValidityState`](#enhancedvaliditystate)
      - [Custom Validations](#custom-validations)
      - [Error Messages](#error-messages)
      - [useValidatedInput()](#usevalidatedinput)
      - [Styling](#styling)
      - [Typescript](#typescript)
  - [Not Yet Implemented](#not-yet-implemented)
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

```js
const formValidations = {
  firstName: {
    required: true,
    maxLength: 50,
  },
  middleInitial: {
    pattern: "^[a-zA-Z]{1}$",
  },
  lastName: {
    required: true,
    maxLength: 50,
  },
  emailAddress: {
    type: "email",
    required: true,
    maxLength: 50,
  },
};
```

This allows us to directly render these attributes onto our HTML inputs via something like `<input name="firstName" {...formValidations.firstName} />`

#### Provide your validations via `FormContextProvider`

In order to make these validations easily accessible, we provide them via context that should wrap your underlying `<form>`. We do this with a wrapper component around the actual context for better TypeScript inference.

```jsx
import { FormContextProvider } from 'remix-validity-state'

<FormContextProvider value={{ formValidations }}>
  {/* Your <form> goes in here */}
</FormContextProvider
```

#### Render `<Field>` Components inside your `FormContextProvider`

```jsx
<FormContextProvider value={{ formValidations }}>
  <Field name="firstName" label="First Name" />
  <Field name="middleInitial" label="Middle Name" />
  <Field name="lastName" label="Last Name" />
  <Field name="emailAddress" label="Email Address" />
</FormContextProvider>
```

The `<Field>` component is our wrapper that handles the `<label>`, `<input>`, and real-time error display. The `name` serves as the key and will look up our validation attributes from context and include them on the underlying `<input />`.

#### Wire up server-side validations

In Remix, your submit your forms to an `action` which receives the `FormData`. In your action, call `validateServerFormData` with the `formData` and your previously defined `formValidations`:

```js
import { validateServerFormData } from "remix-validity-state";

export async function action({ request }) {
  const formData = await request.formData();
  const serverFormInfo = await validateServerFormData(
    formData,
    formValidations
  );
  if (!serverFormInfo.valid) {
    // Uh oh - we found some errors, send them back up to the UI for display
    return json({ serverFormInfo });
  }
  // Congrats!  Your form data is valid - do what ya gotta do with it
}
```

#### Add your server action response to the `FormContext`

When we validate on the server, we may get errors back that we didn't catch during client-side validation (or we didn't run because JS hadn't yet loaded!). In order to render those, we can provide the response from `validateServerFormData` to our `FormContext` and it'll be used internally. The `serverFormInfo` also contains all of the submitted input values to be pre-populated into the inputs in a no-JS scenario.

```js
import { Field, FormContextProvider } from "remix-validity-state";

export default function MyRemixRouteComponent() {
  let actionData = useActionData();
  return (
    <FormContextProvider
      value={{
        formValidations,
        serverFormInfo: actionData?.serverFormInfo,
      }}
    >
      <Field name="firstName" label="First Name" />
      <Field name="middleInitial" label="Middle Name" />
      <Field name="lastName" label="Last Name" />
      <Field name="emailAddress" label="Email Address" />
    </FormContextProvider>
  );
}
```

#### That's it!

You've now got a real-time client-side validated form wired up with your rock-solid server validations!

### Advanced Usages and Concepts

#### `EnhancedValidityState`

Internally, we use what we call an `EnhancedValidityState` data structure which is the same format as `ValidityState`, plus any additional custom validations. This looks like the following:

```js
let enhancedValidityState = {
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

#### Custom Validations

Custom validations are implemented as a sync or async function returning a boolean, and you add them directly into your `formValidations` object where you define HTML validations:

```js
const formValidations: FormValidations = {
  name: {
    required: true,
    maxLength: 50,
  },
  emailAddress: {
    required: true,
    maxLength: 50,
    async uniqueEmail(value) {
        let res = await fetch(...);
        let data = await res.json();
        return data.isUnique === true;
    },
  },
}
```

#### Error Messages

Basic error messaging is handled out of the box by `<Field>` for built-in HTML validations. If you are using custom validations, or if you want to override the built-in messaging, you can provide custom error messages through the `<FormContextProvider>`. Custom error messages can either be a static string, or a function that receives the attribute value (built-in validations only), the input name, and the input value:

```jsx
const errorMessages = {
  valueMissing: "This field is required",
  tooLong: (attrValue, name, value) =>
    `The ${name} field can only be up to ${attrValue} characters, ` +
    `but you have entered ${value.length}`,
  uniqueEmail: (_, name, value) =>
    `The email address ${value} is already taken`,
};

<FormContextProvider value={{ formValidations, errorMessages }}>
  ...
</FormContextProvider>;
```

#### useValidatedInput()

This is the bread and butter of the library - and `<Field>` is really nothing more than a wrapper around this hook. Let's take a look at what it gives you. The only required input is the input `name`:

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
  validity?: EnhancedValidityState;
  // Map of EnhancedValidityState validation name -> error message for all current errors
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

`useValidatedInput` can also be used instead of `FormContextProvider` for `formValidations` and `serverFormInfo` if necessary:

```js
let { info } = useValidatedInput({
  name: "emailAddress",
  formValidations,
  serverFormInfo,
});
```

Or, you can pass field-specific error message overrides that will be merged into the `errorMessages` provided by the `FormContext`:

```js
let { info } = useValidatedInput({
  name: "emailAddress",
  errorMessages: {
    required: "Please provide an email address",
  },
});
```

#### Styling

This library aims to be pretty hands-off when it comes to styling, since every use-case is so different. We expect most consumers will choose to create their own custom markup with direct usage of `useValidatedInput`. However, for simple use-cases of `<Field />` we expose a handful of stateful classes on the elements you may hook into with your own custom styles:

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

```ts
// Define a type for your validations
type MyValidations = {
  firstName: Validations;
  lastName: Validations;
}

// Create your typed validations
const formValidations: MyValidations = {
  firstName: { required: true },
  lastName: { required: true },
}

// When passing formValidations to context./hooks it will automatically infer
// your types:
<FormContextProvider value={{ formValidations }}>
useValidatedInput({ name: "firstName", formValidations });

// Or if you are using useValidatedInput inside the context, you'll need to
// use the generic signature:
useValidatedInput<MyValidations>({ name: 'firstName' });

// Finally, the return type of validateServerFormData will have serverFormInfo.inputs
// properly typed with your fields
```

## Not Yet Implemented

Currently, this library only supports simple `<input>` elements. The following items are not currently supported, but are planned for any formal v1.0 release:

- [x] Error message interpolation
- [ ] Radio Buttons
- [ ] Checkboxes
- [ ] Select
- [ ] Textarea
- [ ] Form level `info.valid` object (for disabling submit etc.)

## Feedback + Contributing

Feedback is absolutely welcomed! This is a bit of a side hobby for me - as I've built plenty of forms over the years and I've never been particularly satisfied with the libraries available. So this is somewhat of an attempt to build my ideal validation library - and I would love ideas that could improve it. So please feel free to file issues, opens PRs, etc.

Here's a few guidelines if you choose to contribute!

- **Find a bug?** Please file an Issue with a minimal reproduction. Ideally a working example in stackblitz/codesandbox/etc., but sample code can suffice in many cases as well.
- **Fix a bug?** You rock 🙌 - please open a PR.
- **Have a feature idea?** Please open feature requests as a Discussion so we can use the forum there to come up with a solid API.
