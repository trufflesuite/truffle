import { useState, useEffect } from "react";
import ReactJson from "react-json-view";
const inspect = require("browser-util-inspect");
import * as Codec from "@truffle/codec";
import type { ProjectDecoder } from "@truffle/decoder";

interface Props {
  transaction: any;
  decoder: ProjectDecoder | undefined;
}

export default function Transaction({ transaction, decoder }: Props) {
  const [decoding, setDecoding] = useState<
    Codec.CalldataDecoding | undefined
  >();
  const [showRawTransaction, setShowRawTransaction] = useState<
    boolean | undefined
  >(undefined);

  useEffect(() => {
    if (!decoder) {
      return;
    }

    decoder
      .decodeTransaction({
        blockNumber: null,
        to: transaction.to || null,
        from: transaction.from,
        input: transaction.data,
        value: transaction.value
      })
      .then(decoding => {
        console.debug("decoding %o", decoding);
        if (decoding.kind !== "unknown") {
          setDecoding(
            decoding as any /* TODO please clean up after me, cliffoo */
          );
        }
      });
  }, [transaction, decoder]);

  const decodedTransaction = decoding && (
    <pre>{inspect(new Codec.Export.CalldataDecodingInspector(decoding))}</pre>
  );

  return (
    <div>
      {decodedTransaction}
      <details
        open={showRawTransaction === undefined ? !decoding : showRawTransaction}
        onKeyDown={({ key }) => {
          if ([" ", "return"].includes(key)) {
            setShowRawTransaction(
              showRawTransaction === undefined
                ? !!decoding
                : !showRawTransaction
            );
          }
        }}
        onClick={() => {
          setShowRawTransaction(
            showRawTransaction === undefined ? !!decoding : !showRawTransaction
          );
        }}
      >
        <summary>Raw transaction</summary>

        <ReactJson name="transaction" src={transaction} />
      </details>
    </div>
  );
}
