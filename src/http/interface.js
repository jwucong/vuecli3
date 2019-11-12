import axios from './axios';
import { type } from '@/utils';

const post = (...args) => axios.post.apply(null, args);

export const formDataUpload = (url, formData, config) => {
	const dataType = type(formData);
	const acceptType = ['Object', 'FormData'];
	if (acceptType.indexOf(dataType) === -1) {
		throw Error('formData must be an plain Object or instance of FormData');
	}
	let data = null;
	if (dataType === 'Object') {
		const form = new FormData();
		for (const key in formData) {
			if (Object.prototype.hasOwnProperty.call(formData, key)) {
				form.append(key, formData[key]);
			}
		}
		data = form;
	}
	return post(
		url,
		data || formData,
		Object.assign(
			{
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			},
			config
		)
	);
};

export const postTest = data => axios.post('/post', data);

export const upload = data =>
	formDataUpload('http://192.168.111.101:2840/upload', data);
