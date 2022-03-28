// custom.d.ts
import "react";

declare module "react" {
  import React from "react";
  interface StyleHTMLAttributes<T> extends React.HTMLAttributes<T> {
    jsx?: boolean;
    global?: boolean;
  }
}
