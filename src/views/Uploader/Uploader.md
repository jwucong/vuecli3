# Uploader

#### 1. 组件的props(支持\<input type="file"\>所有的原生属性)

| prop | type | required | default | remarks |
| :---  | :---  | :---     | :---     | :--- |
| title | String | N |  | 标题 |
| byte-base | Number, String | N | 1024 | 字节的基本换算单位，1000或1024 |
| max-size | Number, String | N |  | 上传的图片大小限制，不设置则不限制 |
| max-count | Number, String | N |  | 上传的图片数量限制，不设置则不限制 |
| thumbnail-fit | Number, String | N |  0.15 | 缩略图填充模式，可选值: <br /> **none**: 保持原图尺寸 <br /> **fill**: 不保持宽高比填满整个容器 <br /> **cover**: 保持宽高比，把较短的边拉伸到充满容器，较长的边被裁剪 <br /> **contain**: 保持宽高比，把较长的边缩放到充满容器，较短的边居中两边留白 <br /> **数字**:  数字的绝对值表示图片可视为正方形的程度，可视为正方形则使用fill，否则用contain |
