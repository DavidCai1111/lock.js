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

  let libName = utils.generateSharedLibraryName(modulesVersion)
  let dest = path.resolve(cacheDir, version)

  console.log(`[${pkg.name}] Try to find node.js (version: ${version}) headers and library in cache...`)

  if (utils.exists(`${dest}/shared/${libName}`) && utils.exists(`${dest}/node-v${version}/include/node/node.h`)) {
    console.log(`[${pkg.name}] Find in cache.`)
    return version
  }

  fs.removeSync(`${dest}/${version}`)

  console.log(`[${pkg.name}] Can not find in cache.`)

  // header files
  console.log(`[${pkg.name}] Start download headers.`)

  yield utils.download(`https://nodejs.org/dist/latest/node-v${version}-headers.tar.gz`, dest, 'headers.tar.gz')

  // shared library
  console.log(`[${pkg.name}] Start download library.`)

  let baseUrl = `https://github.com/DavidCai1993/node-shared-libs/raw/master/${version}`
  dest = `${dest}/shared`

  if (process.platform === 'darwin') {
    yield utils.download(`${baseUrl}/darwin/${libName}.tar.gz`, dest, `${libName}.tar.gz`)
  } else {
    if (process.arch === 'x64') {
      yield utils.download(`${baseUrl}/linux/x64/${libName}.tar.gz`, dest, `${libName}.tar.gz`)
    } else if (process.arch === 'x86') {
      yield utils.download(`${baseUrl}/linux/x86/${libName}.tar.gz`, dest, `${libName}.tar.gz`)
    } else {
      throw new Error(`unsupport linux arch: ${process.arch}, only support ${pkg.cpu} now.`)
    }
  }

  console.log(`[${pkg.name}] Install complete.`)

  return version
}
