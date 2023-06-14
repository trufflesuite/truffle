import React from "react";
import { createCommonComponent } from "../../utils/create-common-component";
import { useBracketDepth } from "../../contexts/bracket-depth";
import { useClassNamePrefix } from "../../contexts/class-name-prefix";
import { useColors } from "../../contexts/colors";
import styles from "./code.module.scss";

export type CodeProps = {
  children: React.ReactNode;
  type?:
    | "address"
    | "boolean"
    | "bytes"
    | "number"
    | "string"
    | "enum"
    | "struct"
    | "new-keyword"
    | "contract"
    | "function"
    | "event"
    | "event-keyword"
    | "anonymous-keyword"
    | "error"
    | "revert-keyword"
    | "bracket"
    | "name"
    | "colon"
    | "comma"
    | "period"
    | "default";
} & React.HTMLAttributes<HTMLSpanElement>;

export const { Code } = createCommonComponent(
  "Code",
  ({ children, type, ...props }) => {
    type ||= "default";
    const bracketDepth = useBracketDepth();
    const classNamePrefix = useClassNamePrefix();
    const colors = useColors();

    const inlineStyle = {} as React.CSSProperties;
    const classNames = [
      styles["code"],
      undefined,
      `${classNamePrefix}-code`,
      `${classNamePrefix}-code-${type}`
    ];
    if (colors[type]) {
      inlineStyle["color"] =
        type === "bracket"
          ? /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
            colors[type]![bracketDepth % colors[type]!.length] ||
            colors["default"]
          : colors[type];
    } else {
      classNames[1] =
        type === "bracket"
          ? styles[`code-bracket-${bracketDepth % 3}`]
          : styles[`code-${type}`];
    }

    return (
      <span className={classNames.join(" ")} style={inlineStyle} {...props}>
        {children}
      </span>
    );
  }
);
