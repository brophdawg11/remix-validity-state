import type {
  InputDefinition,
  SelectDefinition,
  TextAreaDefinition,
} from "../../src";
import { validateServerFormData } from "../../src";
import type { ActionArgs } from "@remix-run/node";

type FormSchema = {
  inputs: {
    a: TextAreaDefinition;
    b: TextAreaDefinition;
    c: TextAreaDefinition;
    d: TextAreaDefinition;

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
    s: SelectDefinition;
    t: SelectDefinition;
    u: SelectDefinition;
    v: SelectDefinition;
    w: SelectDefinition;
    x: SelectDefinition;
    y: SelectDefinition;
    z: SelectDefinition;
    aa: SelectDefinition;

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
    ca: InputDefinition;
    cb: InputDefinition;
    cc: InputDefinition;
    cd: InputDefinition;

    ce: InputDefinition;
    cf: InputDefinition;
    cg: InputDefinition;
    ch: InputDefinition;
    ci: InputDefinition;
    cj: InputDefinition;
    ck: InputDefinition;
    cl: InputDefinition;
    cm: InputDefinition;
    cn: InputDefinition;
    co: InputDefinition;
    cp: InputDefinition;
    cq: InputDefinition;
    cr: InputDefinition;
    cs: InputDefinition;
    ct: InputDefinition;

    cu: InputDefinition;
    cv: InputDefinition;
    cw: InputDefinition;
    cx: InputDefinition;
    cy: InputDefinition;
    cz: InputDefinition;
    da: InputDefinition;
    db: InputDefinition;
    dc: InputDefinition;
    dd: InputDefinition;
    de: InputDefinition;
    df: InputDefinition;
    dg: InputDefinition;
    dh: InputDefinition;
    di: InputDefinition;
  };
};

