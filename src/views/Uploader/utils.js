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

export const getExtension = file => {
  if(!file) {
    return ''
  }
  const type = typeof file
  const byName = name => {
    const p = /.+\.([^\.]+)$/i.exec(name)
    return p ? p[1] : ''
  }
  const byType = type => {
    const p = /.+\/([^\/]+)$/i.exec(type)
    return p ? p[1] : ''
  }
  if(type === 'string') {
    return parseBase64(file).type || byName(file) || byType(file)
  }
  if(type === 'object' && (file.name || file.type)) {
    return byName(file.name) || byType(file.type)
  }
  return ''
}

export const newFile = (file, base64, res) => {
  const desc = value => ({
    configurable: false,
    writable: false,
    enumerable: true,
    value: value || null
  })
  const freeze = obj => Object.freeze(obj)
  const plain = obj => Object.assign(Object.create(null), obj)
  const props = {
    isUploaderFile: desc(true),
    name: desc(file.name),
    type: desc(file.type),
    size: desc(file.size),
    raw: desc(file),
    extension: desc(getExtension(file)),
    lastModified: desc(file.lastModified || Date.now()),
    lastModifiedDate: desc(file.lastModifiedDate || new Date()),
    blob: desc(() => base64 ? base64ToBlob(base64) : null),
    base64: desc(() => base64 || ''),
    uploadResponse: desc(res ? freeze(plain(res)) : null)
  }
  return freeze(Object.defineProperties(plain(), props))
}

export const readFile = (file, resultType, encoding) => {
  return new Promise((resolve, reject) => {
    if(resultType === 'file') {
      return resolve(file)
    }
    const reader = new FileReader()
    reader.onload = function () {
      resolve(this.result)
    }
    reader.onerror = function (event) {
      reader.abort()
      reject(event)
    }
    if (resultType === 'text') {
      reader.readAsText(file, encoding || 'utf-8')
    } else if(resultType === 'buffer') {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsDataURL(file)
    }
  })
}