'use strict'
const crypto = require('crypto')
const path = require('path')

;(function () {
  let project = process.argv[1]
  let publicKey = process.argv[2]

  project = new Buffer(decrypt(project, publicKey))

  let pos = 0
  let filesMap = new Map()
  let requireCache = new Map()
  let entryPoint

  // encrypted key length
  let encryptedKeyLength = new Buffer(6)
  if (project.copy(encryptedKeyLength, 0, pos, pos + 6) !== 6) {
    throw new Error('unable to read encrypted key length.')
  }
  pos += 6
  encryptedKeyLength = encryptedKeyLength.readUIntLE(0, 6)

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
  let entryPointLength = new Buffer(6)
  if (project.copy(entryPointLength, 0, pos, pos + 6) !== 6) {
    throw new Error('unable to read entry point length.')
  }
  pos += 6
  entryPointLength = entryPointLength.readUIntLE(0, 6)

  // entry point
  entryPoint = new Buffer(entryPointLength)
  if (project.copy(entryPoint, 0, pos, pos + entryPointLength) !== entryPointLength) {
    throw new Error('unable to read entry point.')
  }
  pos += entryPointLength
  entryPoint = decrypt(entryPoint, key)

  // file header length
  let filesHeaderLength = new Buffer(6)
  if (project.copy(filesHeaderLength, 0, pos, pos + 6) !== 6) {
    throw new Error('unable to read file header length.')
  }
  pos += 6
  filesHeaderLength = filesHeaderLength.readUIntLE(0, 6)

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
