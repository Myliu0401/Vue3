

/**
 * 
 * @param {*} target   目标对象 
 * @param {*} key      属性名
 * @param {*} value    属性值
 * @returns 
 */
function set(target, key, value) {

    // 判断是否是数组 并且 该属性名是有效的索引
    if (Array.isArray(target) && isValidArrayIndex(key)) {
        target.length = Math.max(target.length, key); // 获取最大值并修改数组的长度
        target.splice(key, 1, value); // 因为数组的原型被重新指向了，方法是被重新的，所以触发了重渲染
        return value;
    };

    // 判断目标对象中是否有该属性并且不是原型上的属性
    if (key in target && !(key in Object.prototype)) {
        target[key] = value;  // 直接更改该属性，让其触发该属性的get函数  
        return value;
    };

    // 判断该属性是否是Vue实例或观察者对象
    const ob = (target).__ob__;
    if (target._isVue || (ob && ob.vmCount)) {
        // 非根实例或被观察对象，直接返回
        return value;
    };

  
    if (!ob) {
        // 没有响应式对象，直接赋值
        target[key] = value;
        return value;
    };

    defineReactive(ob.value, key, value);  // 对属性进行响应式处理
    ob.dep.notify(); // 派发更新

    return value;
};

// 判断一个值是否是一个有效的数组索引 
function isValidArrayIndex(val) {
    const n = parseFloat(String(val));
    return n >= 0 && Math.floor(n) === n && isFinite(val);
};

// 判断是否是数字
function isFinite(value) {
    if (typeof value !== 'number') {
        return false;
    }
    return !(value !== value || value === Infinity || value === -Infinity);
};