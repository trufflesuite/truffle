import React, { useState } from "react";
import { Box } from "ink";
import { UserInput } from "../UserInput";
import { Splash } from "../../decodeAddress";

type AddressProps = {
  config: any;
  db: any;
  project: any;
};

export const Address = ({ config, db, project }: AddressProps) => {
  const [address, setAddress] = useState<string | undefined>();

  return (
    <Box flexDirection={"column"}>
      <UserInput
        description={"Address"}
        onSubmit={setAddress}
        enabled={!address}
        display={!address}
      />

      {address && (
        <Splash config={config} db={db} project={project} address={address} />
      )}
    </Box>
  );
};
