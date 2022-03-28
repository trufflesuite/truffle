import React, {ReactNode} from "react";
import {classNames} from "src/functions";

export type ButtonColor = 'blue' | 'red' | 'pink' | 'default';
export type ButtonSize =  'xs' | 'sm' | 'lg';
export type ButtonVariant = 'outlined' | 'filled' | 'empty';

const DIMENSIONS = {
  xs: 'py-1 px-2 h-[28px] !border',
  sm: 'py-2 px-3 h-[36px]',
  md: 'px-4 h-[52px]',
  lg: 'p-4 ', // h-[60px]
};

const SIZE: Record<string, string> = {
  "xs": "text-xs rounded-full",
  "sm": "text-sm rounded-full",
  "lg": "text-lg rounded",
};

const FILLED = {
  default: 'rounded bg-truffle-blue text-truffle-brown uppercase hover:bg-white',
  blue: 'bg-truffle-blue',
  red: 'bg-truffle-red text-truffle-lighter',
  pink: 'bg-pink'
};

const OUTLINED = {
  default: 'border-2 disabled:pointer-events-none disabled:opacity-40',
  blue: 'border-none bg-truffle-blue/20 hover:bg-blue/40 active:bg-blue/60 text-blue focus:bg-blue/40',
  red: 'border-none bg-truffle-red/20 hover:bg-truffle-red/40 active:bg-truffle-red/60 text-red focus:bg-truffle-red/40',
  pink: 'border-none bg-pink/20 hover:bg-pink/40 active:bg-pink/60 text-pink focus:bg-pink/40',
};

const EMPTY = {
  default:
    'bg-transparent hover:brightness-[90%] focus:brightness-[90%] active:brightness-[80%] disabled:pointer-events-none disabled:opacity-40',
  blue: 'text-truffle-blue',
  red: 'text-truffle-red',
  pink: 'text-pink',
};

const VARIANT = {
  outlined: OUTLINED,
  filled: FILLED,
  empty: EMPTY,
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  startIcon?: ReactNode
  endIcon?: ReactNode
  color?: ButtonColor
  size?: ButtonSize
  variant?: ButtonVariant
  fullWidth?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      color = 'truffle-blue',
      size = 'lg',
      variant = 'filled',
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
          VARIANT[variant]['default'],
          // @ts-ignore TYPE NEEDS FIXING
          VARIANT[variant][color],
          SIZE[size],
          // @ts-ignore TYPE NEEDS FIXING
          variant !== 'empty' ? DIMENSIONS[size] : '',
          fullWidth ? 'w-full' : '',
          'mx-2',
          //'font-bold flex items-center justify-center gap-1',
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