const formDefinition = {
  inputs: {
    a: { element: "textarea" }, // string
    b: { element: "textarea", multiple: undefined }, // string
    c: { element: "textarea", multiple: false }, // string
    d: { element: "textarea", multiple: true }, // string[]

    e: { element: "select" }, // string
    f: { element: "select", multiple: undefined }, // string
    g: { element: "select", multiple: false }, // string
    h: { element: "select", multiple: true }, // string[]
    i: { element: "select", validationAttrs: undefined }, // string
    j: { element: "select", multiple: undefined, validationAttrs: undefined }, // string
    k: { element: "select", multiple: false, validationAttrs: undefined }, // string
    l: { element: "select", multiple: true, validationAttrs: undefined }, // string[]
    m: { element: "select", validationAttrs: {} }, // string
    n: { element: "select", multiple: undefined, validationAttrs: {} }, // string
    o: { element: "select", multiple: false, validationAttrs: {} }, // string
    p: { element: "select", multiple: true, validationAttrs: {} }, // string[]
    q: { element: "select", validationAttrs: { multiple: undefined } }, // string
    r: { element: "select", validationAttrs: { multiple: false } }, // string
    s: {
      element: "select",
      multiple: undefined,
      validationAttrs: { multiple: undefined },
    }, // string
    t: {
      element: "select",
      multiple: undefined,
      validationAttrs: { multiple: false },
    }, // string
    u: {
      element: "select",
      multiple: false,
      validationAttrs: { multiple: undefined },
    }, // string
    v: {
      element: "select",
      multiple: false,
      validationAttrs: { multiple: false },
    }, // string
    w: {
      element: "select",
      multiple: true,
      validationAttrs: { multiple: undefined },
    }, // string[]
    x: { element: "select", validationAttrs: { multiple: true } }, // string[]
    y: {
      element: "select",
      multiple: undefined,
      validationAttrs: { multiple: true },
    }, // string[]
    z: {
      element: "select",
      multiple: false,
      validationAttrs: { multiple: true },
    }, // string[]
    aa: {
      element: "select",
      multiple: true,
      validationAttrs: { multiple: true },
    }, // string[]

    ab: {}, // string
    ac: { multiple: undefined }, // string
    ad: { multiple: true }, // string[]
    ae: { validationAttrs: undefined }, // string
    af: { multiple: undefined, validationAttrs: undefined }, // string
    ag: { multiple: true, validationAttrs: undefined }, // string[]
    ah: { validationAttrs: {} }, // string
    ai: { multiple: undefined, validationAttrs: {} }, // string
    aj: { multiple: true, validationAttrs: {} }, // string[]
    ak: { validationAttrs: { type: undefined } }, // string
    al: { multiple: undefined, validationAttrs: { type: undefined } }, // string
    am: { multiple: true, validationAttrs: { type: undefined } }, // string[]

    an: { validationAttrs: { type: "checkbox" } }, // string[] | null
    ao: { multiple: undefined, validationAttrs: { type: "checkbox" } }, // string[] | null
    ap: { multiple: false, validationAttrs: { type: "checkbox" } }, // string[] | null
    aq: { multiple: true, validationAttrs: { type: "checkbox" } }, // string[] | null
    ar: { validationAttrs: { type: "checkbox", required: undefined } }, // string[] | null
    as: { validationAttrs: { type: "checkbox", required: false } }, // string[] | null
    at: {
      multiple: undefined,
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    au: {
      multiple: undefined,
      validationAttrs: { type: "checkbox", required: false },
    }, // string[] | null
    av: {
      multiple: false,
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    aw: {
      multiple: false,
      validationAttrs: { type: "checkbox", required: false },
    }, // string[] | null
    ax: {
      multiple: true,
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    ay: {
      multiple: true,
      validationAttrs: { type: "checkbox", required: false },
    }, // string[] | null
    az: { validationAttrs: { type: "checkbox", required: true } }, // string[]
    ba: {
      multiple: undefined,
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]
    bb: {
      multiple: false,
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]
    bc: {
      multiple: true,
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]

    bd: { validationAttrs: { type: "email" } }, // string
    be: { multiple: undefined, validationAttrs: { type: "email" } }, // string
    bf: { multiple: false, validationAttrs: { type: "email" } }, // string
    bg: { multiple: true, validationAttrs: { type: "email" } }, // string[]
    bh: { validationAttrs: { type: "email", multiple: undefined } }, // string
    bi: { validationAttrs: { type: "email", multiple: false } }, // string
    bj: {
      multiple: undefined,
      validationAttrs: { type: "email", multiple: undefined },
    }, // string
    bk: {
      multiple: undefined,
      validationAttrs: { type: "email", multiple: false },
    }, // string
    bl: {
      multiple: false,
      validationAttrs: { type: "email", multiple: undefined },
    }, // string
    bm: {
      multiple: false,
      validationAttrs: { type: "email", multiple: false },
    }, // string
    bn: {
      multiple: true,
      validationAttrs: { type: "email", multiple: undefined },
    }, // string[]
    bo: { validationAttrs: { type: "email", multiple: true } }, // string[]
    bp: {
      multiple: undefined,
      validationAttrs: { type: "email", multiple: true },
    }, // string[]
    bq: {
      multiple: false,
      validationAttrs: { type: "email", multiple: true },
    }, // string[]
    br: { multiple: true, validationAttrs: { type: "email", multiple: true } }, // string[]

    bs: { element: "input" }, // string
    bt: { element: "input", multiple: undefined }, // string
    bu: { element: "input", multiple: true }, // string[]
    bv: { element: "input", validationAttrs: undefined }, // string
    bw: { element: "input", multiple: undefined, validationAttrs: undefined }, // string
    bx: { element: "input", multiple: true, validationAttrs: undefined }, // string[]
    by: { element: "input", validationAttrs: {} }, // string
    bz: { element: "input", multiple: undefined, validationAttrs: {} }, // string
    ca: { element: "input", multiple: true, validationAttrs: {} }, // string[]
    cb: { element: "input", validationAttrs: { type: undefined } }, // string
    cc: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: undefined },
    }, // string
    cd: {
      element: "input",
      multiple: true,
      validationAttrs: { type: undefined },
    }, // string[]

    ce: { element: "input", validationAttrs: { type: "checkbox" } }, // string[] | null
    cf: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "checkbox" },
    }, // string[] | null
    cg: {
      element: "input",
      multiple: false,
      validationAttrs: { type: "checkbox" },
    }, // string[] | null
    ch: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "checkbox" },
    }, // string[] | null
    ci: {
      element: "input",
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    cj: {
      element: "input",
      validationAttrs: { type: "checkbox", required: false },
    }, // string[] | null
    ck: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    cl: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "checkbox", required: false },
    }, // string[] | null
    cm: {
      element: "input",
      multiple: false,
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    cn: {
      element: "input",
      multiple: false,
      validationAttrs: { type: "checkbox", required: false },
    }, // string[] | null
    co: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "checkbox", required: undefined },
    }, // string[] | null
    cp: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "checkbox", required: false },
    }, // string[] | null
    cq: {
      element: "input",
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]
    cr: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]
    cs: {
      element: "input",
      multiple: false,
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]
    ct: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "checkbox", required: true },
    }, // string[]

    cu: { element: "input", validationAttrs: { type: "email" } }, // string
    cv: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "email" },
    }, // string
    cw: {
      element: "input",
      multiple: false,
      validationAttrs: { type: "email" },
    }, // string
    cx: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "email" },
    }, // string[]
    cy: {
      element: "input",
      validationAttrs: { type: "email", multiple: undefined },
    }, // string
    cz: {
      element: "input",
      validationAttrs: { type: "email", multiple: false },
    }, // string
    da: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "email", multiple: undefined },
    }, // string
    db: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "email", multiple: false },
    }, // string
    dc: {
      element: "input",
      multiple: false,
      validationAttrs: { type: "email", multiple: undefined },
    }, // string
    dd: {
      element: "input",
      multiple: false,
      validationAttrs: { type: "email", multiple: false },
    }, // string
    de: {
      element: "input",
      multiple: true,
      validationAttrs: { type: "email", multiple: undefined },
    }, // string[]
    df: {
      element: "input",
      validationAttrs: { type: "email", multiple: true },
    }, // string[]
    dg: {
      element: "input",
      multiple: undefined,
      validationAttrs: { type: "email", multiple: true },
    }, // string[]
    dh: {
      element: "input",
      multiple: false,
      validationAttrs: { type: "email", multiple: true },
    }, // string[]
    di: {
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
    c: string;
    d: string[];

    e: string;
    f: string;
    g: string;
    h: string[];
    i: string;
    j: string;
    k: string;
    l: string[];
    m: string;
    n: string;
    o: string;
    p: string[];
    q: string;
    r: string;
    s: string;
    t: string;
    u: string;
    v: string;
    w: string[];
    x: string[];
    y: string[];
    z: string[];
    aa: string[];

    ab: string;
    ac: string;
    ad: string[];
    ae: string;
    af: string;
    ag: string[];
    ah: string;
    ai: string;
    aj: string[];
    ak: string;
    al: string;
    am: string[];

    an: string[] | null;
    ao: string[] | null;
    ap: string[] | null;
    aq: string[] | null;
    ar: string[] | null;
    as: string[] | null;
    at: string[] | null;
    au: string[] | null;
    av: string[] | null;
    aw: string[] | null;
    ax: string[] | null;
    ay: string[] | null;
    az: string[];
    ba: string[];
    bb: string[];
    bc: string[];

    bd: string;
    be: string;
    bf: string;
    bg: string[];
    bh: string;
    bi: string;
    bj: string;
    bk: string;
    bl: string;
    bm: string;
    bn: string[];
    bo: string[];
    bp: string[];
    bq: string[];
    br: string[];

    bs: string;
    bt: string;
    bu: string[];
    bv: string;
    bw: string;
    bx: string[];
    by: string;
    bz: string;
    ca: string[];
    cb: string;
    cc: string;
    cd: string[];

    ce: string[] | null;
    cf: string[] | null;
    cg: string[] | null;
    ch: string[] | null;
    ci: string[] | null;
    cj: string[] | null;
    ck: string[] | null;
    cl: string[] | null;
    cm: string[] | null;
    cn: string[] | null;
    co: string[] | null;
    cp: string[] | null;
    cq: string[];
    cr: string[];
    cs: string[];
    ct: string[];

    cu: string;
    cv: string;
    cw: string;
    cx: string[];
    cy: string;
    cz: string;
    da: string;
    db: string;
    dc: string;
    dd: string;
    de: string[];
    df: string[];
    dg: string[];
    dh: string[];
    di: string[];
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
