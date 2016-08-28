'use strict'
const statTimeKeys = ['atime', 'mtime', 'ctime', 'birthtime']

const methodsName = ['isFile', 'isDirectory', 'isBlockDevice',
'isCharacterDevice', 'isSymbolicLink', 'isFIFO', 'isSocket']

class Node {
  constructor (path, stat, content) {
    if (!Buffer.isBuffer(content)) content = new Buffer(content)

    this.path = path
    this.content = content
    this.size = content.length
    this.offset = this.getOffset(this.size)

    for (let key of statTimeKeys) stat[key] = stat[key].getTime()
    for (let method of methodsName) stat[method] = stat[method]()

    this.stat = stat
  }

  getOffset (size) {
    let offset = Node._offset
    Node._offset += size
    return offset
  }
}

Node._offset = 0

module.exports = Node
