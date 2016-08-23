'use strict'
const execSync = require('child_process').execSync
const path = require('path')
const fs = require('fs-extra')
const co = require('co')
const lockjs = require('commander')
const boot = require('./boot')
const lock = require('./lock')
const install = require('./install')
const pkg = require('../package')

lockjs.version(pkg.version)

lockjs
  .command('pack <projectPath> <entryPoint> <dest>')
  .description('pack specified node.js project')
  .action(function (projectPath, entryPoint, dest) {
    co(lock(projectPath, dest, entryPoint)).catch((error) => console.error(error.stack))
  })

lockjs
  .command('gen <packedProject> <dest> <publicKey>')
  .description('generate a executable file from packed node.js project')
  .action(function (packedProject, dest, publicKey) {
    co(function * () {
      let version = yield install()

      // TODO: Remove node-gyp
      execSync(`${path.resolve(__dirname, '../node_modules')}/.bin/node-gyp configure`)
      let gypiConfig = fs.readFileSync(path.resolve(__dirname, '../build/config.gypi'), 'utf8')
      let headersDir = `${JSON.parse(gypiConfig.slice(gypiConfig.indexOf('{'))).variables.nodedir}/include/node`

      let sharedLibDir = path.resolve(__dirname, `../shared-libs/${version}`)

      boot(packedProject, publicKey, dest, headersDir, sharedLibDir)
    }).catch(console.error)
  })

lockjs
  .command('install')
  .description('install latest node.js shared library')
  .action(function () { co(install()).catch(console.error) })

lockjs.parse(process.argv)
