import {
  exec,
  hasKey,
  getType,
  plainObject,
  sizeToBytes,
  readFile,
  parseBase64,
  blobToBase64,
  base64ToBlob,
  base64ToArrayBuffer,
  bytesToSize,
} from "./utils"


export const canvasSupport = () => {
  const canvas = document.createElement('canvas');
  if (!canvas) {
    return false;
  }
  if (typeof canvas.getContext !== 'function') {
    return false;
  }
  if (typeof canvas.toBlob !== 'function') {
    return false;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return false;
  }
  if (typeof ctx.drawImage !== 'function') {
    return false;
  }
  return true;
};

export const loadImage = src => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = event => {
      const msg = `Failed to load image from src: ${src}`
      reject(new Error(msg))
    }
    image.setAttribute('src', src)
  })
}

export const getOrientation = base64 => {
  // -1 not defined
  // -2 not jpeg
  const buffer = base64ToArrayBuffer(base64)
  const view = new DataView(buffer);
  if (view.getUint16(0, false) != 0xffd8) {
    return -2;
  }
  const size = view.byteLength;
  let offset = 2;
  while (offset < size) {
    if (view.getUint16(offset + 2, false) <= 8) {
      return -1;
    }
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker == 0xffe1) {
      if (view.getUint32((offset += 2), false) != 0x45786966) {
        return -1;
      }
      const little = view.getUint16((offset += 6), false) == 0x4949;
      offset += view.getUint32(offset + 4, little);
      const tags = view.getUint16(offset, little);
      offset += 2;
      for (let i = 0; i < tags; i++) {
        if (view.getUint16(offset + i * 12, little) == 0x0112) {
          return view.getUint16(offset + i * 12 + 8, little);
        }
      }
    } else if ((marker & 0xff00) != 0xff00) {
      break;
    } else {
      offset += view.getUint16(offset, false);
    }
  }
  return -1;
};


export const fixOrientation = (canvas, orientation) => {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  if (orientation > 4) {
    canvas.width = h;
    canvas.height = w;
  }
  const map = {
    '2': [-1, 0, 0, 1, w, 0],
    '3': [-1, 0, 0, -1, w, h],
    '4': [1, 0, 0, -1, 0, h],
    '5': [0, 1, 1, 0, 0, 0],
    '6': [0, 1, -1, 0, h, 0],
    '7': [0, -1, -1, 0, h, w],
    '8': [0, -1, 1, 0, 0, w]
  }
  const args = map[orientation] || [1, 0, 0, 1, 0, 0]
  ctx.transform.apply(ctx, args)
};

export const getCutOrigin = (image, cw, ch, orientation) => {
  console.group('getCutOrigin')
  const {naturalWidth: w0, naturalHeight: h0} = image
  console.log('orientation: %o', orientation)
  console.log('w0: %o, h0: %o', w0, h0)
  console.log('cw: %o, ch: %o', cw, ch)
  const setOrigin = (x = 0, y = 0) => {
    const o = {x, y}
    console.log('origin:', o)
    console.groupEnd()
    return o
  }
  const abs = Math.abs
  const dir = parseInt(orientation, 10)
  console.log('dir: ', dir)

  switch (dir) {
    case 2: return setOrigin(abs(w0 - cw), 0)
    case 3: return setOrigin(abs(w0 - cw), abs(h0 -ch))
    case 4: return setOrigin(0, abs(h0 -ch))
    case 5: return setOrigin(0, 0)
    case 6: return setOrigin(0, abs(h0 - cw))
    case 7: return setOrigin(abs(w0 - ch), abs(h0 -cw))
    case 8: return setOrigin(abs(w0 - ch), 0)
    default: return setOrigin(0, 0)
  }
}

