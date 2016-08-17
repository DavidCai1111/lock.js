'use strict'
const os = require('os')
const path = require('path')
const cp = require('child_process')
const fs = require('fs-extra')
const babel = require('babel-core')
const uglify = require('uglify-js')
const utils = require('./utils')

module.exports = function (src, publicKey, dest, headersDir, sharedLibDir) {
  if (!path.isAbsolute(src)) src = path.resolve(process.cwd(), src)
  if (!path.isAbsolute(dest)) dest = path.resolve(process.cwd(), dest)
  if (!utils.isFile(src)) throw new Error(`${src} is not a file.`)

  const project = fs.readFileSync(src, 'utf8')
  fs.writeFileSync(path.resolve(__dirname, '../src/project.h'), wrap(project))

  const runScript = fs.readFileSync(path.resolve(__dirname, './run.js'), 'utf8')
  const runCppPath = path.resolve(__dirname, '../src/run.cc')

  let es2015Code = babel.transform(runScript, { presets: ['es2015'] }).code
  let minifiedCode = uglify.minify(es2015Code, { fromString: true }).code.replace(/"/g, '\\"')

  let commond = `-o ${dest} -I${headersDir} -std=c++11 '-DSCRIPT="${minifiedCode}"' '-DPUBLIC_KEY="${publicKey}"'`

  if (process.platform === 'linux') commond = `c++ ${runCppPath} ${commond} -L${sharedLibDir} -lnode` // linux
  else {
    // darwin
    let bashProfilePath = path.resolve(`${os.homedir()}/.bash_profile`)

    fs.appendFileSync(bashProfilePath, `export DYLD_LIBRARY_PATH="${sharedLibDir}:$DYLD_LIBRARY_PATH"`)

    commond = `source ${bashProfilePath} && c++ ${runCppPath} ${sharedLibDir}/libnode.48.dylib ${commond}`
  }

  cp.execSync(commond)
}

function wrap (code) { return `#define PROJECT "${code}"` }
