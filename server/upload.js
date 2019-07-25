const multer = require('multer')
const mime = require('mime')
const {dateFormatter} = require('./utils')


const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/')
  },
  filename(req, file, cb) {
    const ext = mime.getExtension(file.mimetype);
    const name = dateFormatter(Date.now(), 'yyyyMMddhhmmssms')
    const filename = `${name}.${ext}`
    cb(null, filename)
  }
})

const upload = multer({
  storage: storage,
  fileFilter(req, file, cb) {
    const mime = file.mimetype
    const isImg = /\/(jpe?g|png|gif)$/.test(mime)
    cb(null, isImg)
  }
})

module.exports = upload