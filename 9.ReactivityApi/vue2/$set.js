

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
        target.splice(key, 1, value); 
        return value;
    }
    if (key in target && !(key in Object.prototype)) {
        target[key] = value;
        return value;
    }
    const ob = (target).__ob__;
    if (target._isVue || (ob && ob.vmCount)) {
        // 避免在 Vue 实例或观察者对象上添加或修改属性
        return value;
    }
    if (!ob) {
        target[key] = value;
        return value;
    }
    defineReactive(ob.value, key, value);
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