'use strict'
const path = require('path')
const cp = require('child_process')
const fs = require('fs-extra')
const utils = require('../lib/utils')
const pkg = require('../package')

const cacheDir = path.resolve(__dirname, '../shared-libs')

module.exports = function * () {
  let versionMap = yield utils.getLibVersionsMap()
  let version = versionMap[versionMap.latest]

  console.log(`[${pkg.name}] Try to find node.js (version: ${version}) shared library in cache...`)

  let dest = path.resolve(cacheDir, version)

  if (utils.exists(dest)) {
    console.log(`[${pkg.name}] Find in cache.`)
    return version
  }

  console.log(`[${pkg.name}] Can not find in cache, start downloading...`)

  let baseUrl = `https://github.com/DavidCai1993/node-shared-libs/raw/master/${version}`

  if (process.platform === 'darwin') {
    yield download(`wget ${baseUrl}/darwin/libnode.48.dylib.tar.gz`, 'libnode.48.dylib.tar.gz')
  } else {
    if (process.arch === 'x64') {
      yield download(`wget ${baseUrl}/linux/x64/libnode.so.tar.gz`, 'libnode.so.tar.gz')
    } else if (process.arch === 'x86') {
      yield download(`wget ${baseUrl}/linux/x86/libnode.so.tar.gz`, 'libnode.so.tar.gz')
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
      let wget = cp.exec(`wget ${url} -O ${filePath}`)

      wget.stdout.pipe(process.stdout)
      wget.stderr.pipe(process.stderr)

      wget.on('close', function (code) {
        console.log(`[${pkg.name}] Download complete, wget code: ${code}.`)

        let currentCwd = process.cwd()
        process.chdir(dest)

        cp.execSync(`tar zxvf ${filePath}`)
        fs.unlinkSync(filePath)

        process.chdir(currentCwd)
      })
    })
  }
}
