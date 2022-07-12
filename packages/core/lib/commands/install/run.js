module.exports = async function () {
  const emoji = String.fromCodePoint(0x1F61E);
  console.log(
    emoji + " Oops! ethpm has moved on faster than truffle's integration. " +
      "This feature has been broken for some time, so we've disabled it."
  );
};
