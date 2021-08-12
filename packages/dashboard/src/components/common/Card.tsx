import { ReactNode } from "react";

interface Props {
  header?: string | ReactNode;
  body?: string | ReactNode | ReactNode[];
  footer?: string | ReactNode;
}

function Card({ header, body, footer }: Props) {
  const headerOrNull = header && (
    <div className="">
      <h2 className="text-center mb-1">{header}</h2>
      <hr />
    </div>
  );

  const bodyOrNull = body && (
    <div className="m-2">
      {body}
    </div>
  );

  const footerOrNull = footer && (
    <div className="">
      <hr className="mb-1" />
      {footer}
    </div>
  );

  return (
    <div className="border-grey border rounded p-2 w-3/4 max-w-4xl h-2/3 bg-white">
      {headerOrNull}
      {bodyOrNull}
      {footerOrNull}
    </div>
  );
}

export default Card;
