import React, { ReactNode } from "react";
import { classNames } from "src/functions";

export type ButtonColor = "blue" | "red" | "brown" | "default";
export type ButtonSize = "xs" | "sm" | "lg";
export type ButtonVariant = "outlined" | "filled" | "empty";

const DIMENSIONS = {
  xs: "py-1 px-2 h-[28px] !border",
  sm: "py-2 px-2 h-[36px]",
  md: "px-2 h-[52px]",
  lg: "p-2 "
};

const SIZE = {
  xs: "text-xs rounded-xl",
  sm: "text-sm rounded-l",
  lg: "text-lg rounded"
};

const FILLED = {
  default: "rounded bg-truffle-blue uppercase hover:bg-truffle-light",
  blue: "bg-truffle-blue",
  red: "bg-truffle-red text-truffle-lighter hover:text-black",
  brown: "bg-truffle-brown text-truffle-lighter hover:text-black"
};

const OUTLINED = {
  default:
    "border-2 border-truffle-blue disabled:pointer-events-none disabled:opacity-40",
  blue: "border-none text-truffle-blue bg-truffle-blue bg-opacity-20 hover:bg-truffle-blue hover:bg-opacity-40 focus:bg-truffle-blue focus:bg-opacity-40 active:bg-truffle-blue active:bg-opacity-40",
  red: "border-none text-truffle-red bg-truffle-red bg-opacity-20 hover:bg-truffle-red hover:bg-opacity-40 focus:bg-truffle-red focus:bg-opacity-40 active:bg-truffle-red active:bg-opacity-40",
  brown:
    "border-none text-truffle-brown bg-truffle-brown bg-opacity-20 hover:bg-truffle-brown hover:bg-opacity-40 focus:bg-truffle-brown focus:bg-opacity-40 active:bg-truffle-brown active:bg-opacity-40"
};

const EMPTY = {
  default:
    "bg-transparent hover:brightness-[90%] focus:brightness-[90%] active:brightness-[80%] disabled:pointer-events-none disabled:opacity-40",
  blue: "text-truffle-blue",
  red: "text-truffle-red",
  brown: "text-truffle-brown"
};

const VARIANT = {
  outlined: OUTLINED,
  filled: FILLED,
  empty: EMPTY
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  color?: ButtonColor;
  size?: ButtonSize;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      color = "blue",
      size = "lg",
      variant = "filled",
      startIcon = undefined,
      endIcon = undefined,
      fullWidth = false,
      loading,
      disabled,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        {...rest}
        ref={ref}
        disabled={disabled || loading}
        className={classNames(
          VARIANT[variant]["default"],
          // @ts-ignore TYPE NEEDS FIXING
          VARIANT[variant][color],
          // @ts-ignore TYPE NEEDS FIXING
          SIZE[size],
          // @ts-ignore TYPE NEEDS FIXING
          variant !== "empty" ? DIMENSIONS[size] : "",
          fullWidth ? "w-full" : "",
          "mx-2",
          className
        )}
      >
        <>
          {startIcon && startIcon}
          {children}
          {endIcon && endIcon}
        </>
      </button>
    );
  }
);

export default Button;
