'use strict'
const path = require('path')
const glob = require('glob')
const fs = require('mz/fs')
const Node = require('./file-node')
const utils = require('./utils')
const pkg = require('../package')

module.exports = function * (src, dest, entryPoint) {
  if (!utils.isDirectory(src)) throw new Error(`"${src}" is not a directory.`)
  if (utils.exists(dest)) throw new Error(`"${dest}" already exists.`)

  const publicKey = Math.random().toString(36).slice(2)
  const privateKey = Math.random().toString(36).slice(2)
  const key = `${publicKey}${privateKey}`
  const fd = fs.openSync(dest, 'w')

  try {
    let keyHeader = createKeyHeader(privateKey, publicKey)
    let entryPointHeader = createEntryPointHeader(src, entryPoint, key)
    let nodes = yield createNodes(src, key)
    let filesHeader = createFilesHeader(nodes, key)
    let body = createFilesBody(nodes, key)

    fs.writeFileSync(dest, utils.encrypt(Buffer.concat([
      keyHeader, entryPointHeader, filesHeader, body
    ]), publicKey))

    console.log(`[${pkg.name}] Done, your key is "${publicKey}".`)
  } catch (error) {
    fs.unlinkSync(dest)
    throw error
  } finally {
    fs.closeSync(fd)
  }
}

function createKeyHeader (privateKey, publicKey) {
  let encryptedPrivateKey = utils.encrypt(privateKey, publicKey)

  let encryptedKeyHeader = new Buffer(encryptedPrivateKey)

  let lengthHeader = new Buffer(6)
  lengthHeader.writeUIntLE(encryptedKeyHeader.length, 0, 6)

  return Buffer.concat([lengthHeader, encryptedKeyHeader])
}

function createFilesHeader (nodes, key) {
  let files = {}

  for (let node of nodes) {
    files[node.path] = { size: node.size, offset: node.offset }
  }

  let filesHeader = new Buffer(utils.encrypt(JSON.stringify(files), key))

  let lengthHeader = new Buffer(6)
  lengthHeader.writeUIntLE(filesHeader.length, 0, 6)

  return Buffer.concat([lengthHeader, filesHeader])
}

function createEntryPointHeader (src, entryPoint, key) {
  if (path.isAbsolute(entryPoint) && !utils.exists(entryPoint)) {
    throw new Error(`"${entryPoint}" is not exist.`)
  } else {
    entryPoint = path.resolve(src, entryPoint)
    if (!utils.exists(entryPoint)) throw new Error(`"${entryPoint}" is not exist.`)
  }

  let relative = new Buffer(utils.encrypt(path.relative(src, entryPoint), key))
  let lengthHeader = new Buffer(6)
  lengthHeader.writeUIntLE(relative.length, 0, 6)

  return Buffer.concat([lengthHeader, relative])
}

function createFilesBody (nodes, key) {
  let bodyBuf = Buffer.concat(nodes.map((node) => node.content))

  return bodyBuf
}

function * createNodes (src, key) {
  const filenames = glob.sync(`${src}/**/*`, { dot: true })
  let nodes = []

  yield filenames.map(function * (filename) {
    let stat = yield fs.lstat(filename)
    if (stat.isDirectory()) return

    let relativePath = path.relative(src, filename)
    let content = yield fs.readFile(filename)
    let fileNode = new Node(relativePath, utils.encrypt(content, key))

    nodes.push(fileNode)
  })

  return nodes
}
