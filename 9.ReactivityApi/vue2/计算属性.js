




/**
 * 
 * @param {*} vm vue实例
 * @param {*} computed 计算属性对象
 */
function initComputed(vm, computed) {
    // $flow-disable-line
    const watchers = vm._computedWatchers = Object.create(null)

    const isSSR = isServerRendering(); // 判断浏览器是否没有window对象

    for (const key in computed) {

        const userDef = computed[key]; // 获取计算属性对象的值

        const getter = typeof userDef === 'function' ? userDef : userDef.get; // 获取计算属性的get函数


        // 浏览器有window对象则进入
        if (!isSSR) {
            watchers[key] = new Watcher(vm, getter || noop, noop, computedWatcherOptions);
        };

        // vue实例中如果没有该属性则将其代理上去
        if (!(key in vm)) {
            defineComputed(vm, key, userDef);
        };
    }
};


// 判断浏览器是否没有window对象
function isServerRendering() {
    if (typeof window === 'undefined') {
        return true;
    }
    return false;
};

/**
 * 
 * @param {*} target     vue实例
 * @param {*} key        计算属性的属性名
 * @param {*} userDef    计算属性的get函数
 */
function defineComputed(target, key, userDef) {
    const shouldCache = !isServerRendering(); // 判断该浏览器是否有window对象

    // 判断该参数是否是函数
    if (typeof userDef === 'function') {
        sharedPropertyDefinition.get = shouldCache ? createComputedGetter(key) : createGetterInvoker(userDef);
        sharedPropertyDefinition.set = noop; // 为空函数
    } else {
        sharedPropertyDefinition.get = userDef.get
            ? shouldCache && userDef.cache !== false
                ? createComputedGetter(key)
                : createGetterInvoker(userDef.get)
            : noop
        sharedPropertyDefinition.set = userDef.set || noop
    }
   
    Object.defineProperty(target, key, sharedPropertyDefinition); // 将其代理到vue实例的一级属性上
};


