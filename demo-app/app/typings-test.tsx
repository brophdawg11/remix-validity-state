import type {
  InputDefinition,
  SelectDefinition,
  TextAreaDefinition,
} from "../../../src";
import { validateServerFormData } from "../../../src";
import type { ActionArgs } from "@remix-run/node";

type FormSchema = {
  inputs: {
    a: TextAreaDefinition;
    b: TextAreaDefinition;
    c: TextAreaDefinition;

    d: SelectDefinition;
    e: SelectDefinition;
    f: SelectDefinition;
    g: SelectDefinition;
    h: SelectDefinition;
    i: SelectDefinition;
    j: SelectDefinition;
    k: SelectDefinition;
    l: SelectDefinition;
    m: SelectDefinition;
    n: SelectDefinition;
    o: SelectDefinition;
    p: SelectDefinition;
    q: SelectDefinition;
    r: SelectDefinition;

    s: InputDefinition;
    t: InputDefinition;
    u: InputDefinition;
    v: InputDefinition;
    w: InputDefinition;
    x: InputDefinition;
    y: InputDefinition;
    z: InputDefinition;
    aa: InputDefinition;
    ab: InputDefinition;
    ac: InputDefinition;
    ad: InputDefinition;

    ae: InputDefinition;
    af: InputDefinition;
    ag: InputDefinition;
    ah: InputDefinition;
    ai: InputDefinition;
    aj: InputDefinition;
    ak: InputDefinition;
    al: InputDefinition;
    am: InputDefinition;

    an: InputDefinition;
    ao: InputDefinition;
    ap: InputDefinition;
    aq: InputDefinition;
    ar: InputDefinition;
    as: InputDefinition;
    at: InputDefinition;
    au: InputDefinition;
    av: InputDefinition;

    aw: InputDefinition;
    ax: InputDefinition;
    ay: InputDefinition;
    az: InputDefinition;
    ba: InputDefinition;
    bb: InputDefinition;
    bc: InputDefinition;
    bd: InputDefinition;
    be: InputDefinition;
    bf: InputDefinition;
    bg: InputDefinition;
    bh: InputDefinition;

    bi: InputDefinition;
    bj: InputDefinition;
    bk: InputDefinition;
    bl: InputDefinition;
    bm: InputDefinition;
    bn: InputDefinition;
    bo: InputDefinition;
    bp: InputDefinition;
    bq: InputDefinition;

    br: InputDefinition;
    bs: InputDefinition;
    bt: InputDefinition;
    bu: InputDefinition;
    bv: InputDefinition;
    bw: InputDefinition;
    bx: InputDefinition;
    by: InputDefinition;
    bz: InputDefinition;
  };
};

