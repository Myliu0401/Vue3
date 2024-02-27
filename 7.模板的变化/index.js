/* 
  
        vue3  v-model指令可以绑定多个数据
              v-model:text="xxx"
              v-model:text1="xxxx"


        vue2 v-model指令 
              默认是 传一个 value属性 和 input事件

        vue3 v-model指令
              默认是 传一个 modelValue属性 和 input:modelValue事件


        vue3 去掉了 .sync修饰符，它原本的功能由v-model的参数替代
              title.sync="xxx"
              就是相当于传入这两个 title="xxx" @update:title="xxx"， 但是vue3将该修饰符去掉了。
              
              v-model:title="xxx"
                相当于  title="xxx"  @update:title="xxx"

        vue3中移除了 model配置项，该配置项在vue2中是配置v-model的属性名和事件名的


        vue3中允许自定义 v-model 修饰符
            如 v-model.cap="xxx" 、 v-model:title.cap="xxx" 、 v-model:title.cap.cao.xx="xx"

            如果有修饰符则会传入几个props
               没有名称的则传入 modelModifiers: { cap: true }
               有名称的则传入: 名称Modifiers: { cap: true, ... }


        vue3中 修改了 v-if和v-for的优先级
               v-if的优先级比v-for高

               key: 
                 当使用 <template> 进行v-for循环时，需要把key值放到<template>中，而不是它的子元素中。
                 当使用 v-if、v-else-if、v-else 分支的时候，不再需要指定key值，因为vue3会自动给予每个分支一个唯一的key。
                 即便要手工给予key值，也必须给予每个分支唯一的key,不能因为要重用分支而给予相同的key。

        vue3 允许多根节点存在
                 

*/