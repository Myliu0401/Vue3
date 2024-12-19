const TargetType = {
  INVALID: 0, // 表示无效的目标类型 如  null undefined
  COMMON: 1, // 表示普通对象类型
  COLLECTION: 2, // 表示集合类型 如 Map、Set 等
};

// 创建一个ref数据
export function ref(value) {
  return createRef(value, false); // 创建refimpl实例
}

/**
 * 创建ref实例
 * @param {*} rawValue   数据 
 * @param {*} shallow    是否为浅层
 * @returns 
 */
function createRef(rawValue, shallow) {

  // 是否已是ref数据
  if (isRef(rawValue)) {
    return rawValue; // 直接返回ref对象
  }

  return new RefImpl(rawValue, shallow); // 创建RefImpl实例
};

// 通常用于确保对原始数据的直接访问而不触发 Vue 的响应式机制
function toRaw(value) {
  /* 
       __v_raw  属性返回 reactive 和 readonly 的原始数据
   */
  return value && value.__v_raw ? value.__v_raw : value;
}


// 进行代理
function toReactive(value) {
  return reactive(value); // 进行代理
}

// 进行代理
function reactive(target) {
  // 检查新值 数据 是否是只读的响应式对象
  if (isReadonly(target)) {
    return target;
  }

  // 创建实例对象
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  );
}

/**
 * 创建实例对象
 * @param {*} target              原始对象
 * @param {*} isReadonly          是否只读
 * @param {*} baseHandlers
 * @param {*} collectionHandlers
 * @param {*} proxyMap
 * @returns
 */
function createReactiveObject(
  target,
  isReadonly,
  baseHandlers,
  collectionHandlers,
  proxyMap
) {
  // 判断是否不是引用类型
  if (!isObject(target)) {
    return target;
  }

  // 判断目标对象是否存在原始对象，并且不是只读且已经被转换为响应式对象。
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target;
  }

  const existingProxy = proxyMap.get(target); // 是否已有该数据
  if (existingProxy) {
    return existingProxy;
  }

  // 获取代理数据的类型
  const targetType = getTargetType(target);

  // 是否是无效数据 如 null、undefined
  if (targetType === TargetType.INVALID) {
    return target;
  }

  // 进行代理
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  );

  proxyMap.set(target, proxy); // 向集合中添加该数据

  return proxy; // 返回代理对象
}

/**
 * 判断新旧属性是否不相同
 * @param {*} newValue 新数据
 * @param {*} oldValue 旧数据
 * @returns
 */
function hasChanged(newValue, oldValue) {
  //
  return !Object.is(newValue, oldValue);
}

/**
 * ref类
 */
class RefImpl {

  // value为数据   isShallow为布尔
  constructor(value, isShallow) {

    this._rawValue = isShallow ? value : toRaw(value); // toRaw 获取原始数据

    this._value = isShallow ? value : toReactive(value); // toReactive 判断是否是否引用类型，如果是则调用reactive函数
    
  }

  // 获取value属性时触发
  get value() {

    trackRefValue(this); // 收集依赖

    return this._value; // 返回数据

  }

  // newVal为新数据
  set value(newVal) {
    // __v_isShallow  表示当前对象是否为浅层响应式对象。
    // isShallow      用于检查新值 newVal 是否是一个浅层响应式对象。
    // isReadonly     用于检查新值 newVal 是否是一个只读的响应式对象。

    const useDirectValue = this.__v_isShallow || isShallow(newVal) || isReadonly(newVal);

    newVal = useDirectValue ? newVal : toRaw(newVal); // 获取原始数据

    // 判断新旧数据是否不一致
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal; // 存储新数据组
      this._value = useDirectValue ? newVal : toReactive(newVal); // 继续代理

      triggerRefValue(this, newVal); // 进行驱动更新
    }
  }
}

/**
 * 收集上下文实例
 * @param {*} ref   为 RefImpl实例
 */
function trackRefValue(ref) {

  /* 
      shouldTrack  是否需要对数据依赖跟踪
      activeEffect  当前的副作用是否已激活
  */
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref); // 获取对象的原始数据
    trackEffects(ref.dep || (ref.dep = createDep())); // createDep 创建一个set实例，用于存储vue实例
  }
}

/**
 * 驱动更新
 * @param {*} ref     响应式数据的实例
 * @param {*} newVal  新数据
 */
