# Remix Input

## Design Goals

- Leverage built-in HTML input validations be verbatim
- Share validations between client and server
- Expose validation results via a ValidityState object
- Permit custom sync/async validations on top
- Provide abstractions to simplify form generation (labels, inputs, errors, etc.) but only as syntactic sugar - always allow low-level usages of independent labels, input, error displays where needed
