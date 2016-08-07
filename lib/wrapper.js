'use strict'
const __wrapper__path__ = require('path')
const __wrapper__crypto__ = require('crypto')

let KEY = process.env.DECRYPT_KEY

// Monkey-patch 'require'
let originalRequire = module.require.bind(module)

module.require = function () {
  try {
    return originalRequire.apply(module, arguments)
  } catch (error) {
    arguments[0] = arguments[0]
      .split(__wrapper__path__.sep)
      .map(function (name) {
        if (name[0] === '.') return name
        let ext = __wrapper__path__.extname(name)
        return `${__wrapper__encrypt__(__wrapper__path__.basename(name, ext), KEY)}${ext}`
      })
      .join(__wrapper__path__.sep)

    try { return originalRequire.apply(module, arguments) } catch (_) { throw error }
  }
}

function __wrapper__encrypt__ (content, key, algorithm) {
  if (!Buffer.isBuffer(content)) content = new Buffer(content)
  if (!algorithm) algorithm = 'rc4'
  let encrypted = ''
  let cip = __wrapper__crypto__.createCipher(algorithm, key)
  encrypted += cip.update(content, 'binary', 'hex')
  encrypted += cip.final('hex')

  return encrypted
}
