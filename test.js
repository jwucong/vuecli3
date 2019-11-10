const getType = value => {
  return Object.prototype.toString.call(value).slice(8, -1)
}

const compressorOptions = {
  width: 'auto', // auto or percentage or number
  height: 'auto', // auto or percentage or number
  minWidth: 'auto',
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
const isNumber = value => getType(value) === 'Number'
const isPercent = value => /\%$/.test(value);
const int = value => parseInt(value, 10)
const float = value => parseFloat(value)
const intOrPercent = value => isPercent(value) ? value : int(value)
const safety = (value, min = 0, max = 100) => {
  return value > max ? max : value < min ? min : value
}

const getSize = (ops, w0, h0) => {
  const lock = !!ops.lockAspect
  const r = w0 / h0
  console.log('r: ', r)
  const gw = h => Math.floor(h * r)
  const gh = w => Math.floor(w / r)
  const gn = (v, n) => {
    return isPercent(v) ? (float(v) || 100) / 100 * n : int(v) || n
  }
  const gwh = (w, h, f) => {
    if (isStr(w, 'auto') && isStr(h, 'auto')) {
      const s = f()
      console.log('s: ', s)
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
  let mw = ops.minWidth
  let mh = ops.minHeight
  // calc minWidth and minHeight
  if (isStr(mw, 'auto') && isStr(mh, 'auto')) {
    if (lock) {
      mw = r > 0 ? r * 100 : 100
      mh = gh(mw)
    } else {
      mw = mh = 1
    }
  } else {
    if (isStr(mw, 'auto')) {
      mh = gn(mh, h0)
      mw = gw(mh)
    } else if (isStr(mh, 'auto')) {
      mw = gn(mw, w0)
      mh = gh(mw)
    } else {
      mw = gn(mw, w0)
      mh = lock ? gh(mw) : gn(mh, h0)
    }
  }
  mw = safety(mw, 1, w0)
  mh = safety(mh, 1, h0)

  // calc width and height
  // let w = ops.width
  // let h = ops.height
  const mwh = gwh(ops.minWidth, ops.minHeight, () => {
    if (!lock) {
      return {w: 1, h: 1}
    }
    const
    const
    return {w, h}
  })
  const wh = gwh(ops.width, ops.height, () => ({w: w0, h: h0}))

  console.log(mw)
  console.log(mh)
  console.log(mwh)
  console.log(wh)

}

const pic1 = {w: 2976, h: 3968}
const pic2 = {w: 3968, h: 2976}

getSize(compressorOptions, pic1.w, pic1.h)