export const getPreviewInfo = (file, fix = true, quality) => {
  if (!canvasSupport()) {
    const msg = 'Canvas is not supported on this device.'
    return Promise.reject(msg)
  }
  const getBase64 = (image, base64) => {
    if (!fix) {
      return base64
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    fixOrientation(canvas, getOrientation(base64))
    ctx.drawImage(image, 0, 0)
    return canvas.toDataURL(file.type, quality)
  }
  const result = (image, base64) => Object.freeze(plainObject({
    name: file.name,
    type: file.type,
    width: image.naturalWidth,
    height: image.naturalHeight,
    getBase64: () => getBase64(image, base64),
    getBlob: () => base64ToBlob(getBase64(image, base64))
  }))
  const load = base64 => {
    return loadImage(base64).then(image => {
      return Promise.resolve(result(image, base64))
    }).catch(e => Promise.reject(e))
  }
  return readFile(file).then(load).catch(e => Promise.reject(e))
}

const compressorOptions = {
  width: '100%', // auto or percentage or number
  height: 'auto', // auto or percentage or number
  minWidth: '60%',
  minHeight: 'auto',
  lockAspect: true,
  quality: 75,  // low:30, medium:60, high:75, higher:90, best:100
  minQuality: 60,
  error: '30kb',
  maxSize: '800kb',
  priority: '800kb',
  output: 'base64'  // base64 or blob
}

const isStr = (val, text) => {
  const flag = typeof val === 'string'
  return text ? flag && val.toLowerCase() === text.toLowerCase() : flag
}
const isPercent = value => /\%$/.test(value);
const int = value => parseInt(value, 10)
const float = value => parseFloat(value)
const safety = (value, min = 0, max = 100) => {
  return value > max ? max : value < min ? min : value
}
const unsetIsTrue = value => {
  return value === undefined ? true : !!value
}

const getSize = (ops, w0, h0, lock) => {
  let fixedSize = true
  const r = w0 / h0
  const gw = h => Math.floor(h * r)
  const gh = w => Math.floor(w / r)
  const gn = (v, n) => {
    return isPercent(v) ? (float(v) || 100) / 100 * n : int(v) || n
  }
  console.log('or: ', r)
  const gwh = (w, h, f) => {
    w = float(w) ? w : 'auto'
    h = float(h) ? h : 'auto'
    if (isStr(w, 'auto') && isStr(h, 'auto')) {
      const s = f()
      w = s.w
      h = s.h
    } else {
      if (isStr(w, 'auto')) {
        h = gn(h, h0)
        w = gw(h)
      } else if (isStr(h, 'auto')) {
        w = gn(w, w0)
        h = gh(w)
      } else {
        w = gn(w, w0)
        h = lock ? gh(w) : gn(h, h0)
      }
    }
    w = safety(Math.floor(w), 1, w0)
    h = safety(Math.floor(h), 1, h0)
    return {w, h}
  }
  const mwh = gwh(ops.minWidth, ops.minHeight, () => {
    const decimals = /^\d+\.(\d+)$/.exec(r)
    const t2 = Math.floor(100 * r)
    const t1 = Math.floor(10 * r)
    let w = 1, h = 1
    if (lock) {
      if (decimals) {
        w = w0 > t2 ? t2 : w0 > t1 ? t1 : w0
        h = gh(w)
      } else {
        w = r > 1 ? gw(h) : w
        h = gh(w)
      }
    }
    return {w, h}
  })
  const wh = gwh(ops.width, ops.height, () => {
    fixedSize = false
    return {w: w0, h: h0}
  })
  return plainObject({
    fixedSize,
    width: wh.w,
    height: wh.h,
    minWidth: mwh.w,
    minHeight: mwh.h
  })
}

const getQuality = (val, min = 0, max = 100) => {
  const w2q = (word = '') => {
    switch (word.toLowerCase()) {
      case 'low':
        return 30
      case 'medium':
        return 60
      case 'high':
        return 75
      case 'higher':
        return 90
      case 'best':
        return 100
      default:
        return 0
    }
  }
  return safety(int(val) || w2q(val), min, max) / 100
}

const getBaseOptions = (ops, fsi) => {
  const mq = getQuality(ops.minQuality)
  let si = sizeToBytes(ops.size)
  const size = si ? si > fsi ? fsi : si : null
  return plainObject({
    size,
    minQuality: mq,
    quality: safety(getQuality(ops.quality) || getQuality('high'), mq),
    error: sizeToBytes(ops.error || '50kb'),
    output: isStr(ops.output, 'blob') ? 'blob' : 'base64',
    lockAspect: unsetIsTrue(ops.lockAspect),
    fixOrientation: unsetIsTrue(ops.fixOrientation),
    priority: isStr(ops.priority, 'size') ? 'size' : 'quality'
  })
}

const drawImage = (canvas, image, sw, sh, orientation) => {
  // const {naturalWidth: w0, naturalHeight: h0} = image

  let {width, height} = canvas
  const o = getCutOrigin(image, width, height, orientation)
  const {x, y} = o
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height)
  // ctx.drawImage(image, 0, 0, w, h, 0, 0, width, height)
  console.log('drawImage sw: %o, sh: %o', sw, sh)
  console.log('drawImage width: %o, height: %o', width, height)
  console.log('drawImage o.x: %o, o.y: %o', o.x, o.y)
  ctx.drawImage(image, x, y, sw, sh, 0, 0, sw, sh)
}

