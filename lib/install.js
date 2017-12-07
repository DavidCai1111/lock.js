'use strict'
const path = require('path')
const fs = require('fs-extra')
const getLatest = require('nodejs-latest').latest
const utils = require('../lib/utils')
const pkg = require('../package')

const cacheDir = path.resolve(__dirname, '../dist')

module.exports = function * () {
  console.log(`[${pkg.name}] Try to get the latest version of node.js...`)

  let latest = yield getLatest()
  let version = latest.version
  let modulesVersion = latest.modules

  let versionsMap = yield utils.getSharedVerisonsMap()

  if (version !== versionsMap.latest) {
    version = versionsMap.latest
    modulesVersion = versionsMap[versionsMap.latest]
  }

  let libName = utils.getSharedName(modulesVersion)
  let dest = path.resolve(cacheDir, version)

  console.log(`[${pkg.name}] Try to find node.js (version: ${version}) headers and library in cache...`)

  if (utils.exists(`${dest}/shared/${libName}`) && utils.exists(`${dest}/node-v${version}/include/node/node.h`)) {
    console.log(`[${pkg.name}] Find in cache.`)
    return version
  }

  console.log(`[${pkg.name}] Can not find in cache.`)
  fs.removeSync(`${dest}/${version}`)

  // header files
  console.log(`[${pkg.name}] Start download headers.`)

  yield utils.download(`https://nodejs.org/dist/v${version}/node-v${version}-headers.tar.gz`, dest, 'headers.tar.gz')

  // shared library
  console.log(`[${pkg.name}] Start download library.`)

  dest = `${dest}/shared`

  yield utils.download(utils.getSharedDownloadUrl(version, libName), dest, `${libName}.tar.gz`)

  if (process.platform !== 'darwin') {
    fs.createSymlinkSync(`${dest}/${libName}.${modulesVersion}`, `${dest}/libnode.so`)
  }

  console.log(`[${pkg.name}] Installation complete.`)

  return version
}
