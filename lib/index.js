'use strict'
const execSync = require('child_process').execSync
const path = require('path')
const fs = require('fs-extra')
const co = require('co')
const lockjs = require('commander')
const pkg = require('../package')
const boot = require('./boot')
const lock = require('./lock')

lockjs.version(pkg.version)

lockjs
  .command('pack <projectPath> <entryPoint> <dest>')
  .description('pack specified node.js project')
  .action(function (projectPath, entryPoint, dest) {
    co(lock.bind(projectPath, entryPoint, dest)).catch(console.error)
  })

lockjs
  .command('gen <packedProject> <dest> <publicKey> [libnodePath]')
  .description('generate a executable file from packed node.js project')
  .action(function (packedProject, dest, publicKey, libnodePath) {
    execSync(`${path.resolve(__dirname, `..${path.sep}node_modules`)}${path.sep}.bin${path.sep}node-gyp configure --silent`)

    let gypiConfig = fs.readFileSync(path.resolve(__dirname, `..${path.sep}build${path.sep}config.gypi`), 'utf8')

    let headersDir = `${JSON.parse(gypiConfig.slice(gypiConfig.indexOf('{'))).variables.nodedir}${path.sep}include${path.sep}node`

    boot(packedProject, publicKey, dest, headersDir)
  })

lockjs.parse(process.argv)