const genC = (...args) => {
  return new Promise((resolve, reject) => {

  })
}

const qco = (canvas, mime, size, error, min, max) => {
  return new Promise((resolve, reject) => {
    const fn = (canvas, mime, size, error, min, max) => {
      const q = size ? min + (max - min) / 2 : max;
      const cycle = p => p[0] === min && p[1] === max
      const hit = bs => Math.abs(bs - size) <= error
      const lt = threshold => Math.abs(max - min) <= threshold
      const cb = blob => {
        const bs = blob.size
        console.log('qco bs: ', bytesToSize(bs))
        const p = bs > size ? [min, q] : [q, max]
        if (!size || hit(bs) || cycle(p) || lt(0.01)) {
          return resolve(blob)
        }
        fn.apply(null, [canvas, mime, size, error].concat(p))
      }
      const jpg = /jpe?g$/i.test(mime)
      const args = [cb, mime].concat(jpg ? q : [])
      console.log('qco args: ', args)
      try {
        canvas.toBlob.apply(canvas, args)
      } catch (e) {
        reject(e)
      }
    }
    fn(canvas, mime, size, error, min, max)
  })
}

const sco = (canvas, image, mime, ops, dir, minW, maxW, minH, maxH) => {
  return new Promise((resolve, reject) => {
    const fn = (canvas, image, mime, ops, dir, minW, maxW, minH, maxH) => {
      const {naturalWidth: w0, naturalHeight: h0} = image
      const {size, error, minQuality, lockAspect: lock} = ops
      const r0 = w0 / h0
      const findPoint = (min, max) => Math.floor(min + (max - min) / 2)
      let w = 0, h = 0
      if(size) {
        if(lock) {
          w = findPoint(minW, maxW)
          h = Math.floor(w / r0)
        } else {
          w = findPoint(minW, maxW)
          w = w <= minW ? minW : w
          h = w <= minW ? findPoint(minH, maxH) : maxH
          h = h <= minH ? minH : h
        }
      } else {
        w = maxW
        h = maxH
      }
      canvas.width = w
      canvas.height = h
      ops.fixOrientation && fixOrientation(canvas, dir)
      drawImage(canvas, image, w, h, dir)
      console.log('sco args w: %o, h: %o', w, h)
      console.log('sco args r0: %o, r1: %o', r0, w / h)
      const hit = bs => Math.abs(bs - size) <= error
      const same = (a, b) => a - b === 0
      const cb = blob => {
        console.log('sco blob.size: ', bytesToSize(blob.size))
        const bs = blob.size
        const pw = bs > size ? [minW, w] : [w, maxW]
        const ph = bs > size ? [minH, h] : [h, maxH]
        const sw = same(pw[0], minW) && same(pw[1], maxW)
        const sh = same(ph[0], minH) && same(ph[1], maxH)
        if (!size || hit(bs) || sw && sh) {
          return resolve(blob)
        }
        const fnArgs = [canvas, image, mime, ops, dir].concat(pw, ph)
        console.log('sco args: ', fnArgs)
        fn.apply(null, fnArgs)
      }
      const jpg = /jpe?g$/i.test(mime)
      const args = [cb, mime].concat(jpg ? minQuality : [])
      try {
        canvas.toBlob.apply(canvas, args)
      } catch (e) {
        reject(e)
      }
    }
    fn(canvas, image, mime, ops, dir, minW, maxW, minH, maxH)
  })
}

const fileChecker = file => {
  const type = getType(file).toLowerCase()
  const result = (pass = false, base64 = null) => ({pass, base64})
  if(typeof file === 'string') {
    return parseBase64(file).type
  }
  if (['file', 'blob'].indexOf(type) === -1) {

  }
}

