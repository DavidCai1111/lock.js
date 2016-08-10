'use strict'

class Node {
  constructor (path, content) {
    if (!Buffer.isBuffer(content)) content = new Buffer(content)

    this.path = path
    this.content = content
    this.size = content.length
    this.offset = this.getOffset(this.size)
  }

  getOffset (size) {
    let offset = Node._offset
    Node._offset += size
    return offset
  }
}

Node._offset = 0

module.exports = Node
