'use strict'
const path = require('path')
const fs = require('fs-extra')
const download = require('download')
const utils = require('../lib/utils')
const pkg = require('../package')

const cacheDir = path.resolve(__dirname, '../shared-libs')

module.exports = function * (version) {
  console.log(`[${pkg.name}] Try to find node.js (version: ${version}) shared library in cache...`)

  let dest = path.resolve(cacheDir, version)

  if (utils.exists(dest)) {
    console.log(`[${pkg.name}] Find in cache.`)
    return
  }

  console.log(`[${pkg.name}] Can not find in cache, start downloading...`)

  let baseUrl = `https://github.com/DavidCai1993/node-shared-libs/raw/master/${version}`

  fs.ensureFileSync(dest)
  let destStream = fs.createWriteStream(dest)

  if (process.platform === 'darwin') {
    download(`${baseUrl}/darwin/libnode.48.dylib`).pipe(destStream)
  } else {
    if (process.arch === 'x64') download(`${baseUrl}/linux/x64/libnode.so`).pipe(destStream)
    else if (process.arch === 'x86') download(`${baseUrl}/linux/x86/libnode.so`).pipe(destStream)
    else throw new Error(`unsupport linux arch: ${process.arch}, only support ${pkg.cpu} now.`)
  }

  console.log(`[${pkg.name}] Done.`)
}
