# Remix Validity State

`remix-validity-state` is a small [React](https://reactjs.org/) form validation library that aims to embrace HTML input validation and play nicely with [Remix](https://remix.run) primitives.

> ⚠️ **Note: This library is in very much in an alpha stage. Feedback is welcome, however production usage is strongly discouraged.**

## Design Goals

This library is built with the following design goals in mind:

**1. Leverage built-in HTML input validation attributes _verbatim_**

What ever happened to good old `<input required maxlength="30" />`? Far too often we reach for some custom implementation just to check that a value is not empty. Let's use what we have readily available when we can! That way we don't have to relearn something new. If you already know some of the HTML validation attributes...then you're ready to use this library.

**2. Share validations between client and server**

Thanks to `Remix`, this is finally _much_ more straightforward than it has been in the past. But wait 🤔, aren't we using DOM validations? We don't have a DOM on the server?!? Don't worry - in true Remix spirit, we emulate the DOM validations on the server.

**3. Expose validation results via a [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState)-like API**

We will need an API to explain the validation state of an input...good news - the web already has one! Let's [`#useThePlatform`](https://twitter.com/search?q=%23usetheplatform) and build on top of `ValidityState`.

**4. Permit custom sync/async validations beyond those built into HTML**

Congrats for making it to bullet 4 and not leaving as soon as we mentioned the super-simple HTML validations. Don't worry - it's not lost on me that folks need to check their email addresses for uniqueness in the DB. We've got you covered with custom sync/async validations.

**5. Provide limited abstractions to simplify form markup generation**

Semantically correct and accessible `<form>` markup is verbose. Any convenient form library oughta provide _some_ wrapper components to make simple forms _easy_. However, any form library worth it's weight has to offer low level access to allow for true custom forms, and the ability to built custom abstractions for your application use-case. Therefore, any wrapper components will be little more than syntactix sugar on top of the lower level APIs.

## Installation

```sh
> npm install --save remix-validity-state
```

## Usage

### Getting Started

#### Define your form validations

In order to share validations between server and client, we define a single object containing all of our form field validations, keyed by the input names. Validations are specified using the built-in HTML validation attributes, exactly as you'd render them onto a JSX `<input>`.

```js
const formValidations = {
  firstName: {
    required: true,
    maxLength: 20,
  },
  middleInitial: {
    pattern: "^[a-zA-Z]{1}$",
  },
  lastName: {
    required: true,
    maxLength: 20,
  },
};
```

This allows us to directly render these attributes onto our HTML inputs via something like `<input name="firstName" {...formValidations.firstName} />`

#### Provide your validations via `FormContext`

In order to make these validations easily accessible, we provide them via context that should wrap your underlying `<form>`:

```jsx
<FormContext.Provider value={{ formValidations }}>
  {/* Your <form> goes in here */}
</FormContext.Provider
```

#### Render `<Field>` Components inside your `FormContext`

```jsx
<FormContext.Provider value={{ formValidations }}>
  <Field name="firstName" label="First Name" />
  <Field name="middleInitial" label="Middle Name" />
  <Field name="lastName" label="Last Name" />
</FormContext.Provider>
```

The `<Field>` component is our wrapper that handles the `<label>`, `<input>`, and real-time error display.

#### Wire up server-side validations

In Remix, your submit your forms to an `action` which receives the `FormData`. In your action, call `validateServerFormData` with the `formData` and your previously defined `formValidations`:

```js
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

When we validate on the server, we may get errors back that we didn't not catch during client-side validation (or we didn't run because JS hadn't yet loaded!). In order to render those, we can provide the response from `validateServerFormData` to our `FormContext` and it'll be used internally. The `serverFormInfo` also contains all of the submitted input values to be pre-populated into the inputs in a no-JS scenario.

```js
export default function MyRemixRouteComponent() {
  let actionData = useActionData();
  return (
    <FormContext.Provider
      value={{
        formValidations,
        serverFormInfo: actionData?.serverFormInfo,
      }}
    >
      <Field name="firstName" label="First Name" />
      <Field name="middleInitial" label="Middle Name" />
      <Field name="lastName" label="Last Name" />
    </FormContext.Provider>
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
  firstName: {
    required: true,
    maxLength: 20,
    async uniqueEmail(value) {
        let res = await fetch(...);
        let data = await res.json();
        return data.isUnique === true;
    },
  },
}
```

#### useValidatedInput()

This is the bread and butter of the library - and `<Field>` is really nothing more than a wrapper around this hook. Let's take a look at what it gives you:

```js
let { info, getInputAttrs, getLabelAttrs, getErrorsAttrs } = useValidatedInput({
  name: "firstName",
});
```

`info` is of the following structure:

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
}
```

`getInputAttrs`, `getLabelAttrs`, and `getErrorsAttrs` are [prop getters](https://kentcdodds.com/blog/how-to-give-rendering-control-to-users-with-prop-getters) that allow you to render you own custom `<input>`/`<label>` elements and error displays, while handling all of the validation attrs, `id`, `for`, `aria-*`, and other relevant attribute for your form markup.

Let's look at an example usage:

```jsx
<div>
  <label {...getLabelAttrs()}>My Label Value</label>
  <input {...getInputAttrs()} />
  {info.touched && !info.validity.valid ? (
    <ul {...getErrorsDisplay}>
      {Object.entries(info.validity || {})
        .filter((e) => e[0] !== "valid" && e[1] === true)
        .map(([validation]) => (
          <li key={validation}>🆘 {validation}</li>
        ))}
    </ul>
  ) : null}
</div>
```

### Error Messages

TODO...

## Not Yet Implemented

Currently, this library has only supports simple `<input>` elements. The following items are not currently supported, but are planned:

- Radio Buttons
- Checkboxes
- Select
- Textarea
