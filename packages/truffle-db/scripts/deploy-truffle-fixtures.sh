#! /usr/bin/env bash
set -e

function bummer {
  printf "Well, this is unexpected :/\n"
  printf "Try running with set -ex to debug...\n\n\n"
}
trap bummer ERR

projects="test/truffle-projects"
for proj in `ls $projects`; do
  echo "truffle migrate --reset $proj"
  result=$(cd "$projects/$proj"; truffle migrate --reset)
  printf "$result"
done
