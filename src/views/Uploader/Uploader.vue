<template>
  <div class="uploader" :class="{'uploader-disabled': inputAttrs.disabled}">
    <div class="uploader-header">
      <slot name="header">
        <div v-if="title" class="uploader-title">{{title}}</div>
      </slot>
    </div>
    <div class="uploader-list">
      <div
        class="uploader-list-item"
        v-for="(image, index) in thumbnailList"
        :key="index">
        <div class="uploader-pic-box">
          <transition name="fade">
            <img v-show="image.src" :class="getPicClass(image)" :src="image.src" alt="">
          </transition>
          <span class="uploader-rm-btn" @click="removeFile(index)"></span>
        </div>
      </div>
      <div class="uploader-list-item">
        <label class="uploader-btn">
          <i class="uploader-btn-icon"></i>
          <input v-bind="inputAttrs" @change="changeHandler">
        </label>
      </div>
    </div>
    <div ref="op" class="box" style="margin-top: 10px;">
      <img :src="op" alt="" style="width: 100%;display: block;">
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
    hasKey,
    plainObject,
    readFile,
    newFile,
    sizeToBytes,
    bytesToSize,
  } from "./utils"
  import {compressor, loadImage, getOrientation, getPreviewInfo} from "./imageTool";
  import {newImage} from "./image";

  export default {
    name: 'Uploader',
    inheritAttrs: false,
    props: {
      title: String,
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
        op: null,
        thumbnailList: [],
      }
    },
    computed: {
      inputAttrs() {
        const attrs = this.$attrs
        const disabled = hasKey(attrs, 'disabled') || this.vacantCount === 0
        return plainObject(attrs, {
          type: 'file',
          disabled,
        })
      },
      vacantCount() {
        const max = parseInt(this.maxCount, 10)
        if (!max) {
          return null
        }
        return max - this.value.length
      }
    },
    mounted() {

    },
    methods: {
      toArray(arrayLike) {
        return Array.prototype.slice.call(arrayLike)
      },
      createFileList(files, callback) {
        let count = 0, fileList = []
        const size = files.length
        const setFileList = (index, file, base64) => {
          fileList[index] = file ? newFile(file, base64) : null
          if (size === ++count) {
            exec(callback, fileList.filter(Boolean))
          }
        }
        for (let i = 0; i < size; i++) {
          readFile(files[i]).then(base64 => {
            setFileList(i, files[i], base64)
          }).catch(() => setFileList(i))
        }
      },
      oversizeInfo(files) {
        const base = parseInt(this.byteBase, 10) || 1024
        const limit = sizeToBytes(this.maxSize, base) || null
        const result = index => {
          const file = index < 0 ? null : files[index]
          const value = file ? file.size : null
          return plainObject({index, file, value, limit})
        }
        return result(limit ? files.findIndex(file => file.size > limit) : -1)
      },
      changeHandler(event) {
        const vacant = this.vacantCount
        const limited = vacant !== null
        if (limited && vacant <= 0) {
          return false
        }
        const files = this.toArray(event.target.files)
        const oversize = this.oversizeInfo(files)
        if (oversize.index !== -1) {
          if (!limited || oversize.index < vacant) {
            return this.oversizeHandler(files, oversize)
          }
        }
        if (limited && vacant < files.length) {
          return this.overCountHandler(files, vacant)
        }
        this.addFiles(files)
      },
      oversizeHandler(files, oversizeInfo) {
        const type = 'size'
        const {index, value, limit, file} = oversizeInfo
        this.$emit('limit', plainObject({type, value, limit, file}))
        this.addFiles(files.slice(0, index))
      },
      overCountHandler(files, limit) {
        const type = 'count'
        const value = files.length
        this.$emit('limit', plainObject({type, value, limit}))
        this.addFiles(files.slice(0, limit))
      },
      addFiles(files) {
        this.createFileList(files, fileList => {
          const list = this.value.concat(fileList)
          this.updateFileList(list)
          this.$emit('add', fileList.slice())
        })
      },
      removeFile(index) {
        const list = this.value.slice()
        const items = list.splice(index, 1)
        this.updateFileList(list)
        this.$emit('remove', plainObject({index, file: items[0]}))
      },
      updateFileList(fileList) {
        this.$emit('input', fileList)
        this.updateThumbnailList(fileList)
        if(fileList[0]) {
          const file = fileList[0]
          console.log('file.size: ', bytesToSize(fileList[0].size))
          console.log('file.o: ', getOrientation(file.base64()))
          getPreviewInfo(file.raw).then(image => {
            console.log(image)
            console.log('blob: ', image.getBlob())
            this.op = image.getBase64()
          })
        }
      },
      loadImage(file, callback) {
        const src = file.base64()
        const {name, size} = file
        const image = new Image()
        const next = data => exec(callback, data)
        image.onload = () => {
          const width = image.naturalWidth
          const height = image.naturalHeight
          next(plainObject({name, size, src, width, height}))
        }
        image.onerror = () => {
          next(plainObject())
        }
        image.setAttribute('src', src)
      },
      updateThumbnailList(files) {
        this.thumbnailList = files.map(() => Object.create(null))
        for (let i = 0; i < files.length; i++) {
          const next = data => this.$set(this.thumbnailList, i, data)
          this.loadImage(files[i], next)
        }
      },
      getPicClass({width, height}) {
        let mode = '' + this.thumbnailFit
        const input = /^[-+]?((?:\.\d+)|(?:\d+(?:\.\d+)?))$/.exec(mode)
        const defaultRatio = 0.15
        const delta = width / height - 1
        if (input) {
          mode = parseFloat(input[1]) || defaultRatio
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
          case 'contain':
            tag = delta < 0 ? 'contain-h' : 'contain-w';
            break;
          case 'cover':
            tag = delta < 0 ? 'cover-w' : 'cover-h';
            break;
          // case 'cover-center':
          default:
            tag = delta < 0 ? 'cover-wc' : 'cover-hc';
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

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 1s;
  }

  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }

  .fade-enter-to,
  .fade-leave {
    opacity: 1;
  }

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
      transition: all .35s;
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

    .uploader-pic-cover-wc {
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      height: auto;
      transform: translateY(-50%);
    }

    .uploader-pic-cover-hc {
      position: absolute;
      top: 0;
      left: 50%;
      width: auto;
      height: 100%;
      transform: translateX(-50%);
    }

    .uploader-rm-btn {
      position: absolute;
      top: 0;
      right: 0;
      box-sizing: border-box;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
      background-color: darkred;
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
