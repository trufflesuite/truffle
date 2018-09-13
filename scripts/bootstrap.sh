#!/usr/bin/env bash

# The below ` || exit 1;` is added to stop the script if a command fails

npm run lerna:bootstrap || exit 1;
npm run build:decode-utils || exit 1; # must come before decoder and debugger
npm run build:decoder || exit 1; # must come before debugger
npm run build:debugger || exit 1;