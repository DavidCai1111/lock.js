'use strict'
const path = require('path')
const cp = require('child_process')
const fs = require('fs-extra')
const utils = require('../lib/utils')
const pkg = require('../package')

const cacheDir = path.resolve(__dirname, '../dist')

module.exports = function * () {
  console.log(`[${pkg.name}] Try to get the latest version of node.js...`)
  let versionMap = yield utils.getLibVersionsMap()
  let version = versionMap[versionMap.latest]

  let dest = path.resolve(cacheDir, version)

  console.log(`[${pkg.name}] Try to find node.js (version: ${version}) headers and library in cache...`)

  if (utils.exists(dest)) {
    console.log(`[${pkg.name}] Find in cache.`)
    return version
  }

  console.log(`[${pkg.name}] Can not find in cache.`)

  // header files
  console.log(`[${pkg.name}] Start download headers.`)

  yield download(`https://nodejs.org/dist/latest/node-v${version}-headers.tar.gz`, 'headers.tar.gz')

  // shared library
  console.log(`[${pkg.name}] Start download library.`)

  let baseUrl = `https://github.com/DavidCai1993/node-shared-libs/raw/master/${version}`
  dest = `${dest}/shared`

  if (process.platform === 'darwin') {
    yield download(`${baseUrl}/darwin/libnode.48.dylib.tar.gz`, 'libnode.48.dylib.tar.gz')
  } else {
    if (process.arch === 'x64') {
      yield download(`${baseUrl}/linux/x64/libnode.so.tar.gz`, 'libnode.so.tar.gz')
    } else if (process.arch === 'x86') {
      yield download(`${baseUrl}/linux/x86/libnode.so.tar.gz`, 'libnode.so.tar.gz')
    } else {
      throw new Error(`unsupport linux arch: ${process.arch}, only support ${pkg.cpu} now.`)
    }
  }

  console.log(`[${pkg.name}] Done.`)

  return version

  function download (url, fileName) {
    let filePath = `${dest}/${fileName}`

    return new Promise(function (resolve, reject) {
      fs.ensureFileSync(filePath)
      let wget = cp.exec(`wget ${url} -O ${filePath}`)

      wget.stdout.pipe(process.stdout)
      wget.stderr.pipe(process.stderr)

      wget.on('close', function (code) {
        if (code !== 0) {
          console.error(`[${pkg.name}] Download error, code: ${code}`)
          return reject(code)
        }
        console.log(`[${pkg.name}] Download complete, wget code: ${code}.`)

        let currentCwd = process.cwd()
        process.chdir(dest)

        cp.execSync(`tar zxvf ${filePath}`)
        fs.unlinkSync(filePath)

        process.chdir(currentCwd)
        resolve(code)
      })
    })
  }
}
