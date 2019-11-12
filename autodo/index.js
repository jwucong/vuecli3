/**
 * Created by H
 * User: huangcan
 * Date: 2019/11/12
 * Time: 1:29 下午
 * tips:
 */
(async function () {
  const fs = require('fs')
  const path = require('path')
  const {exec} = require('child_process')
  const relative = (file) =>
      path.resolve(__dirname, file)
  const cli = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
  const appletsPath = []

  async function readAppletsPath(path, excludes) {
    return new Promise((resolve, reject) => {
      fs.readdir(relative(path), (err, files) => {
        files.forEach((v) => {
          if (excludes && excludes.includes(v)) {
            return
          }
          if (v.search(/[\u4e00-\u9fa5]/) !== -1 && !v.includes('xlsx')) {
            appletsPath.push(`${path}/${v}`)
          }
        })
        resolve()
      })
    })
  }

  await readAppletsPath('../smallprogram', ['云南', '山东'])

  await readAppletsPath('../smallprogram/云南')

  await readAppletsPath('../smallprogram/山东')

  function promise(cli) {
    return new Promise((resolve, reject) => {
      exec(cli, (error, stdout, stderr) => {
        if (error) {
          console.error(`执行的错误: ${error}`)
          resolve()
          return
        }
        console.log(`执行成功 : ${stdout}`)
        console.log(`${stderr}`)
        resolve()
      })
    })
  }

  async function automationUpload(path, i) {
    // 打开项目所在路径
    await promise(`${cli} -o ${relative(path)}`)
    // 上传代码
    await promise(`${cli} -u 1.1.0@${relative(path)} --upload-desc 'initial release'`)

    console.log(`当前为第${i}个小程序的代码已上传完毕`)

    return Promise.resolve()
  }

  console.log(appletsPath.length, appletsPath)

  function sequence() {
    console.log(`一共需要上传小程序数量为${appletsPath.length}`)
    appletsPath.reduce(async (prev, next, i) => {
      await prev
      return automationUpload(next, i + 1)
    }, Promise.resolve())
  }

  sequence()
})()




