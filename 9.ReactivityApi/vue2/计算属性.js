




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
            : noop
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
                watcher.evaluate();
            }
            if (Dep.target) {
                watcher.depend();
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
       
        // parse expression for getter
        if (typeof expOrFn === 'function') {
            this.getter = expOrFn
        } else {
            this.getter = parsePath(expOrFn)
            if (!this.getter) {
                this.getter = noop;
            }
        }
        this.value = this.lazy ? undefined : this.get()
    }

    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    get() {
        pushTarget(this)
        let value
        const vm = this.vm
        try {
            value = this.getter.call(vm, vm)
        } catch (e) {
            if (this.user) {
                handleError(e, vm, `getter for watcher "${this.expression}"`)
            } else {
                throw e
            }
        } finally {
            // "touch" every property so they are all tracked as
            // dependencies for deep watching
            if (this.deep) {
                traverse(value)
            }
            popTarget()
            this.cleanupDeps()
        }
        return value
    }

    /**
     * Add a dependency to this directive.
     */
    addDep(dep) {
        const id = dep.id
        if (!this.newDepIds.has(id)) {
            this.newDepIds.add(id)
            this.newDeps.push(dep)
            if (!this.depIds.has(id)) {
                dep.addSub(this)
            }
        }
    }

    /**
     * Clean up for dependency collection.
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
        this.deps = this.newDeps
        this.newDeps = tmp
        this.newDeps.length = 0
    }

    /**
     * Subscriber interface.
     * Will be called when a dependency changes.
     */
    update() {
        /* istanbul ignore else */
        if (this.lazy) {
            this.dirty = true
        } else if (this.sync) {
            this.run()
        } else {
            queueWatcher(this)
        }
    }

    /**
     * Scheduler job interface.
     * Will be called by the scheduler.
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
        Dep.target = this;
        this.value = this.get(); // 运行计算属性函数
        this.dirty = false; // 修改脏值
        Dep.target = null;
    }

    /**
     * Depend on all deps collected by this watcher.
     */
    depend() {
        let i = this.deps.length
        while (i--) {
            this.deps[i].depend()
        }
    }

    /**
     * Remove self from all dependencies' subscriber list.
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
}