'use strict'
const path = require('path')
const execSync = require('child_process').execSync
const fs = require('fs-extra')
const babel = require('babel-core')
const uglify = require('uglify-js')
const utils = require('./utils')
const pkg = require('../package')

module.exports = function (src, publicKey, dest, headersDir, libDir) {
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

  let libName
  if (process.platform === 'darwin') {
    libName = fs.readdirSync(libDir).find((name) => name.endsWith('.dylib'))
    commond = `c++ ${runCppPath} ${libDir}/${libName} ${commond}` // OS X
  } else {
    commond = `c++ ${runCppPath} ${commond} -L${libDir} -lnode` // Linux
  }

  execSync(commond)

  // Set dylib search path on OS X
  if (process.platform === 'darwin') {
    execSync(`install_name_tool -change /usr/local/lib/${libName} ${libDir}/${libName} ${dest}`)
  }

  console.log(`[${pkg.name}] Done, executable: "${dest}".`)
}

function wrap (code) { return `#define PROJECT "${code}"` }
