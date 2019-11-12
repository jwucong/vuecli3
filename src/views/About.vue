<template>
	<div class="about">
		<label class="label">
			<span>上传图片</span>
			<input type="file" @change="handleFileChange" />
		</label>
		<div class="btn" @click="handleSubmit">提交</div>
	</div>
</template>

<script>
import { upload } from '@/http/interface';

export default {
	name: 'About',
	data() {
		return {
			file: null
		};
	},
	methods: {
		handleFileChange(e) {
			const el = e.target;
			const file = el.files[0];
			this.file = file;
			console.log(file);
		},
		handleSubmit() {
			if (!this.file) {
				return false;
			}
			const data = {
				file: this.file,
				name: 'tesla',
				order: 1,
				link: 'http://baidu.com'
			};
			upload(data).then(res => {
				console.log(res);
				alert('上传成功！');
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.label {
	display: block;
	width: 200px;
	height: 40px;
	border-radius: 6px;
	text-align: center;
	line-height: 40px;
	color: #fff;
	background: darkgreen;

	input {
		display: none;
	}
}

.btn {
	display: block;
	width: 200px;
	height: 40px;
	margin-top: 20px;
	line-height: 40px;
	text-align: center;
	border-radius: 6px;
	color: #fff;
	background: #666;
}
</style>
