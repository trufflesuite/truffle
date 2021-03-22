#!/usr/bin/env node
import "source-map-support/register";
import { start } from "@truffle/db-kit/cli";

async function main() {
  await start();
}

main();
