import { ReactNode } from "react";

interface Props {
  header?: string | ReactNode;
  body?: string | ReactNode | ReactNode[];
  footer?: string | ReactNode;
}

function Card({ header, body, footer }: Props) {
  const headerOrNull = header && (
    <div className="border-b border-grey py-3 mx-3">
      <h2 className="text-center">{header}</h2>
    </div>
  );

  const bodyOrNull = body && <div className="p-3 overflow-auto">{body}</div>;

  const footerOrNull = footer && (
    <div className="border-t border-grey py-3 mx-3">{footer}</div>
  );

  return (
    <div className="border-grey border rounded bg-white w-full">
      {headerOrNull}
      {bodyOrNull}
      {footerOrNull}
    </div>
  );
}

export default Card;
