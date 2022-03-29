import type { MouseEventHandler } from "react";

interface Props {
  disabled?: boolean;
  onClick: MouseEventHandler<HTMLElement>;
  text: string;
}

function Button({ disabled, onClick, text }: Props) {
  return (
    <button
      className={
        "rounded p-2 " + (disabled ? "" : "bg-truffle-blue") +
          " text-truffle-brown uppercase hover:bg-white"
      }
      disabled={disabled}
      onClick={onClick}
    >
      {text}
    </button>
  );
}

export default Button;
