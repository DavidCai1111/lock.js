'use strict'
const path = require('path')
const glob = require('glob')
const fs = require('fs')
const isBinaryPath = require('is-binary-path')
const Node = require('./file-node')
const utils = require('./utils')
const pkg = require('../package')

module.exports = function * (src, dest, entryPoint) {
  if (!utils.isDirectory(src)) throw new Error(`"${src}" is not a directory.`)
  if (utils.exists(dest)) throw new Error(`"${dest}" already exists.`)

  const publicKey = utils.getRandom()
  const privateKey = utils.getRandom()
  const key = `${publicKey}${privateKey}`
  const fd = fs.openSync(dest, 'w')

  try {
    let nodes = createNodes(src, key)

    createKeyHeader(privateKey, publicKey)
    createEntryPointHeader(src, entryPoint, key)
    createFilesHeader(nodes, key)
    createFilesBody(nodes, key)

    console.log(`[${pkg.name}] Done.`)
    console.log(`[${pkg.name}] Locked file: "${dest}".`)
    console.log(`[${pkg.name}] Key: "${publicKey}".`)
  } catch (error) {
    fs.unlinkSync(dest)
    throw error
  } finally {
    fs.closeSync(fd)
  }

  function createKeyHeader (privateKey, publicKey) {
    let encryptedPrivateKey = utils.encrypt(privateKey, publicKey)

    let encryptedKeyHeader = new Buffer(encryptedPrivateKey)

    let lengthHeader = new Buffer(fillLeft(encryptedKeyHeader.length))

    fs.appendFileSync(dest, Buffer.concat([lengthHeader, encryptedKeyHeader]))
  }

  function createEntryPointHeader (src, entryPoint, key) {
    if (path.isAbsolute(entryPoint) && !utils.exists(entryPoint)) {
      throw new Error(`"${entryPoint}" is not exist.`)
    } else {
      entryPoint = path.resolve(src, entryPoint)
      if (!utils.exists(entryPoint)) throw new Error(`"${entryPoint}" is not exist.`)
    }

    let relative = new Buffer(utils.encrypt(path.relative(src, entryPoint), key))
    let lengthHeader = new Buffer(fillLeft(relative.length))

    fs.appendFileSync(dest, Buffer.concat([lengthHeader, relative]))
  }

  function createFilesHeader (nodes, key) {
    let files = {}

    for (let node of nodes) {
      files[node.path] = { size: node.size, offset: node.offset, stat: node.stat }
    }

    let filesHeader = new Buffer(utils.encrypt(JSON.stringify(files), key))
    let lengthHeader = new Buffer(fillLeft(filesHeader.length))

    fs.appendFileSync(dest, Buffer.concat([lengthHeader, filesHeader]))
  }

  function createFilesBody (nodes, key) {
    for (let node of nodes) {
      console.log(`[${pkg.name}] packing "${node.path}"...`)
      fs.appendFileSync(dest, node.content)
    }
  }
}

function createNodes (src, key) {
  let nodes = []

  for (let filename of glob.sync(`${src}/**/*`, { dot: true })) {
    let stat = fs.statSync(filename)
    let relativePath = path.relative(src, filename)
    let content

    if (!stat.isFile()) content = String()
    else if (isBinaryPath(filename) || filename.endsWith('.node')) {
      content = fs.readFileSync(filename).toString('hex')
      stat.isBinary = true
    } else content = utils.encrypt(fs.readFileSync(filename), key)

    let fileNode = new Node(relativePath, stat, content)

    nodes.push(fileNode)
  }

  return nodes
}

function fillLeft (str, len) {
  if (typeof str !== 'string') str = String(str)
  len = len || 20
  if (str.length > len) throw new Error(`"${str}".length is more than ${len}.`)
  len = len - str.length

  while (len) {
    str = `$${str}`
    len -= 1
  }

  return str
}
