/* 
          获取响应式数据
             具名导出
                reactive函数，    对参数对象进行深度代理，返回代理对象。
                    参数为平面对象

                readonly函数，    对参数对象进行深度代理，返回代理对象，但是属性是只读的，不允许修改的。
                    参数为 平面对象或代理对象

                ref函数    对参数进行响应式，如果参数不是引用类型则会创建一个RefImpl实例，访问value时，返回数据
                           如果是引用类型则会通过reateive函数进行代理，如果是ref，则直接使用，访问value时返回。
                    参数可以是任何类型
            
                computed函数    计算属性，对依赖进行收集和缓存。返回一个代理对象，value值为回调返回的结果
                    参数为回调函数   
                      当读取value时，会根据情况决定需要运行回调函数


                readonly 吐音  雷豆乃
                Impl     吐音  等铺

        

          例子
            impory { reactive, readonly } from 'vue'
             const obj = { a:123, b: 12 }
             const state = reatetive(obj)
             const imState = readonly(state);
             
             imState 不可以更改属性
             obj.a = 1
             imState.a 、 state.a   都是为1，因为imState.a获取的是state代理，而state代理获取的是obj,所以为1



            
          监听数据变化
              具名导出
                 watchEffect函数    用于监听数据的变化
                    参数为回调函数， 回调会立即执行，收集依赖。当依赖发生改变时，会将回调函数加入到微队列中，等待完毕执行。
                    watchEffect函数返回一个函数，执行该函数将会取消监听。

                 watch函数          用于监听数据的变化，这个函数相当于vue2的$watch
                     监听单个数据的变化
                     const state = reactive({ count: 0 });
                     watch(()=>{ state.count }, (newValue, oldValue)=>{}, 配置对象)

                     const countRef = ref(0);
                     watch(countRef, (newValue, oldValue)=>{}, 配置对象)

                     监听多个数据的变化
                     watch([()=>{ state.count }, countRef], ([新], [旧])=>{}, 配置对象)

                     无论是 watchEffect还是 watch, 当依赖项发生变化时，回调函数的运行都是微队列


                     watch第一个参数必须是引用类型：
                        参数为函数，则会运行进行收集依赖
                        参数为ref对象，会监听其value,当value发生变化就会被监控到


         判断
           具名导出
             isProxy函数     判断某个数据是否是由 reactive或readonly 创建的
             isReactive函数  判断某个数据是否是通过reactive创建的
             isReadonly函数  判断某个数据是否通过readonly创建的
             isRef函数       判断某个数据是否是一个ref对象

         转换
           具名导出
             unref函数   相当于 isRef(xxx) ? xxx.value : xxx
             toRef函数   把代理数据转换成 ref对象 
                          如：代理{ a: 1, b: 2 }  toRef(代理对象, 'a') ===> ref对象{ value: 1 }
             toRefs函数  把代理数据转换成 ref对象 
                         如：代理{ a: 1, b: 2 }  toRefs(代理对象) ===> ref对象{ a: { value: 1 }, b: { value: 2 } }

*/