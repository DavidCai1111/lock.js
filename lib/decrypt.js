'use strict'
const path = require('path')
const fs = require('fs-extra')
const debug = require('util').debuglog('lock.js')
const utils = require('./utils')

module.exports = function (key, entry) {
  const ENTRY = path.resolve(process.cwd(), entry)
  if (!utils.isDirectory(ENTRY)) throw new Error(`${ENTRY} is not a directory.`)

  process.env.DECRYPT_KEY = key
  debug(`Key: ${key}, entry: ${ENTRY}`)

  // Monkey-patch 'JSON.parse'
  let originalParse = JSON.parse.bind(JSON)

  JSON.parse = function () {
    if (arguments[0][0] !== '{') arguments[0] = utils.decrypt(arguments[0], key)

    return originalParse.apply(JSON, arguments)
  }

  // Monkey-patch 'require'
  let originalRequire = module.require.bind(module)

  module.require = function () {
    try {
      originalRequire.apply(module, arguments)
    } catch (error) {
      debug('Original module.require error: %j', error)

      arguments[0] = utils.encryptPath(arguments[0], key)

      try { originalRequire.apply(module, arguments) } catch (_) { throw error }
    }
  }

  require.extensions['.js'] = function (module, filename) {
    let content = utils.decrypt(fs.readFileSync(filename, 'utf8'), key)

    module._compile(utils.stripBOM(content), filename)
  }

  require.extensions['.json'] = function (module, filename) {
    let content = utils.decrypt(fs.readFileSync(filename, 'utf8'), key)

    try {
      module.exports = JSON.parse(utils.stripBOM(content))
    } catch (err) {
      err.message = `${filename}:${err.message}`
      throw err
    }
  }

  try {
    require(ENTRY)
  } catch (error) {
    debug('Original require(ENTRY) error: %j', error)
    // Try to read 'main' in encrypted package.json
    let pkgPath = `${ENTRY}${path.sep}${utils.encrypt('package', key)}.json`
    let main = JSON.parse(utils.decrypt(fs.readFileSync(pkgPath), key)).main
    main = utils.encryptPath(main, key)

    try { require(path.resolve(ENTRY, main)) } catch (_) { throw error }
  }
}
