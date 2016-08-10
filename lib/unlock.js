'use strict'
const path = require('path')
const fs = require('mz/fs')
const utils = require('./utils')

module.exports = function * (src, publicKey) {
  if (!utils.isFile(src)) throw new Error(`${src} is not a file.`)
  const prefix = '__lockjs__'
  const fd = fs.openSync(src, 'r')

  let pos = 0
  let filesMap = new Map()
  let entryPoint

  try {
    // encrypted key length
    let encryptedKeyLength = new Buffer(6)
    if (fs.readSync(fd, encryptedKeyLength, 0, 6, pos) !== 6) {
      throw new Error('unable to read encrypted key length.')
    }
    pos += 6
    encryptedKeyLength = encryptedKeyLength.readUIntLE(0, 6)

    // encrypted key
    let encryptedKey = new Buffer(encryptedKeyLength)
    if (fs.readSync(fd, encryptedKey, 0, encryptedKeyLength, pos) !== encryptedKeyLength) {
      throw new Error('unable to read encrypted key.')
    }
    pos += encryptedKeyLength
    encryptedKey = encryptedKey.toString()

    let privateKey = utils.decrypt(encryptedKey, publicKey)
    let key = `${publicKey}${privateKey}`

    // entry point length
    let entryPointLength = new Buffer(6)
    if (fs.readSync(fd, entryPointLength, 0, 6, pos) !== 6) {
      throw new Error('unable to read entry point length.')
    }
    pos += 6
    entryPointLength = entryPointLength.readUIntLE(0, 6)

    // entry point
    entryPoint = new Buffer(entryPointLength)
    if (fs.readSync(fd, entryPoint, 0, entryPointLength, pos) !== entryPointLength) {
      throw new Error('unable to read entry point.')
    }
    pos += entryPointLength
    entryPoint = entryPoint.toString()

    // file header length
    let filesHeaderLength = new Buffer(6)
    if (fs.readSync(fd, filesHeaderLength, 0, 6, pos) !== 6) {
      throw new Error('unable to read file header length.')
    }
    pos += 6
    filesHeaderLength = filesHeaderLength.readUIntLE(0, 6)

    // file header
    let fileHeader = new Buffer(filesHeaderLength)
    if (fs.readSync(fd, fileHeader, 0, filesHeaderLength, pos) !== filesHeaderLength) {
      throw new Error('unable to read file header.')
    }
    pos += filesHeaderLength
    fileHeader = JSON.parse(utils.decrypt(fileHeader, key))

    yield Object.keys(fileHeader).map(function * (filePath) {
      let meta = fileHeader[filePath]
      let fileBuffer = new Buffer(meta.size)
      let readSize = (yield fs.read(fd, fileBuffer, 0, meta.size, pos + meta.offset))[0]

      if (readSize !== meta.size) {
        throw new Error(`unable to unlock ${filePath}.`)
      }

      filesMap.set(filePath, utils.decrypt(fileBuffer, key))
    })
    console.log(filesMap)
    console.log(`entryPoint: ${entryPoint}`)
  } finally {
    fs.closeSync(fd)
  }

  // Monkey patch Module._resolveFilename
  let originalResolveFilename = Object.getPrototypeOf(module).constructor._resolveFilename
  Object.getPrototypeOf(module).constructor._resolveFilename = function (request, parent, isMain) {
    if (!path.isAbsolute(request)) {
      let req = path.relative('.', request)
      if (filesMap.has(req)) return `${prefix}${req}`
    }

    return originalResolveFilename.call(Object.getPrototypeOf(module).constructor, request, parent, isMain)
  }

  // Monkey patch require.extensions['.js']
  let originalRequireJS = require.extensions['.js']
  require.extensions['.js'] = function (module, filename) {
    if (!filename.startsWith(prefix)) {
      return originalRequireJS.call(require.extensions, module, filename)
    }

    let content = filesMap.get(filename.slice(prefix.length))

    return module._compile(utils.stripBOM(content), filename)
  }

  // Monkey patch require.extensions['.json']
  let originalRequireJSON = require.extensions['.json']
  require.extensions['.json'] = function (module, filename) {
    if (!filename.startsWith(prefix)) {
      return originalRequireJSON.call(require.extensions, module, filename)
    }

    let content = filesMap.get(filename.slice(prefix.length))

    try {
      module.exports = JSON.parse(utils.stripBOM(content))
    } catch (err) {
      err.message = `${filename}:${err.message}`
      throw err
    }
  }

  Object.getPrototypeOf(module).constructor._load(entryPoint, null, true)
}
