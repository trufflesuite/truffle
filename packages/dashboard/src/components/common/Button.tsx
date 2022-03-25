import type {MouseEventHandler} from "react";
import {classNames} from "../../functions";

interface Props {
  onClick: MouseEventHandler<HTMLElement>;
  text: string;
  variant?: "sm" | "lg"
}

const STYLES = {
  "sm": "p-1 px-2",
  "lg": "p-4 mx-2 ",
};

function Button({onClick, text, variant = "lg"}: Props) {
  return (
    <button
      className={classNames(
        STYLES[variant],
        "rounded bg-truffle-blue text-truffle-brown uppercase hover:bg-white"
      )}
      onClick={onClick}
    >
      {text}
    </button>
  );
}

export default Button;
