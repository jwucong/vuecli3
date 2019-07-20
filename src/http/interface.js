import axios from './axios'

export const postTest = data => axios.post('/post', data)