'use strict'
const crypto = require('crypto')
const fs = require('fs-extra')
const download = require('download')

function isDirectory (path) { return fs.statSync(path).isDirectory() }

function isFile (path) { return fs.statSync(path).isFile() }

function exists (path) {
  try {
    fs.statSync(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

function encrypt (content, key) {
  if (!Buffer.isBuffer(content)) content = new Buffer(content)

  let encrypted = ''
  let cip = crypto.createCipher('rc4', key)
  encrypted += cip.update(content, 'binary', 'hex')
  encrypted += cip.final('hex')

  return encrypted
}

function decrypt (content, key) {
  if (typeof content !== 'string') content = content.toString()

  let decrypted = ''
  let dip = crypto.createDecipher('rc4', key)
  decrypted += dip.update(content, 'hex', 'binary')
  decrypted += dip.final('binary')

  return decrypted
}

function stripBOM (content) {
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content
}

function getHavePrefixKeys (map, prefix) {
  return Array.from(map.keys()).filter((key) => String(key).startsWith(prefix))
}

function * getSharedLibVersionsMap () {
  let pkg = yield download('https://github.com/DavidCai1993/node-shared-libs/raw/master/package.json')

  return JSON.parse(pkg).versionsMap
}

function * getLatestSharedLibVersion () {
  let versionsMap = yield getLatestSharedLibVersion()

  return versionsMap[versionsMap.latest]
}

module.exports = { isDirectory, isFile, exists, encrypt, decrypt, stripBOM, getHavePrefixKeys, getSharedLibVersionsMap, getLatestSharedLibVersion }
