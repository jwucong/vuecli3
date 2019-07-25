const os = require('os')

const getLocalIP = () => {
  const network = os.networkInterfaces();
  for (const key in network) {
    const interfaces = network[key];
    for (let i = 0; i < interfaces.length; i++) {
      const face = interfaces[i];
      if (face.family === 'IPv4' && face.address !== '127.0.0.1' && !face.internal) {
        return face.address;
      }
    }
  }
  return 'localhost';
};

const dateFormatter = (
  value = new Date(),
  formatter = 'yyyy-MM-dd hh:mm:ss'
) => {
  const date = new Date(value)
  const days = ['日', '一', '二', '三', '四', '五', '六']
  const padStart = (value, digits = 2) => {
    return ('' + value).padStart(digits, '0')
  }
  const map = {
    'yy(yy)?': date.getFullYear(),            // 年  yyyy: 2019  yy: 19
    MM: padStart(date.getMonth() + 1),        // 月
    dd: padStart(date.getDate()),             // 日
    hh: padStart(date.getHours()),            // 时
    mm: padStart(date.getMinutes()),          // 分
    ss: padStart(date.getSeconds()),          // 秒
    ms: padStart(date.getMilliseconds(), 3),  // 毫秒
    da: days[date.getDay()],                  // 星期几
    ts: date.getTime()                        // 时间戳(毫秒)
  }
  for (const key in map) {
    if (Object.hasOwnProperty.call(map, key)) {
      const reg = new RegExp(key, 'g')
      formatter = formatter.replace(reg, match => {
        const value = map[key]
        const isShortYear = match === 'yy'
        return isShortYear ? value.toString().slice(-2) : value
      })
    }
  }
  return formatter
}

module.exports = {
  getLocalIP,
  dateFormatter
}