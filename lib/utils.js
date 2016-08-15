'use strict'
const crypto = require('crypto')
const fs = require('fs-extra')

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

function encrypt (content, key, algorithm) {
  if (!Buffer.isBuffer(content)) content = new Buffer(content)
  if (!algorithm) algorithm = 'rc4'

  let encrypted = ''
  let cip = crypto.createCipher(algorithm, key)
  encrypted += cip.update(content, 'binary', 'hex')
  encrypted += cip.final('hex')

  return encrypted
}

function decrypt (content, key, algorithm) {
  if (typeof content !== 'string') content = content.toString()
  if (!algorithm) algorithm = 'rc4'

  let decrypted = ''
  let dip = crypto.createDecipher(algorithm, key)
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

module.exports = { isDirectory, isFile, exists, encrypt, decrypt, stripBOM, getHavePrefixKeys }
