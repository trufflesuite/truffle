/**
 * Takes in custom size and stroke for circle color, default to primary color as fill,
 * need ...rest for layered styles on top
 */
export default function Loader({
  size = "16px",
  stroke = "#000000",
  ...rest
}: {
  size?: string;
  stroke?: string;
  [_: string]: any;
}) {
  return (
    <svg
      className="animate-spin"
      style={{ height: size, width: size }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path
        d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 9.27455 20.9097 6.80375 19.1414 5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke={stroke}
      />
    </svg>
  );
}
