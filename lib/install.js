'use strict'
const path = require('path')
const exec = require('child_process').exec
const fs = require('fs-extra')
const utils = require('../lib/utils')
const pkg = require('../package')

const cacheDir = path.resolve(__dirname, '../shared-libs')

module.exports = function * (version) {
  console.log(`[${pkg.name}] Try to find node.js (version: ${version}) shared library in cache...`)

  let dest = path.resolve(cacheDir, version)

  if (utils.exists(dest)) {
    console.log(`[${pkg.name}] Find in cache.`)
    return version
  }

  console.log(`[${pkg.name}] Can not find in cache, start downloading...`)

  let baseUrl = `https://github.com/DavidCai1993/node-shared-libs/raw/master/${version}`

  if (process.platform === 'darwin') {
    yield download(`wget ${baseUrl}/darwin/libnode.48.dylib`, 'libnode.48.dylib')
  } else {
    if (process.arch === 'x64') {
      yield download(`wget ${baseUrl}/linux/x64/libnode.so`, 'libnode.so')
    } else if (process.arch === 'x86') {
      yield download(`wget ${baseUrl}/linux/x86/libnode.so`, 'libnode.so')
    } else {
      throw new Error(`unsupport linux arch: ${process.arch}, only support ${pkg.cpu} now.`)
    }
  }

  console.log(`[${pkg.name}] Done.`)

  return version

  function download (url, fileName) {
    let filePath = `${dest}/${fileName}`

    return new Promise(function (resolve, reject) {
      fs.ensureDirSync(dest)
      let wget = exec(`wget ${url} -O ${filePath}`)

      wget.stderr.pipe(process.stdout)
      wget.on('close', resolve)
      wget.stderr.on('data', (error) => reject(`${error}`))
    })
  }
}
