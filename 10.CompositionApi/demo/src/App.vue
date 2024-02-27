<template>
  <div class="demo">
    <div class="demo_content">
      <Bar1 :gdps="data"/>
      <Bar2 :gdps="data"/>
    </div>
    <div class="demo_operate">
      <ul class="operate_ul">
        <li class="ul_li" v-for="item in data" :key="item.id">
          <label class="li_title">{{ item.name }}</label>
          <input class="li_content" v-model="item.value"/>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import Bar1 from "./components/Bar1/bar1.vue";
import Bar2 from "./components/Bar2/bar2.vue";
import { getData } from "./utils/index.js";
import { ref } from "vue";
export default {
  name: "App",
  components: {
    Bar1,
    Bar2,
  },
  setup() {
    const dataRef = ref(null);
    // 初始化
    myGetData(dataRef);

    return {
      data: dataRef,
    };
  },
};
async function myGetData(dataRef) {
  const data = await getData();
  dataRef.value = data;
};
</script>

<style lang="less">
body {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.demo {
  width: 100vw;
  .demo_content {
    width: 100%;
    display: flex;
    .content_bar {
      width: 50%;
      position: relative;
      min-height: 300px;

      &::before {
        content: "";
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        width: 2px;
        height: 100%;
        background-color: black;
      }
    }
  }
  .demo_operate {
    margin-top: 60px;
    .operate_ul{
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
       .ul_li{
             display: flex;
             align-items: center;
             
            .li_title{
               font-weight: bold;
               color: #333;
            }
            .li_content{
              margin-left: 10px;
              outline: none;
              border: 1px solid #ccc;
              width: 88px;
              height: 25px;
              padding-left: 7px;


              &:focus{
                border-color: rgb(49, 125, 240);
              }

            }
       }
    }
  }
}
</style>