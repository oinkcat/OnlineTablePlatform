#!/bin/sh

# Your path to compiler
COMPILER_PATH='/home/igor/l_compiler/compiler/__init__.py'

python2 $COMPILER_PATH ./main.l ./main.lb

read -p "Press Enter to exit..."