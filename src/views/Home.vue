<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png" />
    <HelloWorld msg="Welcome to Your Vue.js App" />
    <div class="box">
      <uploader :thumbnail-fit="-0.1"></uploader>
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
  }
};
</script>

<style>
  .box {
    padding: 15px;
    background: #f7f7f7;
  }
</style>
