// const fs = require('fs')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const upload = require('./upload')
const {getLocalIP} = require('./utils')

const resolve = file => path.join(__dirname, '.', file)

const app = express();

app.all('*', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By", ' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});


// static
app.use(express.static(resolve('uploads')))

// index.html
// app.get('/', (req, res) => {
//   res.sendFile(resolve('public/index.html'))
// })


// upload
app.post('/upload', upload.any(), bodyParser.json(), function (req, res) {
  console.log('req.files: ', req.files)
  console.log('req.body: ', req.body)
  const file = req.files[0]
  const url = file ? file.path : ''
  res.send(JSON.stringify({
    code: 1,
    msg: 'OK',
    data: Object.assign({url}, req.body)
  }))
})

const host = getLocalIP()
const port = 2840
const server = app.listen(port, host, () => {
  console.log(`express服务启动成功，访问地址为: http://${host}:${port}`)
})