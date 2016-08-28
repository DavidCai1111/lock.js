# lock.js
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Lock your Node.js project into an executable.

## Installation

```
npm install -g lockjs
```

## Quick Start

Create a locked project and get a public key:

```
$ lockjs lock path/to/project  path/to/project/lib/index.js ./project.locked

// ....
// [lockjs] Locked file: "project.locked".
// [lockjs] Key: "yourKey".
```

Create an executable from the locked project and its public key:

```
$ lockjs gen ./project.locked ./app.o youKey && ./app.o
```

Rock and roll:

NOTES: The version of Node.js run inside the executable will be the latest one at the time it was created.

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
