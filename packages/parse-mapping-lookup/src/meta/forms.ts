export type Forms = {
  [kind: string]: {
    [name: string]: { kind: string } | { kind: string }[] | { type: any };
  };
};

export type FormKind<F extends Forms> = string & keyof F;
export type Form<F extends Forms, K extends FormKind<F>> = F[K];

export type FormFields<F extends Forms, K extends FormKind<F>> = Form<F, K>;

export type FormFieldName<F extends Forms, K extends FormKind<F>> = string &
  keyof FormFields<F, K>;

export type FormField<
  F extends Forms,
  K extends FormKind<F>,
  N extends FormFieldName<F, K>
> = FormFields<F, K>[N];

export type FormFieldKind<
  F extends Forms,
  K extends FormKind<F>,
  _N extends FormFieldName<F, K>,
  T extends any
> = "kind" extends keyof T ? Node<F, T["kind"] & FormKind<F>> : never;

type _FormFieldNode<
  F extends Forms,
  K extends FormKind<F>,
  N extends FormFieldName<F, K>,
  T extends any
> = T extends (infer I)[]
  ? _FormFieldNode<F, K, N, I>[]
  : "type" extends keyof T
  ? T["type"]
  : FormFieldKind<F, K, N, T>;

export type FormFieldNode<
  F extends Forms,
  K extends FormKind<F>,
  N extends FormFieldName<F, K>
> = _FormFieldNode<F, K, N, FormField<F, K, N>>;

export type Node<F extends Forms, K extends FormKind<F>> = { kind: K } & {
  [N in FormFieldName<F, K>]: FormFieldNode<F, K, N>;
};
