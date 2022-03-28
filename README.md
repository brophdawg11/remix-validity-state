# Remix Input

## Design Goals

- Leverage built-in HTML input validations verbatim
- Share validations between client and server
- Expose validation results via a [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState)
- Permit custom sync/async validations leveraging remix primitives where possible
  - I.e., `action`/`useFetcher`
- Provide abstractions to simplify form markup generation (labels, inputs, errors, etc.)
  - But only as syntactic sugar
  - Always allow low-level usages of independent labels, input, error displays
