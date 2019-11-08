/* eslint-disable */
<template>
  <div class="uploader" :class="{'uploader-disabled': disabled}">
    <div class="uploader-header">
      <slot name="header">
        <div v-if="title" class="uploader-title">{{title}}</div>
      </slot>
    </div>
    <div class="uploader-list">
      <div
        class="uploader-list-item"
        v-for="image in previewList"
        :key="image.src">
        <div class="uploader-pic-box">
          <img :class="getPicClass(image)" :src="image.src" alt="">
        </div>
      </div>
      <div class="uploader-list-item">
        <label class="uploader-btn">
          <i class="uploader-btn-icon"></i>
          <input type="file" v-bind="$attrs" @change="onChange">
        </label>
      </div>
    </div>
  </div>
</template>

<script>
  /* eslint-disable */
  // QiniuCloud

  /**
   * 事件
   * 1. over: after oversize of overcount trigger payload{type: size/count, value, limit}
   * 2. change: files change trigger payload{type: add/remove, file, files}
   * 3. progress payload{progressValue, event, file, files}
   * 4. success payload{res, file, files}
   * 5. error payload{error, file, files}
   */

  import logo from '@/assets/logo.png'
  import pic1 from '@/assets/IMG_0507.JPG'
  import pic2 from '@/assets/IMG_0508.JPG'
  import pic3 from '@/assets/IMG_0532.JPG'
  import pic4 from '@/assets/IMG_0765.GIF'
  import pic5 from '@/assets/IMG_0819.GIF'
  import pic6 from '@/assets/IMG_0962.GIF'
  import pic7 from '@/assets/IMG_1008.GIF'
  import pic8 from '@/assets/IMG_1013.GIF'
  import pic9 from '@/assets/IMG_1017.GIF'
  import {
    exec,
    readFile,
    newFile,
    base64ToBlob,
    sizeToBytes,
  } from "./utils"

  export default {
    name: 'Uploader',
    inheritAttrs: false,
    props: {
      title: String,
      action: String,
      headers: String,
      removable: Boolean,
      autoUpload: Boolean,
      byteBase: [Number, String],  // 1000 or 1024
      maxSize: [Number, String],   // such as(case insensitive): 1024, '1kb', '2.4Mb', '12GB'...
      maxCount: [Number, String],  // 6 or '6'
      thumbnailFit: [Number, String],  // contain, cover, fill, none, ratioDelta
      beforeUpload: Function,      // return false to cancel upload
      uploadMethod: Function,      // use your own upload handler
      value: {
        type: Array,
        default: () => ([])
      }
    },
    data() {
      return {
        previewList: [],
        thumbnailList: [],
      }
    },
    computed: {
      disabled() {
        return this.hasKey(this.$attrs, 'disabled')
      },
      previews() {

      },
      logo() {
        return logo
      },
      pics() {
        return [pic1, pic2, pic3, pic4, pic5, pic6, pic7, pic8, pic9]
      }
    },
    mounted() {
      this.getPreviewList(this.pics)
    },
    methods: {
      hasKey(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key)
      },
      toArray(arrayLike) {
        return Array.prototype.slice.call(arrayLike)
      },
      createFileList(files, callback) {
        const size = files.length
        if (!size) {
          return
        }
        const result = []
        const next = () => {
          result.length === size && exec(callback, result.filter(Boolean))
        }
        for (let i = 0; i < size; i++) {
          const file = files[i]
          readFile(file).then(base64 => {
            result[i] = newFile(file, base64)
            next()
          }).catch((error) => {
            result[i] = null
            next()
          })
        }
      },
      getOversizeInfo(files) {
        const base = parseInt(this.byteBase, 10) || 1024
        const result = {
          index: -1,
          value: null,
          file: null,
          limit: sizeToBytes(this.maxSize, base) || null
        }
        if(result.limit) {
          result.index = files.findIndex(file => file.size > result.limit)
          result.file = files[result.index] || null
          result.value = result.file ? result.file.size : null
        }
        return result
      },
      onChange(event) {
        console.group('onChange')
        const files = this.toArray(event.target.files)
        const maxCount = parseInt(this.maxCount, 10) || null
        const oversizeInfo = this.getOversizeInfo(files)
        console.log('files: ', files)
        if (oversizeInfo.index !== -1) {
          if (!maxCount || oversizeInfo.index < maxCount) {
            return this.onOversize(files, oversizeInfo)
          }
        }
        if (maxCount && files.length > maxCount) {
          return this.onOverCount(files, maxCount)
        }
        this.onAddFile(files)
        console.groupEnd()
      },
      onOversize(files, oversizeInfo) {
        console.group('onOversize')
        const type = 'size'
        const {index, value, limit, file} = oversizeInfo
        const fileList = files.slice(0, index)
        console.log('oversizeInfo: ', oversizeInfo)
        this.$emit('limit', {type, value, limit})
        console.log('payload: ', {type, value, limit, file})
        this.onAddFile(fileList)
        console.groupEnd()
      },
      onOverCount(files, limit) {
        console.group('onOverCount')
        const type = 'count'
        const value = files.length
        const fileList = files.slice(0, limit)
        this.$emit('limit', {type, value, limit})
        console.log('payload: ', {type, value, limit})
        this.onAddFile(fileList)
        console.groupEnd()
      },
      onAddFile(files) {
        this.createFileList(files, fileList => {
          this.updateFileList(fileList)
          this.$emit('add', fileList.slice())
        })
      },
      onRemoveFile(index) {
        const list = this.value.slice()
        const items = list.splice(index, 1)
        this.updateFileList(list)
        this.$emit('remove', {index, file: items[0]})
      },
      updateFileList(fileList) {
        const oldFiles = this.value
        const empty = !oldFiles.length
        const files = empty ? fileList : oldFiles.concat(fileList)
        this.$emit('input', files)
        this.updateThumbnailList(files, empty)
      },
      updateThumbnailList(files) {
        const thumbnail = data => Object.assign(Object.create(null), data)
        const load = (index, src) => {
          const image = new Image()
          image.onload = () => {
            const loaded = true
            const width = image.naturalWidth
            const height = image.naturalHeight
            const ratio = width / height
            const newThumbnail = thumbnail({src,loaded, width, height, ratio})
            this.$set(this.thumbnailList, index, newThumbnail)
          }
          image.setAttribute('src', src)
        }
        this.thumbnailList = files.map((file, index) => {
          const src = file.base64()
          // TODO updateThumbnailList
        })
      },
      getPreviewList(fileList) {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i]
          const image = new Image()
          image.onload = () => {
            const src = file
            const width = image.naturalWidth
            const height = image.naturalHeight
            const ratio = width / height
            this.$set(this.previewList, i, {src, width, height, ratio})
          }
          image.src = file
        }
      },
      getPicClass({ratio}) {
        let mode = '' + this.thumbnailFit
        const defaultRatio = 0.1
        const delta = ratio - 1
        const modes = ['none', 'fill', 'contain', 'cover']
        const isRatioMode = modes.indexOf(mode) < 0
        if (isRatioMode) {
          mode = parseFloat(mode) || defaultRatio
          mode = Math.abs(delta) > Math.abs(mode) ? 'contain' : 'fill'
        }
        let tag = ''
        switch (mode) {
          case 'none':
            tag = 'none';
            break;
          case 'fill':
            tag = 'fill';
            break;
          case 'cover':
            tag = delta < 0 ? 'cover-w' : 'cover-h';
            break;
          default:
            tag = delta < 0 ? 'contain-h' : 'contain-w';
        }
        const className = `uploader-pic-${tag}`
        return {
          [className]: true
        }
      }
    }
  }
