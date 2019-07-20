import axios from 'axios'
import URLSearchParams from '@ungap/url-search-params'
import env from './env'

const urls  = {
  'development': 'https://www.easy-mock.com/mock/5d32bfec3583c662df4e5dd2/test/development',
  'test': 'https://www.easy-mock.com/mock/5d32bfec3583c662df4e5dd2/test/test',
  'production': 'https://www.easy-mock.com/mock/5d32bfec3583c662df4e5dd2/test/production',
}

const baseUrl = urls[env]
const urlencoded = 'application/x-www-form-urlencoded'

const config = {
  baseURL: baseUrl,
  withCredentials: false,  // 请求是否需要发送cookie
  headers: {
    'Content-Type': urlencoded
  },
  transformRequest: [function (data, headers) {
    if (!data) {
      return {}
    }
    if (headers.post['Content-Type'] !== urlencoded) {
      return data;
    }
    const params = new URLSearchParams()
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        params.append(key, data[key])
      }
    }
    return params.toString()
  }]
}

const instance = axios.create(config)

// // 如果需要token
// instance.interceptors.request.use(function (config) {
//   const token = localStorage.getItem('token');
//   if(token) {
//     config.headers.token = token
//   }
//   return config;
// }, function (error) {
//   return Promise.reject(error);
// });

instance.interceptors.response.use(function (response) {
  // axios默认http响应状态码为2xx时进入resolved，否则进入rejected
  return response.data;
}, function (error) {
  const res = error.response
  const xhr = res || error.request
  const status = xhr ? xhr.status : ''
  const message = xhr ? xhr.statusText : error.message
  const data = res ? res.data : null
  const tips = status ? `E${status}: ${message}` : message
  const err = {status, message, data, tips}
  return Promise.reject(err);
});

export default instance