import type { MouseEventHandler } from "react";

interface Props {
  disabled?: boolean;
  onClick: MouseEventHandler<HTMLElement>;
  text: string;
}

function Button({ disabled, onClick, text }: Props) {
  return (
    <button
      disabled={disabled}
      className="rounded p-4 mx-2 bg-truffle-blue text-truffle-brown uppercase hover:bg-white"
      onClick={onClick}
    >
      {text}
    </button>
  );
}

export default Button;
