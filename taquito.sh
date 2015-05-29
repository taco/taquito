#!/bin/bash
REPO=$(basename "$PWD")
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
cd $DIR
node --harmony taquito.js $@ --dir "$REPO"