const formDefinition = {
  inputs: {
    a: { element: "textarea" }, // string
    b: { element: "textarea", multiple: undefined }, // string
    c: { element: "textarea", multiple: true }, // string[]

    d: { element: "select" }, // string
    e: { element: "select", multiple: undefined }, // string
    f: { element: "select", multiple: true }, // string[]
    g: { element: "select", validationAttrs: undefined }, // string
    h: { element: "select", multiple: undefined, validationAttrs: undefined }, // string
    i: { element: "select", multiple: true, validationAttrs: undefined }, // string[]
    j: { element: "select", validationAttrs: {} }, // string
    k: { element: "select", multiple: undefined, validationAttrs: {} }, // string
    l: { element: "select", multiple: true, validationAttrs: {} }, // string[]
    m: { element: "select", validationAttrs: { multiple: undefined } }, // string
    n: {
      element: "select",
      multiple: undefined,
      validationAttrs: { multiple: undefined },
    }, // string
    o: {
      element: "select",
      multiple: true,
      validationAttrs: { multiple: undefined },
    }, // string[]
    p: { element: "select", validationAttrs: { multiple: true } }, // string[]
    q: {
      element: "select",
      multiple: undefined,
      validationAttrs: { multiple: true },
    }, // string[]
    r: {
      element: "select",
      multiple: true,
      validationAttrs: { multiple: true },
    }, // string[]

    s: {}, // string
    t: { multiple: undefined }, // string
    u: { multiple: true }, // string[]
    v: { validationAttrs: undefined }, // string
    w: { multiple: undefined, validationAttrs: undefined }, // string
    x: { multiple: true, validationAttrs: undefined }, // string[]
    y: { validationAttrs: {} }, // string
    z: { multiple: undefined, validationAttrs: {} }, // string
    aa: { multiple: true, validationAttrs: {} }, // string[]
    ab: { validationAttrs: { type: undefined } }, // string
    ac: { multiple: undefined, validationAttrs: { type: undefined } }, // string
    ad: { multiple: true, validationAttrs: { type: undefined } }, // string[]

    ae: { validationAttrs: { type: "checkbox" } }, // string[] | null
    af: { multiple: undefined, validationAttrs: { type: "checkbox" } }, // string[] | null
    ag: { multiple: true, validationAttrs: { type: "checkbox" } }, // string[] | null
    ah: { validationAttrs: { type: "checkbox", required: undefined } }, // string[] | null
    ai: {
      multiple: undefined,
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    aj: {
      multiple: true,
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    ak: { validationAttrs: { type: "checkbox", required: true } }, // string[]
    al: {
      multiple: undefined,
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]
    am: {
      multiple: true,
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]

    an: { validationAttrs: { type: "email" } }, // string
    ao: { multiple: undefined, validationAttrs: { type: "email" } }, // string
    ap: { multiple: true, validationAttrs: { type: "email" } }, // string[]
    aq: { validationAttrs: { type: "email", multiple: undefined } }, // string
    ar: {
      multiple: undefined,
      validationAttrs: { type: "email", multiple: undefined },
    }, // string
    as: {
      multiple: true,
      validationAttrs: { type: "email", multiple: undefined },
    }, // string[]
    at: { validationAttrs: { type: "email", multiple: true } }, // string[]
    au: {
      multiple: undefined,
      validationAttrs: { type: "email", multiple: true },
    }, // string[]
    av: { multiple: true, validationAttrs: { type: "email", multiple: true } }, // string[]

    aw: { element: "input" }, // string
    ax: { element: "input", multiple: undefined }, // string
    ay: { element: "input", multiple: true }, // string[]
    az: { element: "input", validationAttrs: undefined }, // string
    ba: { element: "input", multiple: undefined, validationAttrs: undefined }, // string
    bb: { element: "input", multiple: true, validationAttrs: undefined }, // string[]
    bc: { element: "input", validationAttrs: {} }, // string
    bd: { element: "input", multiple: undefined, validationAttrs: {} }, // string
    be: { element: "input", multiple: true, validationAttrs: {} }, // string[]
    bf: { element: "input", validationAttrs: { type: undefined } }, // string
    bg: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: undefined },
    }, // string
    bh: {
      element: "input",
      multiple: true,
      validationAttrs: { type: undefined },
    }, // string[]

    bi: { element: "input", validationAttrs: { type: "checkbox" } }, // string[] | null
    bj: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "checkbox" },
    }, // string[] | null
    bk: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "checkbox" },
    }, // string[] | null
    bl: {
      element: "input",
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    bm: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    bn: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    bo: {
      element: "input",
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]
    bp: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]
    bq: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]

    br: { element: "input", validationAttrs: { type: "email" } }, // string
    bs: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "email" },
    }, // string
    bt: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "email" },
    }, // string[]
    bu: {
      element: "input",
      validationAttrs: { type: "email", multiple: undefined },
    }, // string
    bv: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "email", multiple: undefined },
    }, // string
    bw: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "email", multiple: undefined },
    }, // string[]
    bx: {
      element: "input",
      validationAttrs: { type: "email", multiple: true },
    }, // string[]
    by: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "email", multiple: true },
    }, // string[]
    bz: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "email", multiple: true },
    }, // string[]
  },
} satisfies FormSchema;

export const action = async ({ request }: ActionArgs) => {
  const serverFormInfo = await validateServerFormData(
    await request.formData(),
    formDefinition
  );

  type Expected = {
    a: string;
    b: string;
    c: string[];

    d: string;
    e: string;
    f: string[];
    g: string;
    h: string;
    i: string[];
    j: string;
    k: string;
    l: string[];
    m: string;
    n: string;
    o: string[];
    p: string[];
    q: string[];
    r: string[];

    s: string;
    t: string;
    u: string[];
    v: string;
    w: string;
    x: string[];
    y: string;
    z: string;
    aa: string[];
    ab: string;
    ac: string;
    ad: string[];

    ae: string[] | null;
    af: string[] | null;
    ag: string[] | null;
    ah: string[] | null;
    ai: string[] | null;
    aj: string[] | null;
    ak: string[];
    al: string[];
    am: string[];

    an: string;
    ao: string;
    ap: string[];
    aq: string;
    ar: string;
    as: string[];
    at: string[];
    au: string[];
    av: string[];

    aw: string;
    ax: string;
    ay: string[];
    az: string;
    ba: string;
    bb: string[];
    bc: string;
    bd: string;
    be: string[];
    bf: string;
    bg: string;
    bh: string[];

    bi: string[] | null;
    bj: string[] | null;
    bk: string[] | null;
    bl: string[] | null;
    bm: string[] | null;
    bn: string[] | null;
    bo: string[];
    bp: string[];
    bq: string[];

    br: string;
    bs: string;
    bt: string[];
    bu: string;
    bv: string;
    bw: string[];
    bx: string[];
    by: string[];
    bz: string[];
  };

  expectEqual<typeof serverFormInfo.submittedValues, Expected>({});
};

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;
const expectEqual = <A, B>(
  ...args: Equal<A, B> extends true
    ? [{}]
    : [{ error: `Not equal`; A: A; B: B }]
): void => {};