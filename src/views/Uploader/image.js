import {
  base64ToArrayBuffer,
  readFile
} from "./utils";

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
  console.log('ctx.transform args: ', args)
  ctx.transform.apply(ctx, args)
};

export const newImage = (file) => {
  return new Promise((resolve, reject) => {
    readFile(file).then(base64 => {
      const or = getOrientation(base64)
      console.log('or: ', or)
      loadImage(base64).then(image => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        fixOrientation(canvas, or)
        ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight)
        const url = canvas.toDataURL(file.type)
        resolve(url)
      })
    })
  })
}