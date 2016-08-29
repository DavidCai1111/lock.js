# lock.js
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Build Status](https://travis-ci.org/DavidCai1993/lock.js.svg?branch=master)](https://travis-ci.org/DavidCai1993/lock.js)

Lock your Node.js project into an executable.

## Installation

```
npm install -g lockjs
```

## Feature

- One binary executable.
- Capable to handle the C++ addons.
- Capable to handle the a lot `fs` methods which not use file descriptor.
- Always run with the latest Node.js. (link the shared library at compiling time)

## Quick Start

Create a locked project and get a public key by specifying the path and entry point of it:

```
$ lockjs lock path/to/project path/to/project/lib/index.js ./project.locked

// ....
// [lockjs] Locked file: "project.locked".
// [lockjs] Key: "yourPublicKey".
```

Create an executable from the locked project and its public key:

```
$ lockjs gen ./project.locked ./app.o yourPublicKey
```

Rock and roll:

```
$ ./app.o
```

## Support Platform

- Mac OS X
- Linux 64 bit
- Linux 32 bit

## Environment Requiered

- clang
- Node.js > 4

## Help

```
Usage: lockjs [options] [command]

Commands:

  lock <projectPath> <entryPoint> <dest>  lock specified node.js project and generate a public key
  gen <packedProject> <dest> <publicKey>  generate a executable from the locked and the public key
  install                                 install latest node.js header files and shared library

Options:

  -h, --help     output usage information
  -V, --version  output the version number
```