</script>


<style lang="less" scoped>
  @column: 4;
  @gutter: 8px;
  @delta: (@column - 1) * @gutter;
  @cellWidth: calc(~"(100% - @{delta}) / @{column}");

  .uploader {
    position: relative;
    box-sizing: border-box;
    padding: 12px;
    border-radius: 6px;
    background-color: #fff;
    margin-bottom: 20px;
    text-align: left;
    overflow: hidden;

    &.uploader-disabled {
      .uploader-title {
        color: #999;
      }

      .uploader-label:after {
        border-color: #e2e2e2;
      }

      .uploader-btn-icon {
        transform: translate(-50%, -50%) rotate(45deg);

        &:before,
        &:after {
          border-color: #e2e2e2;
        }
      }
    }

    .uploader-title {
      padding-bottom: 12px;
      font-size: 14px;
      font-weight: 500;
      color: #222;
      line-height: 18px;
      transition: color 0.3s;
    }

    .uploader-list {
      position: relative;
      display: flex;
      width: 100%;
      justify-content: flex-start;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .uploader-list-item {
      position: relative;
      box-sizing: border-box;
      flex: 0 0 @cellWidth;
      width: @cellWidth;
      height: 0;
      padding-bottom: @cellWidth;
      margin-right: @gutter;
      margin-bottom: @gutter;

      &:nth-child(@{column}n+@{column}) {
        margin-right: 0;
      }

      &:nth-last-child(-n+@{column}) {
        margin-bottom: 0;
      }
    }

    .uploader-pic-box {
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
      width: 200%;
      height: 200%;
      border: 1px solid #f1f1f1;
      border-radius: 12px;
      transform-origin: top left;
      transform: scale(0.5, 0.5);
      overflow: hidden;

      img {
        display: block;
        border: 0;
        outline: 0;
      }
    }

    .uploader-pic-none {

    }

    .uploader-pic-fill {
      width: 100%;
      height: 100%;
    }

    .uploader-pic-contain-w {
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      height: auto;
      transform: translateY(-50%);
    }

    .uploader-pic-contain-h {
      position: absolute;
      top: 0;
      left: 50%;
      width: auto;
      height: 100%;
      transform: translateX(-50%);
    }

    .uploader-pic-cover-w {
      display: block;
      width: 100%;
      height: auto;
    }

    .uploader-pic-cover-h {
      display: block;
      width: auto;
      height: 100%;
    }


    .uploader-btn {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 5;
      display: block;
      box-sizing: border-box;
      width: 200%;
      height: 200%;
      border: 1px dashed #bbb;
      border-radius: 12px;
      background-color: #f8f8f8;
      transform-origin: top left;
      transform: scale(0.5, 0.5);
      transition: border-color 0.3s;
    }

    .uploader-btn-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 48px;
      height: 48px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      transition: transform 0.3s;

      &:before,
      &:after {
        content: '';
        position: absolute;
        box-sizing: border-box;
        border-width: 0;
        border-style: solid;
        border-color: #bbb;
        transform-origin: 0 0;
        /*transform: scale(0.5, 0.5);*/
      }

      &:before {
        top: 50%;
        left: 0;
        width: 100%;
        height: 0;
        border-bottom-width: 1px;
      }

      &:after {
        top: 0;
        left: 50%;
        width: 0;
        height: 100%;
        border-right-width: 1px;
      }
    }

    input {
      position: absolute;
      top: 100%;
      z-index: -1;
      visibility: hidden;
    }
  }
</style>
