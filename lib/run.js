'use strict'
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

;(function () {
  let project = process.argv[1]
  let publicKey = process.argv[2]

  project = new Buffer(decrypt(project, publicKey))

  let pos = 0
  let filesMap = new Map()
  let requireCache = new Map()
  let entryPoint

  // encrypted key length
  let encryptedKeyLength = new Buffer(20)
  if (project.copy(encryptedKeyLength, 0, pos, pos + 20) !== 20) {
    throw new Error('unable to read encrypted key length.')
  }
  pos += 20
  encryptedKeyLength = getDecrypedLength(encryptedKeyLength)

  // encrypted key
  let encryptedKey = new Buffer(encryptedKeyLength)
  if (project.copy(encryptedKey, 0, pos, pos + encryptedKeyLength) !== encryptedKeyLength) {
    throw new Error('unable to read encrypted key.')
  }
  pos += encryptedKeyLength
  encryptedKey = encryptedKey.toString()

  let privateKey = decrypt(encryptedKey, publicKey)
  let key = `${publicKey}${privateKey}`

  // entry point length
  let entryPointLength = new Buffer(20)
  if (project.copy(entryPointLength, 0, pos, pos + 20) !== 20) {
    throw new Error('unable to read entry point length.')
  }
  pos += 20
  entryPointLength = getDecrypedLength(entryPointLength)

  // entry point
  entryPoint = new Buffer(entryPointLength)
  if (project.copy(entryPoint, 0, pos, pos + entryPointLength) !== entryPointLength) {
    throw new Error('unable to read entry point.')
  }
  pos += entryPointLength
  entryPoint = decrypt(entryPoint, key)

  // file header length
  let filesHeaderLength = new Buffer(20)
  if (project.copy(filesHeaderLength, 0, pos, pos + 20) !== 20) {
    throw new Error('unable to read file header length.')
  }
  pos += 20
  filesHeaderLength = getDecrypedLength(filesHeaderLength)

  // file header
  let fileHeader = new Buffer(filesHeaderLength)
  if (project.copy(fileHeader, 0, pos, pos + filesHeaderLength) !== filesHeaderLength) {
    throw new Error('unable to read file header.')
  }
  pos += filesHeaderLength
  fileHeader = JSON.parse(decrypt(fileHeader, key))

  Object.keys(fileHeader).forEach(function (filePath) {
    let meta = fileHeader[filePath]
    let fileBuffer = new Buffer(meta.size)
    let readSize = project.copy(fileBuffer, 0, pos + meta.offset, pos + meta.offset + meta.size)
    if (readSize !== meta.size) throw new Error(`unable to unlock ${filePath}.`)

    filesMap.set(path.resolve(process.cwd(), filePath), decrypt(fileBuffer, key))
  })

  // Monkey patch require.extensions['.js']
  let originalRequireJS = require.extensions['.js']
  require.extensions['.js'] = function (module, filename) {
    if (!filesMap.has(filename)) {
      return originalRequireJS.call(require.extensions, module, filename)
    }

    let content = filesMap.get(filename)

    return module._compile(stripBOM(content), filename)
  }

  // Monkey patch require.extensions['.json']
  let originalRequireJSON = require.extensions['.json']
  require.extensions['.json'] = function (module, filename) {
    if (!filesMap.has(filename)) {
      return originalRequireJSON.call(require.extensions, module, filename)
    }

    let content = filesMap.get(filename)

    try {
      module.exports = JSON.parse(stripBOM(content))
    } catch (err) {
      err.message = `${filename}:${err.message}`
      throw err
    }
  }

  // Monkey patch Module._findPath
  let _findPath = Object.getPrototypeOf(module).constructor._findPath

  Object.getPrototypeOf(module).constructor._findPath = function (request, paths, isMain) {
    let cacheKey = JSON.stringify({ request, paths })
    if (requireCache.has(cacheKey)) return requireCache.get(cacheKey)

    for (let p of paths) {
      const trailingSlash = request.length > 0 && request.charCodeAt(request.length - 1) === 47
      let tryPath = path.resolve(p, request)

      if (filesMap.has(tryPath)) {
        requireCache.set(cacheKey, tryPath)
        return tryPath
      }

      let havePrefixKeys = getHavePrefixKeys(filesMap, tryPath)
      if (!havePrefixKeys.length) continue

      if (!trailingSlash) {
        let extsResult = tryExtensions(tryPath, havePrefixKeys)
        if (extsResult) {
          requireCache.set(cacheKey, extsResult)
          return extsResult
        }

        let indexsResult = tryIndex(tryPath, havePrefixKeys)
        if (indexsResult) {
          requireCache.set(cacheKey, indexsResult)
          return indexsResult
        }
      }

      let pkgResult = tryPackage(tryPath, havePrefixKeys, filesMap)
      if (pkgResult) {
        requireCache.set(cacheKey, pkgResult)
        return pkgResult
      }
    }

    return _findPath.call(Object.getPrototypeOf(module).constructor, request, paths, isMain)
  }

  // Monkey pactch fs.readFile & fs.readFileSync
  let originalReadFileSync = fs.readFileSync

  fs.readFileSync = function (_path, options) {
    if (!options) {
      options = { encoding: null, flag: 'r' }
    } else if (typeof options === 'string') {
      options = { encoding: options, flag: 'r' }
    } else if (typeof options !== 'object') {
      throwOptionsError(options)
    }

    let encoding = options.encoding
    assertEncoding(encoding)

    let relativePath = path.resolve(process.cwd(), _path)

    if (!filesMap.has(relativePath)) return originalReadFileSync.call(fs, _path, options)

    let buffer = new Buffer(filesMap.get(relativePath))

    if (!encoding) return buffer

    return buffer.toString(encoding)
  }

  let originalReadFile = fs.readFile

  fs.readFile = function (_path, options, callback) {
    if (!options) {
      options = { encoding: null, flag: 'r' }
    } else if (typeof options === 'string') {
      options = { encoding: options, flag: 'r' }
    } else if (typeof options !== 'object') {
      throwOptionsError(options)
    }

    let encoding = options.encoding
    assertEncoding(encoding)

    let relativePath = path.resolve(process.cwd(), _path)

    if (!filesMap.has(relativePath)) return originalReadFile.call(fs, _path, options, callback)

    let buffer = new Buffer(filesMap.get(relativePath))

    if (!encoding) return process.nextTick(callback, null, buffer)

    return process.nextTick(callback, null, buffer.toString(encoding))
  }

  // Monkey pactch fs.readdir & fs.readdirSync
  let originalReaddir = fs.readdir

  fs.readdir = function (_path, options, callback) {
    options = options || {}
    if (typeof options === 'string') options = {encoding: options}
    if (typeof options !== 'object') throw new TypeError('options must be a string or an object')

    let relativePath = path.resolve(process.cwd(), _path)
    let keysWithPrefix = getHavePrefixKeys(filesMap, relativePath)

    if (!keysWithPrefix.length) return originalReaddir.call(fs, _path, options, callback)

    process.nextTick(callback, null, keysWithPrefix
      .filter((key) => key[relativePath.length] === '/')
      .map((key) => {
        key = key.slice(relativePath.length + 1)
        let i = key.indexOf('/')
        if (!~i) return key
        else return key.slice(0, i)
      })
    )
  }

  let originalReaddirSync = fs.readdirSync

  fs.readdirSync = function (_path, options) {
    options = options || {}
    if (typeof options === 'string') options = {encoding: options}
    if (typeof options !== 'object') throw new TypeError('options must be a string or an object')

    let relativePath = path.resolve(process.cwd(), _path)
    let keysWithPrefix = getHavePrefixKeys(filesMap, relativePath)

    if (!keysWithPrefix.length) return originalReaddirSync.call(fs, _path, options)

    return keysWithPrefix
      .filter((key) => key[relativePath.length] === '/')
      .map((key) => {
        key = key.slice(relativePath.length + 1)
        let i = key.indexOf('/')
        if (!~i) return key
        else return key.slice(0, i)
      })
  }

  Object.getPrototypeOf(module).constructor._load(path.resolve(process.cwd(), entryPoint), null, true)
})()

