

// 创建一个ref数据
export function ref(value) {
  return createRef(value, false);
};

// 创建RefImpl实例
function createRef(rawValue, shallow) {

  // 判断该数据是否已ref代理对象
  if (isRef(rawValue)) {
    return rawValue; // 直接返回rsf对象
  }
  return new RefImpl(rawValue, shallow);
};

// 通常用于确保对原始数据的直接访问而不触发 Vue 的响应式机制
function toRaw(value) {

   /* 
       __v_raw  属性返回 reactive 和 readonly 的原始数据
      
   
   */

  return value && value.__v_raw ? value.__v_raw : value;
};

function toReactive(value) {
  return reactive(value)
};

function reactive(target) {

  // 检查新值 数据 是否是只读的响应式对象
  if (isReadonly(target)) {
    return target;
  };

  // 创建实例对象
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  );
};


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
  if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
    return target;
  }


  const existingProxy = proxyMap.get(target); // 是否已有该数据
  if (existingProxy) {
    return existingProxy;
  };

  // 判断是否是原始类型 
  const targetType = getTargetType(target);
  if (targetType === TargetType.INVALID) {
    return target;
  };


  // 进行代理
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  );


  proxyMap.set(target, proxy); // 向集合中添加该数据


  return proxy;  // 返回代理对象
};

function hasChanged(newValue, oldValue){
   return !Object.is(newValue, oldValue);
};

// 创建ref实例的类
class RefImpl {

  // value为数据   isShallow为布尔
  constructor(value, isShallow) {
    this._rawValue = isShallow ? value : toRaw(value);  // toRaw 获取原始数据
    this._value = isShallow ? value : toReactive(value); // toReactive 判断是否是否引用类型，如果是则调用reactive函数
  }

  get value() {
    trackRefValue(this);  // 收集 组件或页面上下文实例

    return this._value;
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
      this._value = useDirectValue ? newVal : toReactive(newVal); // 

      triggerRefValue(this, newVal); // 进行驱动更新
    }
  }
};

// 收集上下文实例
function trackRefValue(ref) {
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref);  // 获取对象背后的原始数据的函数
    trackEffects(ref.dep || (ref.dep = createDep()));  // createDep 创建一个set实例，用于存储vue实例
  }
}


/**
 * 
 * @param {*} ref     响应式数据的实例
 * @param {*} newVal  新数据
 */
function triggerRefValue(ref, newVal) {
  ref = toRaw(ref);  // 获取原始数据
  const dep = ref.dep;

  triggerEffects(dep);


};


// 收集当前激活的副作用
function trackEffects(dep, debuggerEventExtraInfo) {
  let shouldTrack = false;
  if (effectTrackDepth <= maxMarkerBits) {
    if (!newTracked(dep)) {
      dep.n |= trackOpBit;
      shouldTrack = !wasTracked(dep);
    }
  } else {
    shouldTrack = !dep.has(activeEffect);  // 判断是否已有该作用域
  }

  if (shouldTrack) {
    dep.add(activeEffect); // 装载 当前激活作用域
    activeEffect.deps.push(dep); // 将自己的set数组也添加到副作用的实例中

  }
};



// 进行驱动更新
function triggerEffects(dep, debuggerEventExtraInfo) {
  const effects = isArray(dep) ? dep : [...dep];
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo);
    }
  }
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo);
    }
  }
};


function triggerEffect(effect, debuggerEventExtraInfo) {
  if (effect !== activeEffect || effect.allowRecurse) {

    if (effect.scheduler) {
      effect.scheduler(); // 如果是在计算属性的,则这个函数就是修改计算属性的脏值。
    } else {
      effect.run(); // 重渲染
    }
  }
};


// 每个组件或页面首次创建时都会 创建ReactiveEffect类，fn参数为重渲染函数
class ReactiveEffect {
  active = true;
  deps = [];
  parent;
  computed;
  allowRecurse;
  deferStop;

  onStop;
  onTrack;
  onTrigger;

  constructor(fn, scheduler = null, scope) {
    recordEffectScope(this, scope);  // 记录当前的副作用函数所属的作用域
    this.fn = fn;
    this.scheduler = scheduler;
  }

  run() {
    if (!this.active) {
      return this.fn();
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
      this.parent = activeEffect;
      activeEffect = this;
      shouldTrack = true;

      trackOpBit = 1 << ++effectTrackDepth;

      if (effectTrackDepth <= maxMarkerBits) {
        initDepMarkers(this);
      } else {
        cleanupEffect(this);
      }

      return this.fn();
    } finally {
      if (effectTrackDepth <= maxMarkerBits) {
        finalizeDepMarkers(this);
      }

      trackOpBit = 1 << --effectTrackDepth;

      activeEffect = this.parent;
      shouldTrack = lastShouldTrack;
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
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}