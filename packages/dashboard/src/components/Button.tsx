import { MouseEventHandler } from "react";

interface Props {
  onClick: MouseEventHandler<HTMLElement>;
  text: string;
}

function Button({ onClick, text }: Props) {
  return (
    <button className="rounded p-2 bg-truffle-blue text-truffle-brown hover:bg-white" onClick={onClick}>
      {text}
    </button>
  );
}

export default Button;
