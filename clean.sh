#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -d "$DIR/_compiled" ]; then
	echo Clearing $DIR/_compiled...
	rm -rf $DIR/_compiled
fi

if [ -d "$DIR/coverage" ]; then
	echo Clearing $DIR/coverage...
	rm -rf $DIR/coverage/*
fi