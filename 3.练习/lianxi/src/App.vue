<template>
  <div>
    <div class="app">
      <div class="app_todos">
        <h1 class="todos_head">todos</h1>
        <div v-if="isBol">1</div>
        <div v-else>2</div>
        <button @click="qiehuan">切换</button>
        <div class="todos_inputBox">
          <span class="box"></span>
          <input
            class="input"
            placeholder="请输入"
            v-model="taskName"
            @keyup.enter="myAddTask"
          />
        </div>
        <div class="todos_content">
          <ul class="content_main">
            <li class="item" v-for="item in list" :key="item.id">
              <span
                class="item_box"
                :class="{ active: item.completed }"
                @click="mySetTaskCompleted(item.id)"
              ></span>
              <p class="item_text">{{ item.name }}</p>
              <span class="item_close" @click="myRemoveTask(item.id)">X</span>
            </li>
          </ul>
        </div>
        <div class="todos_tail">
          <span class="num">{{ taskLength }}个</span>
          <div class="options">
            <span
              class="num"
              :class="{ active: currentType === 'all' }"
              @click="setCurrentType('all')"
              >全部</span
            >
            <span
              class="num"
              :class="{ active: currentType === 'active' }"
              @click="setCurrentType('active')"
              >已完成</span
            >
            <span
              class="num"
              :class="{ active: currentType === 'unselected' }"
              @click="setCurrentType('unselected')"
              >未完成</span
            >
          </div>
          <span class="num" :class="{ none: !isBUt }" @click="clearIncomplete"
            >清除未完成</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import useTaskList from "./compositionApi/useTaskList.js";
import useCurrentType from "./compositionApi/useCurrentType.js";
import useOperationalTasks from "./compositionApi/useOperationalTasks.js";
import { getCurrentInstance, ref } from "vue";
export default {
  name: "App",
  components: {},
  updated() {
    console.log("更新了");
  },
  setup() {
    window.aa = getCurrentInstance().proxy;
    window.bb = getCurrentInstance();

    const tasks = useTaskList();

    const isBolRef = ref(true);

    const numRef = ref(0);

    window.setNumRef = () => {
      numRef.value++;
    };

    window.setNumRef();

    return {
      ...tasks,
      ...useCurrentType(tasks.taskList.value),
      ...useOperationalTasks(tasks.taskList.value),
      isBol: isBolRef,
      qiehuan() {
        isBolRef.value = !isBolRef.value;
        console.log(isBolRef.value);
      },
      numRef,
    };
  },
};
</script>


<style lang="less">
.app {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  .app_todos {
    margin: 0 auto;
    width: 400px;

    .todos_head {
      width: 100%;
      height: 60px;
      color: rgb(228, 81, 81);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #ccc;
    }

    .todos_inputBox {
      display: flex;
      align-content: center;
      width: 100%;
      position: relative;
      padding-left: 50px;
      border: 1px solid #ccc;
      border-top: none;
      .box {
        position: absolute;
        display: inline-block;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1px solid #ccc;
        left: 6%;
        top: 50%;
        transform: translate(-50%, -50%);
        cursor: pointer;

        &.active {
          &::before {
            content: "";
            width: 80%;
            height: 80%;
            border-radius: 50%;
            background-color: rgb(51, 157, 228);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            position: absolute;
          }
        }
      }
      .input {
        border: none;
        outline: none;
        width: 100%;
        height: 43px;
        font-size: 20px;
      }
    }

    .todos_content {
      max-height: 400px;
      overflow: auto;
      .content_main {
        .item {
          height: 40px;
          display: flex;
          align-items: center;
          border: 1px solid #ccc;
          border-top: none;

          .item_box {
            display: inline-block;
            width: 15px;
            height: 15px;
            border-radius: 50%;
            border: 1px solid #ccc;
            cursor: pointer;
            margin-left: 17px;
            position: relative;
            display: flex;
            align-content: center;
            justify-content: center;
            position: relative;
            &.active {
              &::before {
                content: "";
                position: absolute;
                width: 80%;
                height: 80%;
                background-color: rgb(53, 155, 238);
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              }
            }
          }
          .item_text {
            flex-grow: 1;
            margin: 0px 20px;
          }
          .item_close {
            margin-right: 10px;
            cursor: pointer;
          }
        }
      }
    }

    .todos_tail {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0px 10px;
      height: 35px;
      border: 1px solid #ccc;
      border-top: none;
      position: relative;
      .num {
        font-size: 13px;
        color: #333;
        cursor: pointer;

        &.none {
          display: none;
        }

        &.active {
          font-weight: bold;
        }
      }
      .options {
        display: flex;
        align-items: center;
        justify-content: center;
        .num {
          margin: 0px 10px;
        }
      }

      &::before {
        position: absolute;
        content: "";
        width: 98%;
        border: 1px solid #ccc;
        height: 8px;
        bottom: -10px;
        border-top: none;
        box-shadow: 0px 0px 2px 0px #ccc;
        left: 50%;
        transform: translateX(-50%);
      }
      &::after {
        position: absolute;
        content: "";
        width: 97%;
        border: 1px solid #ccc;
        height: 8px;
        bottom: -19px;
        border-top: none;
        box-shadow: 0px 0px 2px 0px #ccc;
        left: 50%;
        transform: translateX(-50%);
      }
    }
  }
}
</style>
