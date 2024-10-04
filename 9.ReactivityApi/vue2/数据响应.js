
/* ===============精简版================= */

/**
 * 将数据变成响应式
 * @param {*} obj   对象
 * @param {*} key   属性名
 * @param {*} val   属性值
 */
function defineReactive(obj, key, val) {
    var dep = new Dep(); // 创建一个依赖收集器

    Object.defineProperty(obj, key, {
        enumerable: true,  // 是否可被枚举
        configurable: true, // 是否可被修改和删除
        get: function reactiveGetter() {
            // 将依赖收集器中的订阅者添加到当前属性的依赖列表中
            if (Dep.target) {
                dep.addSub(Dep.target);
            }
            return val;
        },
        set: function reactiveSetter(newVal) {
            if (newVal === val) {
                return;
            }
            val = newVal;
            // 通知依赖列表中的订阅者进行更新操作
            dep.notify();
        }
    });
}

function observe(obj) {
    if (!obj || typeof obj !== 'object') {
        return;
    }

    Object.keys(obj).forEach(function (key) {
        defineReactive(obj, key, obj[key]);
    });
};

function Dep() {
    this.subs = [];
};

// 将当前依赖（订阅者）添加到依赖列表中
Dep.prototype.addSub = function (sub) {
    this.subs.push(sub);
};

// 通知依赖列表中的每个依赖（订阅者）进行更新操作
Dep.prototype.notify = function () {
    this.subs.forEach(function (sub) {
        sub.update();
    });
};

function Watcher(cb) {
    this.cb = cb;
    Dep.target = this;
    this.cb();
    Dep.target = null;
}

Watcher.prototype.update = function () {
    // 视图更新的逻辑
};


// 创建订阅者 Watcher
new Watcher(function () {
    console.log('订阅者收到数据变更通知');
});


var data = {
    message: 'Hello, Vue!'
};

observe(data);

// 修改数据，将触发响应式更新
data.message = 'Hello, Vue 2!';



/* ================详细版================= */


function observe(obj) {
    if (!obj || typeof obj !== 'object') {
        return;
    };

    Object.keys(obj).forEach(function (key) {
        defineReactive(obj, key, obj[key]);
    });
};


/**
 * 将数据变成响应式
 * @param {*} obj 对象
 * @param {*} key 属性名
 * @param {*} val 属性值
 * @param {*} customSetter 
 * @param {*} shallow 
 * @returns 
 */
function defineReactive(obj, key, val, customSetter, shallow) {
    const dep = new Dep();   // 创建一个依赖收集器实例

    const property = Object.getOwnPropertyDescriptor(obj, key); // 获取该属性的描述符对象

    // 该属性是否不可以被修改
    if (property && property.configurable === false) {
        return;
    };

    // cater for pre-defined getter/setters
    const getter = property && property.get; // 获取读取的运行函数
    const setter = property && property.set; // 获取修改的运行函数

    // 没有传入属性值的情况下
    if ((!getter || setter) && arguments.length === 2) {
        val = obj[key]; // 获取属性值
    };

    let childOb = !shallow && observe(val); // 递归，看该属性值是否是引用类型的

    // 进行属性描述监听
    Object.defineProperty(obj, key, {
        enumerable: true, // 是否可被枚举
        configurable: true, // 是否可被删除或修改


        // 获取时触发
        get: function reactiveGetter() {

            const value = getter ? getter.call(obj) : val; // 获取属性值

            // target为wacther的实例，每一个组件或页面创建时，都会执行创建一个wacther
            if (Dep.target) {
                dep.depend(); // 收集wacther
                //dep.addSub(Dep.target);
            }
            return value; // 返回属性值
        },


        // 修改时触发
        set: function reactiveSetter(newVal) {
            const value = getter ? getter.call(obj) : val; // 获取旧值

            // 旧值与新值是否相等
            if (newVal === value || (newVal !== newVal && value !== value)) {
                return // 新旧值相等则结束
            };


            val = newVal; // 更新作用域中的旧值


            childOb = !shallow && observe(newVal); // 递归，看新值是否是引用类型

            dep.notify(); // 派发更新
        }
    });
};



class Dep {
    static target; // 当前的watcher实例
    id;
    subs; // 收集所有的watcher实例

    constructor() {
        this.id = uid++
        this.subs = []
    }
    
    /**
     * 
     * @param {*} sub 当前 Dep.target 的 wachter
     */
    addSub(sub) {
        this.subs.push(sub); // 将当前的wachter添加到dep实例中
    }

    removeSub(sub) {
        remove(this.subs, sub)
    }

    depend() {
        if (Dep.target) {
            Dep.target.addDep(this); // 会将当前的dep实例添加到wachter实例中
        }
    }

    notify() {

        const subs = this.subs.slice(); // 截取全部项

        for (let i = 0, l = subs.length; i < l; i++) {
            subs[i].update(); // 进行更新重渲染
        };
    }
};



function Watcher(vm, expOrFn, cb) {
    this.vm = vm;
    this.getter = parsePath(expOrFn);
    this.cb = cb;
    this.value = this.get();  // 虚拟dom树
};

Watcher.prototype.get = function () {
    Dep.target = this;
    var value = this.getter.call(this.vm, this.vm); // 获取虚拟树
    Dep.target = null;
    return value;
};

Watcher.prototype.update = function () {
    var oldValue = this.value; // 旧虚拟树
    this.value = this.get(); // 获取新虚拟树
    this.cb.call(this.vm, this.value, oldValue); // 进行新旧虚拟树的对比并进行更新渲染
};

function parsePath(path) {
    var segments = path.split('.');
    return function (obj) {
        for (var i = 0; i < segments.length; i++) {
            if (!obj) return;
            obj = obj[segments[i]];
        }
        return obj;
    };
};