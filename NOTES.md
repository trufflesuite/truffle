
  - form baseline for workflow tests
  - stretch goal, enable action cache and see if it improves speed
      - this might be a useful workflow to test on windows iff working on a
        specific error
  - restrict test to focus on specific tests to this pr
  - fix changes
  - cherry-pick from windows/runner
      abf8ffb15 Revert "box: make filesystem check x-platform"
      190028b52 Revert "box: update tests"
      de87ba04a box: add cross platform fullpath test
      2bb90175b box: Refactor
      3e7304db4 compile-common: use fs alternative
      df877347a compile-common: Add guard on getKeyFromPath

TODO:

- remove NOTES.md
- [x] box.ts use `isLikelyFilePath` for line 26
- [x] box.ts use remove console.log 
