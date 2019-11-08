<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png" />
    <HelloWorld msg="Welcome to Your Vue.js App" />
    <div class="box">
      <uploader
        multiple
        v-model="files"
        max-count="5"
        max-size="100kb"
        @limit="onLimit"
        @add="onAdd"
        @remove="onRemove"
        @input="onInput"
        >
      </uploader>
    </div>

  </div>
</template>

<script>
// @ is an alias to /src
import HelloWorld from "@/components/HelloWorld.vue";
import Uploader from './Uploader'

export default {
  name: "home",
  components: {
    HelloWorld,
    Uploader
  },
  data() {
    return {
      files: []
    }
  },
  methods: {
    toArray(arrayLike) {
      return Array.prototype.slice.call(arrayLike)
    },
    onAdd(payload) {
      console.log('onAdd: ', payload)
    },
    onRemove(payload) {
      console.log('onRemove: ', payload)
    },
    onInput(payload) {
      console.log('onInput: ', payload)
    },
    onLimit(payload) {
      console.log('onLimit: ', payload)
    },

  }
};
</script>

<style>
  .box {
    padding: 15px;
    background: #f7f7f7;
  }
</style>
