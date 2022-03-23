import type { MouseEventHandler } from "react";

interface Props {
  onClick: MouseEventHandler<HTMLElement>;
  text: string;
  disabled?: boolean;
}

function Button({ onClick, text, disabled = false }: Props) {
  return (
    <button
      className="rounded p-2 bg-truffle-blue text-truffle-brown uppercase hover:bg-white"
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
}

export default Button;
