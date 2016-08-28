/* global describe it after before beforeEach */
'use strict'
require('co-mocha')
require('should')
const fs = require('fs')
const path = require('path')
const lock = require('../lib/lock')
const utils = require('../lib/utils')

describe('lock.js', function () {
  this.timeout(1000 * 10)

  let publicKey = 'KEY'
  let privateKey = 'KEY'
  let key = `${publicKey}${privateKey}`
  let entryPoint = 'lib/index.js'
  let src = path.resolve(__dirname, '..')
  let dest = path.join(__dirname, 'test.locked')

  let locked = null
  let fileHeaderLength = null
  let fileHeader = null
  let pos = 0

  before(function () { utils.getRandom = function () { return 'KEY' } })
  beforeEach(function () { if (utils.exists(dest)) locked = fs.readFileSync(dest) })
  after(function () { if (utils.exists(dest)) fs.unlinkSync(dest) })

  it('should generate the locked file', function * () {
    yield lock(src, dest, entryPoint)

    fs.statSync(dest).isFile().should.be.true()
  })

  it('should get right key header', function * () {
    let keyLength = new Buffer(20)
    locked.copy(keyLength, 0, pos, pos += 20).should.equal(20)

    getDecrypedLength(keyLength).should.equal(utils.encrypt(privateKey, publicKey).length)
  })

  it('should get right key', function * () {
    let encryptedKey = new Buffer(key.length)
    locked.copy(encryptedKey, 0, pos, pos += key.length).should.equal(key.length)

    utils.decrypt(encryptedKey, publicKey).should.equal(privateKey)
  })

  it('should get right entry point length', function * () {
    let entryPointLength = new Buffer(20)
    locked.copy(entryPointLength, 0, pos, pos += 20).should.equal(20)

    getDecrypedLength(entryPointLength).should.equal(utils.encrypt(entryPoint, key).length)
  })

  it('should get right entry point', function * () {
    let len = utils.encrypt(entryPoint, key).length
    let entry = new Buffer(len)
    locked.copy(entry, 0, pos, pos += len).should.equal(len)

    utils.decrypt(entry, key).should.equal(entryPoint)
  })

  it('should get right file header length', function * () {
    fileHeaderLength = new Buffer(20)
    locked.copy(fileHeaderLength, 0, pos, pos += 20).should.equal(20)
    fileHeaderLength = getDecrypedLength(fileHeaderLength)

    ;(typeof fileHeaderLength).should.equal('number')
  })

  it('should get right file header json', function * () {
    fileHeader = new Buffer(fileHeaderLength)
    locked.copy(fileHeader, 0, pos, pos += fileHeaderLength).should.equal(fileHeaderLength)

    fileHeader = JSON.parse(utils.decrypt(fileHeader, key))
    fileHeader['lib/index.js'].stat.isFile.should.be.true()
  })

  it('should get right file content', function * () {
    let meta = fileHeader['lib/index.js']
    let fileBuffer = new Buffer(meta.size)

    locked.copy(fileBuffer, 0, pos + meta.offset, pos + meta.offset + meta.size).should.equal(meta.size)

    utils.decrypt(fileBuffer, key).should.equal(fs.readFileSync('lib/index.js', 'utf8'))
  })
})

function getDecrypedLength (decrypted) {
  decrypted = decrypted.toString()
  return Number(decrypted.slice(decrypted.lastIndexOf('$') + 1))
}
