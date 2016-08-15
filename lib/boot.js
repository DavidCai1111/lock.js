'use strict'
const path = require('path')
const cp = require('child_process')
const fs = require('fs-extra')
const babel = require('babel-core')
const uglify = require('uglify-js')
const utils = require('./utils')

module.exports = function (src, publicKey, dest) {
  if (!path.isAbsolute(src)) src = path.resolve(process.cwd(), src)
  if (!path.isAbsolute(dest)) dest = path.resolve(process.cwd(), dest)
  if (!utils.isFile(src)) throw new Error(`${src} is not a file.`)

  const project = fs.readFileSync(src, 'utf8')
  fs.writeFileSync(path.resolve(__dirname, '../src/project.h'), wrap(project))

  const unlockScript = fs.readFileSync(path.resolve(__dirname, './unlock.js'), 'utf8')
  const unlockCppPath = path.resolve(__dirname, '../src/unlock.cc')

  let es2015Code = babel.transform(unlockScript, { presets: ['es2015'] }).code
  let minifiedCode = uglify.minify(es2015Code, { fromString: true }).code.replace(/"/g, '\\"')

  cp.execSync(`c++ ${unlockCppPath} -o ${dest} -I/usr/local/include/node -L/Users/caiwei/workspace/lock.js/src -lnode -std=c++11 '-DSCRIPT="${minifiedCode}"' '-DPUBLIC_KEY="${publicKey}"'`)
}

function wrap (code) { return `#define PROJECT "${code}"` }
