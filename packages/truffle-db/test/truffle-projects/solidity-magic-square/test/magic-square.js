const MagicSquare = artifacts.require("MagicSquare");

const squareValueBounds = n => {
  return {
    low: 1,
    high: n * n
  };
};

const squareTotalSum = n => {
  const { low, high } = squareValueBounds(n);

  const upperSum = (high * (high + 1)) / 2;
  const lowerSum = (low * (low - 1)) / 2; // below low

  return upperSum - lowerSum;
};

const squareSum = n => squareTotalSum(n) / n;

contract("MagicSquare", () => {
  it("generates a valid magic square", async () => {
    const instance = await MagicSquare.deployed();

    // generate
    await instance.generateMagicSquare(3);

    // read square from contract
    const square = await instance.getSquare();

    // compute expected sum
    expectedSum = squareSum(square.n);

    // build helper array of row/col indexes
    const indexes = [...Array(parseInt(square.n)).keys()]; // helper: [0, ..., n]

    const rows = square.rows.map(row => row.map(item => parseInt(item)));
    const cols = indexes.map(index => rows.map(row => parseInt(row[index])));
    const diags = [
      indexes.map(index => rows[index][index]),
      indexes.map(index => rows[square.n - index - 1][index])
    ];

    // rows
    for (let [index, row] of rows.entries()) {
      const sum = row.reduce((a, b) => a + b);
      assert.equal(
        sum,
        expectedSum,
        `row ${index} (${JSON.stringify(row)}) sums incorrectly`
      );
    }

    // cols
    for (let [index, col] of cols.entries()) {
      const sum = col.reduce((a, b) => a + b);
      assert.equal(
        sum,
        expectedSum,
        `col ${index} (${JSON.stringify(col)}) sums incorrectly`
      );
    }

    // diags
    for (let [index, diag] of diags.entries()) {
      const sum = diag.reduce((a, b) => a + b);
      assert.equal(
        sum,
        expectedSum,
        `diag ${index} (${JSON.stringify(diag)}) sums incorrectly`
      );
    }
  });
});
