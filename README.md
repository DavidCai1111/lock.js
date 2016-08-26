# lock.js
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Lock your Node.js project into an executable.

## Install

```
npm install -g lockjs
```

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

## Quick Start

Create a locked project:

```
$ lockjs lock path/to/project  path/to/project/lib/index.js ./project.locked

// ....
// [lockjs] Locked file: "project.locked".
// [lockjs] Key: "yourKey".
```

Create an executable from the locked project and the generated key:

```
$ lockjs gen ./project.locked ./app.o youKey && ./app.o
```
