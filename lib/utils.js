'use strict'
const crypto = require('crypto')
const path = require('path')
const fs = require('fs-extra')

function isDirectory (path) { return fs.statSync(path).isDirectory() }

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

function encryptPath (originalPath, key) {
  return originalPath
    .split(path.sep)
    .map(function (name) {
      if (name[0] === '.') return
      let ext = path.extname(name)
      return `${encrypt(path.basename(name, ext), key)}${ext}`
    })
    .join(path.sep)
}

module.exports = { isDirectory, encrypt, decrypt, stripBOM, encryptPath }
