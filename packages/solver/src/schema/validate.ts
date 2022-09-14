import Ajv2019 from "ajv/dist/2019";
const ajv = new Ajv2019();

import deploymentSchema from "./declaration.spec.json";

export const validate = deploymentDeclaration => {
  const valid = ajv.validate(deploymentSchema, deploymentDeclaration);
  if (!valid) {
    console.log("Error validating input: " + JSON.stringify(ajv.errors));
  }
  return valid;
};