const co = (file, options = {}) => {
  const exit = reason => Promise.reject(reason)
  const png = type => /png$/i.test(type)
  const jpg = type => /jpe?g$/i.test(type)
  const supported = type => png(type) || jpg(type)
  const fileTypeError = () => {
    return exit(new Error('Only JPG and PNG files are supported.'))
  }
  const type = getType(file).toLowerCase()
  console.log('type: ', type)
  let base64 = null
  if (['file', 'blob'].indexOf(type) === -1) {
    if(typeof file !== 'string') {
      const msg = 'The arguments[0] must be one of File, Blob or base64.'
      return exit(new Error(msg))
    }
    const info = parseBase64(file)
    if(!supported(info.type)) {
      return fileTypeError()
    }
    if(!info.data) {
      return exit(new Error('Base64 has no data.'))
    }
    base64 = file
  }
  const fileType = file.type;
  if (!supported(fileType)) {
    return fileTypeError()
  }
  const fileSize = base64 ? Math.round(base64.data * 3 / 4) : file.size
  const load = url => {
    base64 = url
    return loadImage(url)
  }
  const next = image => {
    const w0 = image.naturalWidth
    const h0 = image.naturalHeight
    const baseOps = getBaseOptions(options, fileSize)
    const sizeOps = getSize(options, w0, h0, baseOps.lockAspect)
    const orientation = getOrientation(base64)
    const ops = plainObject({}, baseOps, sizeOps)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = ops.width;
    canvas.height = ops.height;
    ops.fixOrientation && fixOrientation(canvas, orientation)
    console.log('ops: ', ops)
    drawImage(canvas, image, ops.width, ops.height, orientation)
    const {size, error, quality, minQuality, fixedSize} = ops
    const useSco = size && !fixedSize
    const qcoArgs = [canvas, fileType, size, error, minQuality, quality]
    const scoSize = [ops.minWidth, ops.width, ops.minHeight, ops.height]
    const scoArgs = [canvas, image, fileType, ops, orientation].concat(scoSize)
    const reject = msg => Promise.reject(msg)
    if(!useSco) {
      return qco.apply(null, qcoArgs)
    }
    const testArgs = [canvas, fileType, null, error, minQuality, minQuality]
    return qco.apply(null, testArgs).then(blob => {
      console.log('test blob.size: ', bytesToSize(blob.size))
      if(blob.size > size + error) {
        console.log('run sco...')
        return sco.apply(null, scoArgs)
      }
      if(Math.abs(blob.size - size) <= error) {
        console.log('wow...')
        return Promise.resolve(blob)
      }
      console.log('run qco again...')
      return qco.apply(null, qcoArgs)
    }, reject)
  }
  if(base64) {
    return load(base64).then(next, exit)
  }
  return readFile(file).then(load, exit).then(next, exit)
}

const qCompressor = (next, canvas, mime, size, error, quality, min = 0, max = 1) => {
  const jpg = /jpe?g$/i.test(mime)
  const q = size ? min + (max - min) / 2 : quality;
  const threshold = 0.01;
  const delta = max - min;
  const handler = blob => {
    if (!size || Math.abs(blob.size - size) <= error || delta <= threshold) {
      return next(blob)
    }
    const p = blob.size > size ? [min, q] : [q, max]
    const param = [next, canvas, mime, size, error, quality].concat(p)
    qCompressor.apply(null, param)
  }
  const args = [handler, mime].concat(jpg ? q : [])
  console.log('args: ', args)
  canvas.toBlob.apply(canvas, args)
}

const qc = (canvas, fileType, ops) => {
  const {size, error, quality, min, max} = ops
  const qt = 0.01
  const st = 0
  const jpg = /jpe?g$/i.test(fileType)
  const compressEnd = (s, threshold) => {
    return Math.abs(s - size) <= error || max - min <= threshold
  }
  const exec = (threshold, next, body) => blob => {
    if (!size || compressEnd(blob.size, threshold)) {
      return next(blob)
    }
    return body(threshold, next, blob)
  }
  const qCompressor = () => {

  }
  return new Promise((resolve, reject) => {

  })
}
const sc = (canvas, mime, image, width, height, lock, fix, orientation, quality) => {
  console.log('sc: ', canvas, mime, image, width, height, lock, fix, orientation, quality)
  return new Promise((resolve, reject) => {
    canvas.width = width
    canvas.height = height
    drawImage(canvas, image, width, height, lock)
    fix && fixOrientation(canvas, orientation)
    try {
      canvas.toBlob(resolve, mime, quality)
    } catch (e) {
      reject(e)
    }
  })
}

