const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const prettierOptions = require('./prettier.config')

const formatExtList = ['js', 'vue']
const excludeDirs = ['.DS_Store']

const needToFormat = file => {
  const str = '\\.\(' + formatExtList.join('|') + '\)\$'
  const reg = new RegExp(str, 'i')
  return reg.test(file)
}
needToFormat()
const getAbsolutePath = dir => path.join(__dirname, dir || '')
const srcDirPath = getAbsolutePath('src')

const format = source => prettier.format(source, prettierOptions)
const hasFormat = source => prettier.check(source, prettierOptions)

const isFile = stats => stats.isFile()
const isDir = stats => stats.isDirectory()

let hasDo = false
const dirs = []

const findAndFormat = dir => {
  fs.readdir(dir, 'utf-8', (err, files) => {
    if (err) {
      throw err
    }
    for (let i = 0; i < files.length; i++) {
      const name = files[i]
      if (excludeDirs.includes(name)) {
        continue
      }
      const currentPath = path.join(dir, name)
      fs.stat(currentPath, (err, stats) => {
        if (err) {
          throw err
        }
        const l1 = dirs.length
        if (isFile(stats)) {
          // console.log('> file: ', currentPath);
          // if (needToFormat(currentPath)) {
          //   // console.log('needToFormat: ', currentPath)
          //   // console.log('hasFormat: ', format(currentPath))
          // }
        } else if (isDir(stats)) {

          dirs.push('**')

          // console.log('> dir: ', currentPath)
        }
        const l2 = dirs.length
        if (l1 > 0 && l1 === l2) {
          if (!hasDo) {
            hasDo = true
            console.log('end1: ', dirs)
          }
        }
      })
    }
  })
}
findAndFormat(srcDirPath)
console.log(srcDirPath)
