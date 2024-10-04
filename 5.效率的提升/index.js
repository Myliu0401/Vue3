/* 
      vue3的效率提升主要表现在哪些方面
         
          静态提升：  
              元素节点
                 vue2的静态节点  
                     render(){
                         createVNode('h1', null, 'Hello World')
                     }

                     每一次重新渲染时，都会新创建一个相同节点

                 vue3的静态节点
                   const hoisted = createVNode('h1', null, 'Hello World');
                   render(){
                      // 直接使用 hoisted 即可
                   }


              静态属性
                  <div class="user">
                    {{ user.name }}
                  </div>

                  const hoisted = { class: 'user' }

                  render(){
                    createVNode('div', hoisted, user.name)
                  }

                  减少了每次重渲染时，都必须创建新对象。


          预字符串化
              <div class="menu-bar-content">
                 <div class="logo"><h1>logo</h1></div>
                 <ul class="nav">
                   <li>a</li>
                   <li>a</li>
                   <li>a</li>
                   <li>a</li>
                   <li>a</li>
                   <li>a</li>
                 </ul>
                 <div class="user"><span>{{ user.name }}</span></div>
              </div>

              当编译器遇到大量连续的静态内容，会直接将这些静态内容编译为一个普通的字符串节点

              const hoisted1 = createVNode('<div class="menu-bar-content">...</ul>'); 
              就不会再为这些静态标签内容创建虚拟节点了。提高了执行效率


          缓存事件处理函数
              <button @click="count++">{{ count }}</button>

              vue2  
                render(){
                    return createVNode('button', { onClick: ($event)=>{ ctx.count++ } })
                }
                每次重渲染都会新创建一个函数，diff对比后进行解绑后重新替换成新的函数

              vue3
               render(ctx, _cache){
                   return createVNode('button', { onClick: _cache[0] || (cahce[0] = ($event)=>{ ctx.count++ }) })
               }

          Block Tree 
              当发生diff对比时，vue2是每个节点进行同层比较深度优先的原则进行逐一对比，vue3则会记录哪些是静态节点，对比时直接跳过静态节点对比动态节点。提升了更新效率。、

        
          PatchFlag 
             vue2在对比每一个节点时，并不知道这个节点哪些相关信息会发生变化，因此只能将所有信息依次比对。
             <div class="user" data-id="1" title="user name">{{ user.name }}</div>

             vue3会记录哪些属性是动态的。diff对比时则只对比动态的属性，而vue2是所有属性都要对比。vue3是大大的提高了更新效率。



*/