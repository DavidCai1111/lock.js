'use strict'
const crypto = require('crypto')
const fs = require('fs-extra')
const cp = require('child_process')
const pkg = require('../package')

function isDirectory (path) { return fs.statSync(path).isDirectory() }

function isFile (path) { return fs.statSync(path).isFile() }

function exists (path) {
  try {
    fs.statSync(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

function encrypt (content, key) {
  if (!Buffer.isBuffer(content)) content = new Buffer(content)

  let encrypted = ''
  let cip = crypto.createCipher('rc4', key)
  encrypted += cip.update(content, 'binary', 'hex')
  encrypted += cip.final('hex')

  return encrypted
}

function decrypt (content, key) {
  if (typeof content !== 'string') content = content.toString()

  let decrypted = ''
  let dip = crypto.createDecipher('rc4', key)
  decrypted += dip.update(content, 'hex', 'binary')
  decrypted += dip.final('binary')

  return decrypted
}

function download (url, dest, fileName) {
  let filePath = `${dest}/${fileName}`

  return new Promise(function (resolve, reject) {
    fs.ensureFileSync(filePath)
    let wget = cp.exec(`wget ${url} -O ${filePath}`)

    wget.stdout.pipe(process.stdout)
    wget.stderr.pipe(process.stderr)

    wget.on('close', function (code) {
      if (code !== 0) {
        console.error(`[${pkg.name}] Download error, code: ${code}`)
        return reject(code)
      }
      console.log(`[${pkg.name}] Download complete, wget code: ${code}.`)

      let currentCwd = process.cwd()
      process.chdir(dest)

      cp.execSync(`tar zxvf ${filePath}`)
      fs.unlinkSync(filePath)

      process.chdir(currentCwd)
      resolve(code)
    })
  })
}

function getSharedName (modulesVersion) {
  if (process.platform === 'darwin') return `libnode.${modulesVersion}.dylib`
  else return 'libnode.so'
}

function getSharedDownloadUrl (version, libName) {
  let baseUrl = `https://github.com/DavidCai1993/node-shared-libs/raw/master/${version}`

  if (process.platform === 'darwin') return `${baseUrl}/darwin/${libName}.tar.gz`
  else {
    if (process.arch === 'x64') return `${baseUrl}/linux/x64/${libName}.tar.gz`
    else if (process.arch === 'x86') return `${baseUrl}/linux/x86/${libName}.tar.gz`
    else throw new Error(`unsupport linux arch: ${process.arch}, only support ${pkg.cpu} now.`)
  }
}

function check (command) {
  try {
    cp.execSync(`which ${command}`)
  } catch (_) {
    throw new Error(`"${command}" should be installed first.`)
  }
}

module.exports = { isDirectory, isFile, exists, encrypt, decrypt, download,
getSharedName, getSharedDownloadUrl, check }
