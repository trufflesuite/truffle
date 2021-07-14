type storage = int;

type parameter =
  Increment (int)
| Decrement (int)
| Reset;

type return = (list (operation), storage);

// Two entrypoints

let add = ((store, delta) : (storage, int)) : storage => store + delta;

let sub = ((store, delta) : (storage, int)) : storage => store - delta;

/* Main access point that dispatches to the entrypoints according to
   the smart contract parameter. */

let main = ((action, store) : (parameter, storage)) : return => {
 (([] : list (operation)),    // No operations
 (switch (action) {
  | Increment (n) => add ((store, n))
  | Decrement (n) => sub ((store, n))
  | Reset         => 0}))
};