const sCompressor = (next, blob, img, canvas, ctx, mime, ops, min, max) => {
  console.log('sCompressor min: ', min)
  console.log('sCompressor max: ', max)
  const ratio = img.naturalWidth / img.naturalHeight
  const point = Math.floor(min + (max - min) / 2)
  canvas.width = point
  canvas.height = Math.floor(point / ratio)
  console.log('sCompressor orientation: ', ops.orientation)
  console.log('sCompressor ratio: ', ratio)
  console.log('sCompressor canvas.width: ', canvas.width)
  console.log('sCompressor canvas.height: ', canvas.height)
  console.log('sCompressor canvas.r: ', canvas.width / canvas.height)
  drawImage(canvas, img)
  // if(ops.fixOrientation) {
  //   fixOrientation(canvas, ops.orientation)
  // }
  console.log('sCompressor canvas.width2: ', canvas.width)
  console.log('sCompressor canvas.height2: ', canvas.height)
  const handler = blob => {
    console.log('sCompressor blob.s: ', bytesToSize(blob.size))
    if (Math.abs(blob.size - ops.size) <= ops.error || min === max) {
      return next(blob)
    }
    const p = blob.size > ops.size ? [min, point] : [point, max]
    console.log('sCompressor p: ', p)
    if (p[0] === min && p[1] === max) {
      return next(blob)
    }
    const param = [next, blob, img, canvas, ctx, mime, ops].concat(p)
    console.log('sCompressor handler param: ', param)
    sCompressor.apply(null, param)
  }
  console.log('sCompressor sQuality: ', ops.sQuality)
  console.log('sCompressor point: ', point)
  const param = [handler, mime, ops.sQuality]
  console.log('sCompressor param: ', param)
  canvas.toBlob.apply(canvas, param)
}


export const compressor = (file, options = {}) => {
  console.log('compressor: ', file)
  return co(file, options);
  return new Promise((resolve, reject) => {
    const type = getType(file).toLowerCase()
    if (['file', 'blob'].indexOf(type) === -1) {
      return reject(new Error('Not a file'))
    }
    const fileType = file.type;
    console.log('fileType: ', fileType)
    const png = /png$/i.test(fileType);
    const jpg = /jpe?g$/i.test(fileType);
    console.log('png: ', png)
    console.log('jpg: ', jpg)
    if (!(jpg || png)) {
      return reject(new Error('Only JPG and PNG files are supported'))
    }
    readFile(file).then(base64 => {
      loadImage(base64).then(image => {
        const w0 = image.naturalWidth
        const h0 = image.naturalHeight
        const baseOps = getBaseOptions(options, file.size)
        const sizeOps = getSize(options, w0, h0, baseOps.lockAspect)
        const orientation = getOrientation(base64)
        const ops = plainObject(baseOps, sizeOps)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = ops.width;
        canvas.height = ops.height;
        if (ops.fixOrientation) {
          fixOrientation(canvas, orientation)
        }
        // drawImage(canvas, image)
        ctx.drawImage(image, 0, 0, w0, h0)
        const scOps = plainObject({}, ops, {
          orientation,
          sQuality: ops.minQuality
        })
        const sNext = blob => {
          if (getType(blob) !== 'Blob') {
            return reject(blob)
          }
          // if(Math.abs(blob.size - ops.size) <= ops.error ) {
          //   return resolve(blob)
          // }
          return resolve(blob)
        }
        const next = blob => {
          if (getType(blob) !== 'Blob') {
            return reject(blob)
          }
          if (Math.abs(blob.size - ops.size) <= ops.error || ops.fixedSize) {
            return resolve(blob)
          }
          sCompressor(
            sNext,
            blob,
            image,
            canvas,
            ctx,
            fileType,
            scOps,
            ops.minWidth,
            ops.width
          )
        }
        // qCompressor(
        //   next,
        //   canvas,
        //   fileType,
        //   ops.size,
        //   ops.error,
        //   ops.quality,
        //   ops.minQuality,
        //   1
        // )
        console.log('baseOps: ', baseOps)
        console.log('sizeOps: ', sizeOps)
        console.log('ops: ', ops)
        console.log('w0: ', w0)
        console.log('h0: ', h0)
        console.log('fileSize: ', file.size)
      }).catch((e) => {
        console.log(e)
        reject(new Error('Load image error'))
      })
    }).catch(() => {
      reject(new Error('File read failed'))
    })
  })


}
