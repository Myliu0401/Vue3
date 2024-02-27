/* 

    vue3 不存在构造函数Vue
      vue3没有默认导出，只有具名导出。
        具名导出
          createApp： 通过该函数来创建一个vue实例。参数为配置对象
          ref： 该函数会返回一个对象。参数为数据。该函数会将数据放到对象的value属性中。
                当访问vue实例代理对象时，如果该属性是ref数据则代理会返回改数据的value。
                ref数据的value属性是一个访问器，当修改时会触发重渲染。
          watchEffect:  监控副作用函数，该函数传入一个回调，在该回调中用到的数据，只要该数据发生变化，就会重新执行该回调函数。
                        类似于vue2的watch。
          onMounted: 挂载完成的生命周期函数  传入回调
          onUnmounted: 卸载后的生命周期函数  传入回调
          computed: 计算属性函数，传入回调函数，跟vue2一样有缓存，只有依赖发生变化才会重新执行
          h: 创建虚拟节点
          defineAsyncComponent: 创建异步组件
              配置对象参数  
                  loader: ()=>{ }, // 该函数必须返回一个proimse, 值为组件
                  loadingComponent: 组件，  // 当loader函数的promise尚未完成时显示的组件
                  errorComponent: 组件,   // 当loader函数的promise出错时显示的组件
           defineAsyncComponent这个函数返回一个组件，将该返回的组件放置到vue配置对象的 components中

           vue2中异步组件是只有 在components中直接 import('../')


      vue实例
        mount(类名)   通过该函数进行挂载。
        use(插件)     进行插件的注册
        
    this不再指向实例，而是指向代理对象

      访问-----> 代理对象 --访问--> 组件实例 --返回--> 代理对象 --返回-->


    vue3中节点可以多根，不需要像vue2那样只能单根节点。


    配置对象
      setup函数。参数为  props 属性、ctx 上下文
          改函数在所有生命周期函数之前调用，并且只会执行一次
          改函数的this为undefined
          改函数返回的对象里的所有属性都会被挂载到实例上
       



*/
