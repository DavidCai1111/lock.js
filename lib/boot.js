'use strict'
const path = require('path')
const cp = require('child_process')
const fs = require('fs')
const tmpDir = require('os').tmpdir()
const babel = require('babel-core')
const uglify = require('uglify-js')
const utils = require('./utils')

module.exports = function (src, publicKey, dest) {
  if (!utils.isFile(src)) throw new Error(`${src} is not a file.`)
  if (!path.isAbsolute(dest)) dest = path.resolve(process.cwd(), dest)

  const tmpPath = path.join(tmpDir, `${Date.now()}${path.basename(src)}`)
  const unlockScript = fs.readFileSync(path.resolve(__dirname, './unlock.js'), 'utf8')
  const unlockCppPath = path.resolve(__dirname, '../src/unlock.cc')

  let es2015Code = babel.transform(unlockScript, { presets: ['es2015'] }).code
  let minifiedCode = uglify.minify(es2015Code, { fromString: true }).code.replace(/"/g, '\\"')

  cp.execSync(`c++ ${unlockCppPath} -o ${dest} -I/usr/local/include/node -L/usr/local/Lib -lnode -std=c++11 '-DSCRIPT="${minifiedCode}"' '-DPUBLIC_KEY="${publicKey}"' '-DSRC="${tmpPath}"'`)
}
