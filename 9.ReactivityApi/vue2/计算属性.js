




/**
 * 
 * @param {*} vm vue实例
 * @param {*} computed 计算属性对象
 */
function initComputed(vm, computed) {
    // $flow-disable-line
    const watchers = vm._computedWatchers = Object.create(null)

    const isSSR = isServerRendering(); // 判断浏览器是否没有window对象


    // 循环计算属性配置项
    for (const key in computed) {

        const userDef = computed[key]; // 获取计算属性对象的值

        const getter = typeof userDef === 'function' ? userDef : userDef.get; // 获取计算属性的get函数


        // 浏览器有window对象则进入
        if (!isSSR) {
            watchers[key] = new Watcher(vm, getter || noop, noop, computedWatcherOptions);  // 创建一个wathcer
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
    };
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
            : noop;
        sharedPropertyDefinition.set = userDef.set || noop
    }

    Object.defineProperty(target, key, sharedPropertyDefinition); // 将其代理到vue实例的一级属性上
};



function createComputedGetter(key) {
    return function computedGetter() {
        const watcher = this._computedWatchers && this._computedWatchers[key]; // 获取wathcer实例

        // 判断该计算属性是否有wathcer
        if (watcher) {

            // 判断是否是脏值
            if (watcher.dirty) {
                watcher.evaluate(); // 会使该计算属性的依赖项收集到计算属性的wachter
            }
            if (Dep.target) {
                watcher.depend(); // 会使计算属性的依赖项收集到vue实例的wachter
            };

            return watcher.value;
        }
    }
};


class Watcher {
    vm;
    expression;
    cb;
    id;
    deep;
    user;
    lazy;
    sync;
    dirty;
    active;
    deps;
    newDeps;
    depIds;
    newDepIds;
    before;
    getter;
    value;

    constructor(vm, expOrFn, cb, options, isRenderWatcher) {
        this.vm = vm
        if (isRenderWatcher) {
            vm._watcher = this
        }
        vm._watchers.push(this);  // 将wacher实例添加到vue实例的watchers组中

        // options  吐音  哦佛顺
        // active   吐音  蛤得
        if (options) {
            this.deep = !!options.deep
            this.user = !!options.user
            this.lazy = !!options.lazy; // 脏值
            this.sync = !!options.sync
            this.before = options.before
        } else {
            this.deep = this.user = this.lazy = this.sync = false
        }
        this.cb = cb
        this.id = ++uid // uid for batching
        this.active = true
        this.dirty = this.lazy // for lazy watchers
        this.deps = []
        this.newDeps = []
        this.depIds = new Set()
        this.newDepIds = new Set()


        if (typeof expOrFn === 'function') {
            this.getter = expOrFn; // 计算属性的运行函数
        } else {
            this.getter = parsePath(expOrFn)
            if (!this.getter) {
                this.getter = noop; // 空函数
            }
        }

        this.value = this.lazy ? undefined : this.get()
    }

    /**
     * 评估getter，并重新收集依赖项。
     */
    get() {
        pushTarget(this); // 将计算属性的wathcer赋值到Dep静态属性上
        let value
        const vm = this.vm; // vue实例
        try {
            value = this.getter.call(vm, vm); // 运行计算属性的get函数，并将该函数的this设置为vue实例
        } catch (e) {
            if (this.user) {
                handleError(e, vm, `getter for watcher "${this.expression}"`)
            } else {
                throw e
            }
        } finally {
            
            // 判断是否需要进行深度监听依赖的属性
            if (this.deep) {
                traverse(value)
            }
            popTarget(); // 将vue实例的watcher赋值到Dep静态属性上
            this.cleanupDeps()
        }
        return value;
    }

    /**
     * 添加dep
     * @param {*} dep  依赖项数据的dep
     */
    addDep(dep) {
        const id = dep.id
        if (!this.newDepIds.has(id)) {
            this.newDepIds.add(id)
            this.newDeps.push(dep)
            if (!this.depIds.has(id)) {
                dep.addSub(this);  // this 当前watcher
            }
        }
    }

    /**
     * 清理依赖项集合
     */
    cleanupDeps() {
        let i = this.deps.length
        while (i--) {
            const dep = this.deps[i]
            if (!this.newDepIds.has(dep.id)) {
                dep.removeSub(this)
            }
        }
        let tmp = this.depIds
        this.depIds = this.newDepIds
        this.newDepIds = tmp
        this.newDepIds.clear()
        tmp = this.deps
        this.deps = this.newDeps; // 将计算属性的wathcer中的该数据取出来
        this.newDeps = tmp
        this.newDeps.length = 0
    }

    /**
     * 更新
     */
    update() {
        
        // 判断是否是脏值
        if (this.lazy) {
            this.dirty = true
        } else if (this.sync) {
            this.run()
        } else {
            queueWatcher(this)
        }
    }

    /**
     * 进入调度器
     */
    run() {
        if (this.active) {
            const value = this.get()
            if (
                value !== this.value ||
                // Deep watchers and watchers on Object/Arrays should fire even
                // when the value is the same, because the value may
                // have mutated.
                isObject(value) ||
                this.deep
            ) {
                // set new value
                const oldValue = this.value
                this.value = value
                if (this.user) {
                    const info = `callback for watcher "${this.expression}"`
                    invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
                } else {
                    this.cb.call(this.vm, value, oldValue)
                }
            }
        }
    }


    evaluate() {
        this.value = this.get();
        this.dirty = false; // 修改脏值
    }

    /**
     * 收集依赖
     */
    depend() {
        let i = this.deps.length
        while (i--) {
            // 执行每个dep的收集函数
            this.deps[i].depend(); // 收集wachter
        }
    }

    /**
     * 从所有依赖项的订阅服务器列表中删除self。
     */
    teardown() {
        if (this.active) {
            // remove self from vm's watcher list
            // this is a somewhat expensive operation so we skip it
            // if the vm is being destroyed.
            if (!this.vm._isBeingDestroyed) {
                remove(this.vm._watchers, this)
            }
            let i = this.deps.length
            while (i--) {
                this.deps[i].removeSub(this)
            }
            this.active = false
        }
    }
};


function pushTarget(target) {
    targetStack.push(target);
    Dep.target = target
};

function popTarget() {
    targetStack.pop(); // 截取掉最后一项
    Dep.target = targetStack[targetStack.length - 1]; // 将vue实例的wachter还原到target中
};
