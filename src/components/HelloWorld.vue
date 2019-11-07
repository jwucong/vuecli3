<template>
  <div class="hello">
    {{dateFormatter('2019-2-14', 'yyyy-MM-dd 星期da 时间戳：ts')}}
    <div>{{dateFormatter('f0', 'yyyy-MM-dd 星期da 时间戳：ts')}}</div>
  </div>
</template>

<script>
  import {dateFormatter, isDate} from "@/utils";
  import {postTest} from "@/http/interface";

  export default {
    name: "HelloWorld",
    props: {
      msg: String,
    },
    data() {
      return {}
    },
    mounted() {
      // this.post()
    },
    methods: {
     dateFormatter(value, formatter) {
       return dateFormatter(value, formatter)
     },
      post() {
        postTest({
          id: 214,
          name: 'tesla',
          friends: ['nikola', 'tesla'],
        }).then(res => {
          console.log('res: ', res)
        }).catch(err => {
          console.log('err: ', err)
        })
      }
    }
  };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  /* eslint-disable */
  h3 {
    margin: 40px 0 0;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    display: inline-block;
    margin: 0 10px;
  }

  a {
    color: #42b983;
  }
</style>
