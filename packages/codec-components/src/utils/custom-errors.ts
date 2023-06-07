export class ComponentDataTypeIsNeverError extends Error {
  constructor(dataType: string) {
    super(
      `${dataType} is of type \`never\`. The corresponding component should not be used.`
    );
    this.name = "ComponentDataTypeIsNeverError";
  }
}
