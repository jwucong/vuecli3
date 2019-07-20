export const type = value => {
  return Object.prototype.toString.call(value).slice(8, -1)
}

export const isNumber = value => 'Number' === type(value)

export const isString = value => 'String' === type(value)

export const isBoolean = value => 'Boolean' === type(value)

export const isFunction = value => 'Function' === type(value)

export const isObject = value => 'Object' === type(value)

export const isArray = value => 'Array' === type(value)

export const isDate = value => 'Date' === type(value)

export const isRegExp = value => 'RegExp' === type(value)

export const isUndefined = value => 'Undefined' === type(value)

export const isNull = value => 'Null' === type(value)

export const isNaN = value => isNumber(value) && value !== value

export const isEmptyValue = value => {
  const typeName = type(value)
  if ('String' === typeName) {
    return value.trim() === ''
  }
  if ('Number' === typeName) {
    return value !== value
  }
  return 'Null' === typeName || 'Undefined' == typeName
}

export const isEmptyObject = obj => !Object.keys(obj).length

export const isValidDate = date => isDate(date) && !isNaN(date.getTime())

/**
 * 日期格式化
 * dateFormatter([value[, formatter]])
 * @param value {string|date}  // 日期
 * @param formatter {string}   // 格式模板
 * @returns {string}
 */
export const dateFormatter = (
  value = new Date(),
  formatter = 'yyyy-MM-dd hh:mm:ss'
) => {
  const date = isDate(value) ? value : new Date(value)
  if (!isValidDate(date)) {
    return 'Invalid Date'
  }
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