function triggerRefValue(ref, newVal) {

  ref = toRaw(ref); // 获取原始数据
  const dep = ref.dep; // dep 为set实例

  triggerEffects(dep); // 收集依赖
  
}

/**
 * 收集当前激活的副作用
 * @param {*} dep  // 为 set实例
 * @param {*} debuggerEventExtraInfo
 */
function trackEffects(dep, debuggerEventExtraInfo) {
  let shouldTrack = false;

  /* 
    effectTrackDepth  跟踪深度
    maxMarkerBits 最大可用标记数量 （相当于最大的可跟踪深度）
     最大的跟踪深度为30
  */
  if (effectTrackDepth <= maxMarkerBits) {

    // 进行依赖跟踪
    if (!newTracked(dep)) {
      dep.n |= trackOpBit;
      shouldTrack = !wasTracked(dep);
    }

  } else {

    shouldTrack = !dep.has(activeEffect); // 判断该属性是否没有收集到副作用
  
  }

  // 判断当前是否有激活的副作用
  if (shouldTrack) {

    dep.add(activeEffect); // 装载 当前激活作用域
    activeEffect.deps.push(dep); // 将自己的set数组也添加到副作用的实例中
    
  }
}

/**
 * 进行驱动更新
 * @param {*} dep // set实例
 * @param {*} debuggerEventExtraInfo
 */
function triggerEffects(dep, debuggerEventExtraInfo) {

  const effects = isArray(dep) ? dep : [...dep]; // 将set实例中的副作用取出来

  // 进行循环
  for (const effect of effects) {

    // computed一般是计算属性的函数
    if (effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo); // 进行驱动更新
    }

  }
  for (const effect of effects) {

    if (!effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo); // 进行驱动更新
    }

  }
}

/**
 * 进行更新
 * @param {*} effect   副作用
 * @param {*} debuggerEventExtraInfo
 */
function triggerEffect(effect, debuggerEventExtraInfo) {

  /* 
      收集到的副作用必须不是当前正在执行的副作用，这是防止 副作用函数自我递归触发 的机制
      allowRecurse 控制是否可以递归调用
  */
  if (effect !== activeEffect || effect.allowRecurse) {

    if (effect.scheduler) {
      effect.scheduler(); // 如果是在计算属性的,则这个函数就是修改计算属性的脏值。
    } else {
      effect.run(); // 重渲染
    }
  }

}


/**
 * 判断是否是 ref 数据
 * @param {*} target  数据 
 */
function isRef(target){
  return target !== null && target.__v_isRef === true;
}

// 每个组件或页面首次创建时都会 创建ReactiveEffect类，fn参数为重渲染函数
class ReactiveEffect {
  active = true; // 是否激活
  deps = [];  // 依赖项
  parent;  // 父级作用（链式依赖）
  computed;
  allowRecurse; // 是否允许递归
  deferStop;

  onStop;
  onTrack;
  onTrigger;

  constructor(fn, scheduler = null, scope) {
    recordEffectScope(this, scope); // 记录当前的副作用函数所属的作用域
    this.fn = fn; // 副作用函数（渲染函数）
    this.scheduler = scheduler; // 调度器函数
  }

  run() {
    if (!this.active) {
      return this.fn(); // 渲染
    }
    let parent = this.parent;
    let lastShouldTrack = shouldTrack;

    while (parent) {
      if (parent === this) {
        return;
      }
      parent = parent.parent;
    }

    try {
      this.parent = activeEffect; // 保存当前活跃的副作用
      activeEffect = this; // 设置当前副作用
      shouldTrack = true; // 启用依赖追踪

      trackOpBit = 1 << ++effectTrackDepth;

      if (effectTrackDepth <= maxMarkerBits) {
        initDepMarkers(this); // 初始化依赖的标记状态
      } else {
        cleanupEffect(this); // 清除依赖关系
      }

      return this.fn(); // 执行渲染函数
    } finally {
      if (effectTrackDepth <= maxMarkerBits) {
        finalizeDepMarkers(this);
      }

      // 设置追踪深度
      trackOpBit = 1 << --effectTrackDepth;

      activeEffect = this.parent; // 恢复父级副作用
      shouldTrack = lastShouldTrack; // 恢复追踪渣土奶
      this.parent = undefined;

      if (this.deferStop) {
        this.stop();
      }
    }
  }

  stop() {
    if (activeEffect === this) {
      this.deferStop = true;
    } else if (this.active) {
      cleanupEffect(this); // 清除依赖关系
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}

/* 



*/
