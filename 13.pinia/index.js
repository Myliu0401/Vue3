/* 



  pinia，是一个vue阵营的新的状态管理库，现在vue官方已经推崇使用pinia来代替vuex
  也可以将pinia看做vuex的最新版本。

  在pinia中每个store仓库都是单独的扁平化的存在。

  相比vuex, pinia的api更好而且更简单，还支持组合式api,还可以和ts一起使用来做类型推断。

  pinia优势
    1. 在pinia中，已经不存在mutations,值有state、getters、actions

      defineStore('counter', {
         state:()=>{
            count: 0    
         },
         getters: ()=>{
            doubleCount: state => state.count * 2
         },
         actions:{
            increment(){
               this.count++
            }
         }
      })
    
    2. actions里面支持同步和异步来修改store,相当于将之前的vuex中的mutation和action合并了。

    3. 可以和ts一起使用，以此来获得类型推断的支持。

    4. 关于store仓库，每一个store仓库都是独立的扁平化存在的，不像vuex是通过modules嵌套。

    5. 支持插件扩展，可以通过插件（函数）来扩展仓库的功能，为仓库添加全局属性或者全局方法。

    6. 比vuex更加轻量。




    pinia使用  =====  选项式风格
          
      import { createPinia } from 'pinia;
      const piia = createPinia();
      createApp(App).use(router).use(pinia).mount('#app);


      import { defineStore } 'pinia';
      const useCounterStore = defineStore('counter', { 
         state: ()=>{ 
             // 返回数据仓库
             return { 
                num: 0
             }
         }，

         getters: {
            // 跟vuex一样，相当于计算属性
            // state参数为仓库
            doubleCount: (state)=>{  }
         },

         actions: {
             // 同、异步 修改仓库数据的方法
         }
      })
     
      import { storeToRefs } from 'pinia';
      const store = useCounterStore();

      store为仓库，仓库中包含自定义的 数据、计算属性、方法等等

      const { num } = storeToRefs(store);
      经过 storeToRefs 函数改造过后的仓库的数据就变成响应式的，直接修改也可以响应式。
      该函数会将数据转换成 ref 风格的

      store.$reset(); 该方法会将仓库重置为初始值

      // 这个方法会对仓库对象进行打补丁 相当于 仓库 = { ...仓库, ...对象 }
      // 参数如果是函数，那么该函数的返回值会混入到仓库中
      store.$patch(对象或者函数);  


      
      //============================

      组合式风格

      组合式风格就和vue3使用的方法一样，通过ref或者reactive来定义仓库数据。
      通过普通的方式来操作仓库数据。无论是数据还是方法之中需要导出出去。
      通过computed来当做getter

      import { defineStore, storeToRefs } from 'pinia;
      import { reactive } from 'vue';
 
      const useListStore = defineStore(仓库的id, ()=>{
            const list = reactive({
               items: 数据
            });


            // 修改数据
            function addListItem(value){
                list.items.push(value)
            }


            在组合式仓库中  
               ref() 就是 state
               computed() 就是 getters
               function 就是 actions


            return {
              list,
              addListItem
            }
      })

      // 获取仓库
      const store = useListStore();
      

      //同样需要对仓库数据进行构造，直接修改才能有响应式
      const { ... } = storeToRefs(store);


      =======================
      访问其他 store 的 getter
      想要使用领一个 store的getter的话，那就直接在getter内使用就好
      
      import { useOtherStore } from './other-store';

      defineStore('main',{
         state: ()=>{
            
         },

         getters: {
            otherGetter(state){
                const otherStore = useOtherStore();
                return state.localData + otherStore.data;
            }
         }
      })



     =======================  
      插件
      由于有了底层API的支持，pinia store完成支持扩展。
        为 store添加新的属性
        定义store时增加新的选项
        为store增加新的方法
        包装现有的方法
        改变甚至取消action
        实现副作用，如本地存储
        仅应用插件于特定store

        插件是通过 pinia.use()  添加到pinia实例的。

        pinia插件是一个函数，可以选择性地返回要添加到store的属性。它接收一个可选参数context

        function 插件(context){
           context.pinia // 用 createPinia()  创建的pinia实例
           context.app // 用 createApp() 创建的当前vue3应用
           context.store // 该插件想扩展的 store
           context.options // 定义传给 defineStore() 的store的可选对象

           // 所以可以对特定的仓库进行扩展
           if(context.store.xx === '仓库的id'){
              return {
            
               }
           } 


        }

        自定义插件

          function secretPiniaPlugin(){
             return {
                secret: 'xxxxx'
             }
          }

          // 创建pinia实例
          const pinia = createPinia();

          // 添加插件
          pinia.use(secretPiniaPlugin);  // 这相当于向全局的所有仓库添加混入该返回的对象

          // 在另一个文件中
          const store = useStore()
          store.secret // 'xxxxx'

          这对添加全局对象很有用， 如路由器、modal或toast管理器。
          


          
        第三方插件

        import  插件 from 'xxx';

        pinia.use(插件);

*/