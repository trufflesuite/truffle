module.exports = function () {
  const emoji = String.fromCodePoint(0x1f61e);
  console.log(
    "\n  " +
      emoji +
      " Oops! ethpm has moved on faster than truffle's integration. " +
      "\n     This feature has been broken for some time, so we've disabled it. " +
      "\n     Please refer to https://github.com/trufflesuite/truffle/discussions/5293 \n"
  );
};
