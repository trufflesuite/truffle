Hard work continues on improving the user experience of our Solidity debugger.
Most of the changes here are behind the scenes, but there's a handful of
updates to pinpoint:

{"gitdown": "contents", "maxLevel": 5, "rootId": "user-content-what-s-new-in-truffle-v5-truffle-debug"}

#### Breakpoints

Debugger breakpoints are now a whole lot better! Specify your breakpoints by
file and line number so you can jump ahead to relevant sections of your code.

```
MagicSquare.sol:

11:   event Generated(uint n);
12:
13:   function generateMagicSquare(uint n)
      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

debug(develop:0x91c817a1...)> b SquareLib:5
Breakpoint added at line 5 in SquareLib.sol.

debug(develop:0x91c817a1...)> b +10
Breakpoint added at line 23.

debug(develop:0x91c817a1...)> B +10
Breakpoint removed at line 23.
```

#### Inspect variables at end of trace

The debugger no longer automatically exits when you reach the end of a
transaction! You can now inspect `(v)`ariables when execution finishes. This
can be helpful, since you no longer need to be as careful when stepping
repeatedly!

#### Reset command

Type `r` to reset back to the beginning of the trace! Not much else to say
about that, we're sure you can appreciate that this might come in handy. Enjoy!
