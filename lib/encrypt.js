'use strict'
const path = require('path')
const fs = require('fs-extra')
const name = require('../package').name
const utils = require('./utils')

const wrapper = fs.readFileSync(`${__dirname}${path.sep}wrapper.js`, 'utf8')
const NEED_ENCRYPT_SUFFIX = ['.js', '.json']

module.exports = function (source) {
  const SOURCE = path.resolve(process.cwd(), source)
  if (!utils.isDirectory(source)) throw new Error(`${SOURCE} is not a directory`)

  const PRIVATE_KEY = Math.random().toString(36).slice(2)
  const PUBLIC_KEY = Math.random().toString(36).slice(2)
  const KEY = `${PUBLIC_KEY}${PRIVATE_KEY}`
  const DEST = `${process.cwd()}${path.sep}${path.basename(SOURCE)}`
  const STARTED = Date.now()

  encryptDir(SOURCE, DEST, KEY)
  console.log(`[${name}] Done, const ${Date.now() - STARTED} ms.`)
  console.log(`[${name}] Your key is "${PUBLIC_KEY}".`)
  console.log(`[${name}] Key is "${KEY}".`)
  console.log(`[${name}] Encrypted project is at "${DEST}".`)
}

function needEncrypt (filename) {
  return ~NEED_ENCRYPT_SUFFIX.indexOf(path.extname(filename))
}

function setEncrypName (name, key) {
  let ext = path.extname(name)

  return `${utils.encrypt(path.basename(name, ext), key)}${ext}`
}

function encryptDir (source, dest, key, inNodeModules) {
  for (let file of fs.readdirSync(source)) {
    let isInNodeModules = inNodeModules
    let filePath = `${source}${path.sep}${file}`

    let destPath
    if (file === 'node_modules' || inNodeModules) {
      isInNodeModules = true
      destPath = `${dest}${path.sep}${file}`
    } else destPath = `${dest}${path.sep}${setEncrypName(file, key)}`

    if (!utils.isDirectory(filePath)) {
      if (needEncrypt(filePath)) {
        let content = fs.readFileSync(filePath)
        if (path.extname(filePath) === '.js') content = `${wrapper}${content}`

        fs.outputFileSync(destPath, utils.encrypt(content, key))
        console.log(`[${name}] ${filePath} => ${destPath}`)
      } else fs.copySync(filePath, destPath)
    } else encryptDir(filePath, destPath, key, isInNodeModules)
  }
}
