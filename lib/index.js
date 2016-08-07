'use strict'
const lockjs = require('commander')
const version = require('../package').version
const encrypt = require('./encrypt')
const run = require('./decrypt')

lockjs
  .version(version)
  .usage('[options] <project>')
  .option('-e, --encrypt <project>', 'Encrypt your node project')
  .option('-r, --run <project>', 'Run the encrypted project')
  .option('-k, --key <key>', 'The key you hold.')
  .parse(process.argv)

if (lockjs.encrypt) encrypt(lockjs.encrypt)
else if (lockjs.run && lockjs.key) run(lockjs.key, lockjs.run)
