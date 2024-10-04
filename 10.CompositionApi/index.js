/* 
     composition api相比于 option api 有哪些优势?
       不同于 reactivity api, composition api提供的函数很多是与组件深度绑定的。

       可以在组件内部进行更加细粒度的控制，使得组件中不同的功能高度聚合，提升了代码的可维护性，对于不同组件的相同功能，也能更好的复用。
       可以更好的与TS进行配合。


      vue3具名导出
          setup函数   参数为 props、context
             该函数在组件属性被赋值后立即执行，早于所有生命周期钩子函数，也就是组件实例化之前执行。
             props 是一个对象，包含了所有的组件属性值
             context  是一个对象，提供了组件所需的上下文信息
             在setup函数内部不能访问this，因为此时组件实例尚未创建。

             context对象的成员
               attrs对象   相当于vue2的this.$attrs
               slots对象   相当于vue2的this.$slots
               emit方法    相当于vue2的this.$emit

     
      vue3生命周期
          option api                                              composition api

          beforeCreate                                             取消，因为可以直接在setup函数里操作
          create                                                   取消，因为可以直接在setup函数里操作，如ref函数等
          beforeMount                                              onBeforeMount
          Mounted                                                  onMounted
          beforUpdate                                              onBeforeUpdate
          updated                                                  onUpdated
          beforeDestroy                                            onBeforeUnmount
          destroyed                                                onUnmounted
          errorCaptured                                            onErrorCaptured
          renderTracked                                            onRenderTracked
          renderTriggered                                          onRenderTriggered

        

          renderTriggered、onRenderTracked
             当收集到依赖时就会触发
                                                    事件源对象 target跟踪或触发渲染的对象    key跟踪或触发渲染的属性    type跟踪或触发渲染的方式
          renderTriggered、onRenderTriggered
             当依赖被修改时出发



            Captured   吐音 轻吹
            Tracked    吐音 崔可
            Triggered  吐音 崔肯
            option     吐音 哦顺
            reactivity 吐音 react 特v丢

            setup      吐音 谁导
 */