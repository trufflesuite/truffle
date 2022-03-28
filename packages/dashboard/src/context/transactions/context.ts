import React from "react";
import { TransactionState } from "src/context/transactions/types";

export const TransactionContext = React.createContext<TransactionState>({});
