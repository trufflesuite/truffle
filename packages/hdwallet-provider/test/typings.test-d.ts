import { expectType } from "tsd";
import HDWalletProvider from "../dist/index";

expectType<HDWalletProvider>(new HDWalletProvider("", ""));
