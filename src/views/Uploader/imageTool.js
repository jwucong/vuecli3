import {
  exec,
  hasKey,
  getType,
  plainObject,
  sizeToBytes,
  readFile,
  blobToBase64,
  base64ToArrayBuffer, bytesToSize
} from "./utils"


export const isCanvasSupport = () => {
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


export const fixOrientation = (canvas, ctx, orientation) => {
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
  const p = [1, 0, 0, 1, 0, 0]
  ctx.transform.apply(ctx, map[orientation] || p)
};

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
  })
}

const drawImage = (canvas, ctx, image, w0, h0) => {
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
}

const output = (blob, resultType) => {
  return new Promise((resolve, reject) => {
    if (getType(blob) !== 'Blob') {
      return reject(`${blob} is not instanceof Blob`)
    }
    // blob.name = file.name
    blob.lastModified = Date.now()
    blob.lastModifiedDate = new Date()
    if (resultType === 'base64') {
      blobToBase64(blob, resolve, reject);
    } else {
      resolve(blob)
    }
  })
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
let i = 0
const sCompressor = (next, blob, img, canvas, ctx, mime, ops, min, max) => {
  console.log('sCompressor min: ', min)
  console.log('sCompressor max: ', max)
  const ratio = img.naturalWidth / img.naturalHeight
  const point = Math.floor(min + (max - min) / 2)
  const delta = max - min
  // if (ratio < 0) {
  //   canvas.height = point;
  //   canvas.width = Math.floor(point * ratio);
  // } else {
  //   canvas.width = point;
  //   canvas.height = Math.floor(point / ratio);
  // }
  canvas.width = point
  canvas.height = Math.floor(point / ratio)
  console.log('sCompressor ratio: ', ratio)
  console.log('sCompressor canvas.width: ', canvas.width)
  console.log('sCompressor canvas.height: ', canvas.height)
  console.log('sCompressor canvas.r: ', canvas.width / canvas.height)
  drawImage(canvas, ctx, img)
  if(ops.fixOrientation) {
    fixOrientation(canvas, ctx, ops.orientation)
  }
  const handler = blob => {
    // if(++i === 20) {
    //   return next(blob)
    // }
    console.log('sCompressor blob.s: ', bytesToSize(blob.size))
    if(Math.abs(blob.size - ops.size) <= ops.error || min === max) {
      return next(blob)
    }
    const p = blob.size > ops.size ? [min, point] : [point, max]
    console.log('sCompressor p: ', p)
    if(p[0] === min && p[1] === max) {
      return next(blob)
    }
    const param = [next, blob, img, canvas, ctx, mime, ops].concat(p)
    sCompressor.apply(null, param)
  }
  console.log('sCompressor sQuality: ', ops.sQuality)
  console.log('sCompressor point: ', point)
  canvas.toBlob(handler, mime, ops.sQuality)
}


export const compressor = (file, options = {}) => {
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
          fixOrientation(canvas, ctx, orientation)
        }
        drawImage(canvas, ctx, image)
        const scOps = plainObject({}, ops, {
          orientation,
          sQuality: ops.minQuality
        })
        const sNext = blob => {
          if(getType(blob) !== 'Blob') {
            return reject(blob)
          }
          // if(Math.abs(blob.size - ops.size) <= ops.error ) {
          //   return resolve(blob)
          // }
          return resolve(blob)
        }
        const next = blob => {
          if(getType(blob) !== 'Blob') {
            return reject(blob)
          }
          if(Math.abs(blob.size - ops.size) <= ops.error || ops.fixedSize) {
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
        qCompressor(
          next,
          canvas,
          fileType,
          ops.size,
          ops.error,
          ops.quality,
          ops.minQuality,
          1
        )
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