function tryExtensions (tryPath, paths) {
  let exts = ['.js', '.json', '.node']
  for (let ext of exts) {
    let fullPath = `${tryPath}${ext}`
    if (~paths.indexOf(fullPath)) return fullPath
  }

  return false
}

function tryIndex (tryPath, paths) {
  let indexs = ['index.js', 'index.json', 'index.node']

  for (let index of indexs) {
    let fullPath = `${tryPath}/${index}`
    if (~paths.indexOf(fullPath)) return fullPath
  }

  return false
}

function tryPackage (tryPath, paths, filesMap) {
  let i = paths.indexOf(`${tryPath}/package.json`)
  if (!~i) return false

  let main = JSON.parse(filesMap.get(paths[i])).main
  if (!main) return false

  main = path.resolve(tryPath, main)
  if (filesMap.has(main)) return main

  let havePrefixKeys = getHavePrefixKeys(filesMap, main)
  if (!havePrefixKeys.length) return false

  let extsResult = tryExtensions(main, havePrefixKeys)
  if (extsResult) return extsResult

  let indexsResult = tryIndex(main, havePrefixKeys)
  if (indexsResult) return indexsResult

  return false
}

function getDecrypedLength (decrypted) {
  return Number(decrypted.toString().slice(decrypted.lastIndexOf('$') + 1))
}

function decrypt (content, key) {
  if (typeof content !== 'string') content = content.toString()

  let decrypted = ''
  let dip = crypto.createDecipher('rc4', key)
  decrypted += dip.update(content, 'hex')
  decrypted += dip.final()

  return decrypted
}

function stripBOM (content) {
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content
}

function getHavePrefixKeys (map, prefix) {
  return Array.from(map.keys()).filter((key) => String(key).startsWith(prefix))
}

function throwOptionsError (options) {
  throw new TypeError(`Expected options to be either an object or a string, but got ${typeof options} instead`)
}

function assertEncoding (encoding) {
  if (encoding && !Buffer.isEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding)
  }
}
