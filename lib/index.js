'use strict'
const execSync = require('child_process').execSync
const path = require('path')
const fs = require('fs-extra')
const co = require('co')
const lockjs = require('commander')
const boot = require('./boot')
const lock = require('./lock')
const install = require('./install')
const utils = require('./utils')
const pkg = require('../package')

lockjs.version(pkg.version)

lockjs
  .command('pack <projectPath> <entryPoint> <dest>')
  .description('pack specified node.js project')
  .action(function (projectPath, entryPoint, dest) {
    co(lock(projectPath, dest, entryPoint)).catch(console.error)
  })

lockjs
  .command('gen <packedProject> <dest> <publicKey> [version]')
  .description('generate a executable file from packed node.js project')
  .action(function (packedProject, dest, publicKey, version) {
    co(function * () {
      version = yield installLib(version || 'latest')

      execSync(`${path.resolve(__dirname, '../node_modules')}/.bin/node-gyp configure`)

      let gypiConfig = fs.readFileSync(path.resolve(__dirname, '../build/config.gypi'), 'utf8')

      let headersDir = `${JSON.parse(gypiConfig.slice(gypiConfig.indexOf('{'))).variables.nodedir}/include/node`

      let sharedLibDir = path.resolve(__dirname, `../shared-libs/${version}`)

      boot(packedProject, publicKey, dest, headersDir, sharedLibDir)
    }).catch(console.error)
  })

lockjs
  .command('install <version>')
  .description('install specified node.js shared library')
  .action(function (version) {
    co(installLib(version)).catch(console.error)
  })

lockjs.parse(process.argv)

function * installLib (version) {
  let versionsMap = yield utils.getLibVersionsMap()
  if (version === 'latest') version = versionsMap.latest

  if (!~Object.keys(versionsMap).indexOf(version)) throw new Error(`unsupport version: ${version}`)

  return yield install(versionsMap[version])
}
