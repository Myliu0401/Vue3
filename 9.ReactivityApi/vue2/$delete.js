


function del(target, key) {

    // 判断是否是数组 并且 索引是有效索引
    if (Array.isArray(target) && isValidArrayIndex(key)) {
        target.splice(key, 1); // 因为数组的原型被重新指向了，方法是被重新的，所以触发了重渲染
        return;
    };

    const ob = target.__ob__
    if (target._isVue || (ob && ob.vmCount)) {
        // 非根实例或被观察对象，直接返回
        return
    }

    if (!hasOwn(target, key)) {
        // 不存在该属性，直接返回
        return
    };

    delete target[key]; // 删除改属性

    if (!ob) {
        // 没有响应式对象，直接返回
        return
    };


    // 通知依赖更新
    ob.dep.notify();
};