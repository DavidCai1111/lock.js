'use strict'
const path = require('path')
const fs = require('fs-extra')
const utils = require('./utils')

const source = process.argv[2]
const dest = process.argv[3]
const wrapper = fs.readFileSync(`${__dirname}${path.sep}wrapper.js`, 'utf8')

const NEED_ENCRYPT_SUFFIX = ['.js', '.json']
const PRIVATE_KEY = Math.random().toString(36).slice(2)
const PUBLIC_KEY = Math.random().toString(36).slice(2)
const KEY = `${PUBLIC_KEY}${PRIVATE_KEY}`

if (!source || !dest) throw new Error('source and dest are required.')

const started = Date.now()
encryptDir(source, dest)
console.log(`Done, cost ${Date.now() - started} ms.`)
console.log(`Your key is "${PUBLIC_KEY}".`)

function needEncrypt (filename) {
  return ~NEED_ENCRYPT_SUFFIX.indexOf(path.extname(filename))
}

function setEncrypName (name) {
  let ext = path.extname(name)

  return `${utils.encrypt(path.basename(name, ext), KEY)}${ext}`
}

function encryptDir (source, dest, inNodeModules) {
  for (let file of fs.readdirSync(source)) {
    let isInNodeModules = inNodeModules
    let filePath = `${source}${path.sep}${file}`

    let destPath
    if (file === 'node_modules' || inNodeModules) {
      isInNodeModules = true
      destPath = `${dest}${path.sep}${file}`
    } else destPath = `${dest}${path.sep}${setEncrypName(file)}`

    if (!utils.isDirectory(filePath)) {
      if (needEncrypt(filePath)) {
        let content = fs.readFileSync(filePath)
        if (path.extname(filePath) === '.js') content = `${wrapper}${content}`

        fs.outputFileSync(destPath, utils.encrypt(content, KEY))
        console.log(`${filePath} => ${destPath}`)
      } else fs.copySync(filePath, destPath)
    } else encryptDir(filePath, destPath, isInNodeModules)
  }
}
