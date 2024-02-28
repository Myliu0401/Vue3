/* 
       去掉Vue构造函数
          当一个页面中有多个vue应用时，vue2往往会遇到一些问题
          <div id="app1"></div>
          <div id="app2"></div>

          // 进行全局注册
          Vue.use(...) 
          Vue.minxin(...)
          Vue.component(...)

          new Vue().$mount('#app1')
          new Vue().$mount('#app2')

          会导致所有vue应用都有了全局的东西。

          vue3中，去掉了Vue构造函数，改用createApp来创建vue应用
           createApp(...).use(...).minxin(...).component(...).mount('#app1')
           createApp(...).use(...).minxin(...).component(...).mount('#app2')
           vue3将全局注册的这些api提到了vue应用中，全局注册时，也不会影响其他vue应用。
           

        答案
          1. 调用构造函数的静态方法会对所有vue应用生效，不利于隔离不同的应用
          2. vue2的构造函数集成了太多功能，不利于打包，vue3把这些功能使用普通的函数导出，能够充分利用只使用到的功能，从而来优化打包体积。
          3. vue2没有把组件实例和vue应用两个概念区分开，在vue2中，通过new Vue创建的对象，即是一个应用，同时又是一个特殊的vue组件。
             vue3中，把两个概念区别开，通过createApp创建的对象，是一个vue应用，它内部提供了针对该应用的api，而不是一个特殊的组件。



       在vue3中，组件实例是一个代理对象Proxy，功能和vue2一样。


       对vue3数据响应式的理解
         vue3不再使用Object.defineProperty的方式来完成数据响应式，而是使用了Proxy。
         除了Proxy本身效率比Object.defineProperty更高之外，由于不必递归遍历所有属性，而是直接得到一个Proxy。
         所以在vue3中，对数据的访问是动态的，当访问某个属性时，再动态的获取和设置，这极大的提升了在组件初始阶段的效率。
         同时，由于Proxy可以监控到成员的增删，因此，在vue3中新增成员、删除成员、索引访问等均可以触发重新渲染，而这些在vue2中难以做到。

         vue3中访问数据时，如果该数据是引用类型的话，则会将该数据变成一个代理对象再返回。
*/