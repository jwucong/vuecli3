export const getType = value => {
  return Object.prototype.toString.call(value).slice(8, -1)
}

export const exec = function(fn) {
  if(typeof fn === 'function') {
    return fn.apply(this, Array.prototype.slice.call(arguments, 1))
  }
}

export const sizeToBytes = (size, base = 1024) => {
  const pattern = /^\s*\+?((?:\.\d+)|(?:\d+(?:\.\d+)?))\s*([a-z]*)\s*$/i;
  const p = pattern.exec(size)
  if (!p) {
    return NaN
  }
  const units = ['B', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'B', 'N', 'D']
  const value = parseFloat(p[1])
  const unit = p[2]
  let index = -1
  for (let i = 0; i < units.length; i++) {
    const str = '^' + units[i] + (i === 0 ? '(?:yte)' : 'b') + '?$'
    const reg = new RegExp(str, 'i')
    if (reg.test(unit)) {
      index = i
      break
    }
  }
  if (isNaN(value) || value < 0 || index < 0) {
    return NaN
  }
  return Math.ceil(value * Math.pow(base, index))
}


export const parseBase64 = base64 => {
  const reg = /data:([^;]+);base64,(.+)?/i
  const match = reg.exec(base64)
  const result = {type: '', data: ''}
  if(match) {
    result.type = match[1] || ''
    result.data = match[2] || ''
  }
  return result
}

export const base64ToArrayBuffer = base64 => {
  const {data} = parseBase64(base64)
  const binary = atob(data);
  const size = binary.length;
  const buffer = new ArrayBuffer(size);
  let view = new Uint8Array(buffer);
  for (let i = 0; i < size; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export const base64ToBlob = base64 => {
  const buffer = base64ToArrayBuffer(base64)
  const {type} = parseBase64(base64)
  return new Blob([buffer], {type})
}

export const blobToBase64 = (blob, success, error) => {
  const reader = new FileReader()
  reader.onload = function () {
    exec(success, reader.result)
  }
  reader.onerror = function (event) {
    reader.abort()
    exec(error, event)
  }
  reader.readAsDataURL(blob)
}


export const fileToBlob = (file, success, error) => {
  if(getType(file) === 'Blob') {
    return exec(success, file)
  }
  const reader = new FileReader()
  reader.onload = function () {
    const type = file.type
    const blob = new Blob([this.result], {type})
    exec(success, blob)
  }
  reader.onerror = function (event) {
    reader.abort()
    exec(error, event)
  }
  reader.readAsArrayBuffer(file)
}
