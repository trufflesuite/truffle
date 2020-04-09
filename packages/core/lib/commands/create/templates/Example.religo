type storage = unit;

let main = ((p,storage): (unit, storage)) => {
  let storage = unit;
  (([]: list(operation)), storage);
};
