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

module.exports = { isDirectory, isFile, exists, encrypt, decrypt }
