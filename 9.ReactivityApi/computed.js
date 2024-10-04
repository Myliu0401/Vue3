import { type DebuggerOptions, ReactiveEffect } from './effect'
import { type Ref, trackRefValue, triggerRefValue } from './ref'
import { NOOP, hasChanged, isFunction } from '@vue/shared'
import { toRaw } from './reactive'
import type { Dep } from './dep'
import { DirtyLevels, ReactiveFlags } from './constants'

const ComputedRefSymbol = Symbol();



/**
 * 创建计算属性
 * @param {*} getterOrOptions   配置对象或函数 
 * @param {*} debugOptions      配置对象
 * @param {*} isSSR    
 * @returns 
 */
function computed(getterOrOptions, debugOptions, isSSR = false) {

  let getter;
  let setter;

  const onlyGetter = isFunction(getterOrOptions); // 判断是否是函数

  if (onlyGetter) {
    getter = getterOrOptions; // 读取时的函数
    setter = NOOP;  // 占位的空函数 
  } else {
    getter = getterOrOptions.get; // 获取读取的函数
    setter = getterOrOptions.set; // 获取修改的函数
  }

  // computed  吐音 堪biu T

  // 创建实例
  const cRef = new ComputedRefImpl(
    getter,
    setter,
    onlyGetter || !setter,  // 如果getterOrOptions是函数，则为true, 否则为false
    isSSR
  );


  return cRef; // 返回 ComputedRefImpl实例
};


/**
 * getter  读取时的函数
 * _setter   修改时的函数
 */
 class ComputedRefImpl {
  constructor(getter, _setter, isReadonly, isSSR) {

    this.dep = undefined;

    this._value = undefined;


    // 创建追踪响应式数据的类
    this.effect = new ReactiveEffect(getter, () => {

      // 是否为脏值
      if (!this._dirty) {
        this._dirty = true; // 设置为脏值
        triggerRefValue(this);
      }
    });

    this.effect.computed = this;

    this.effect.active = (this._cacheable = !isSSR);

    this.__v_isRef = true;

    this[ReactiveFlags.IS_READONLY] = isReadonly;

    this._dirty = true; // 是否为脏值，也就是是否更新

  };


  // 读取value时运行
  get value() {
    const self = toRaw(this);  // 获取原始数据，没有则返回参数

    trackRefValue(self);  // 记录作用域

    // 判断是否是脏值
    if (self._dirty || !self._cacheable) {
      self._dirty = false;
      self._value = self.effect.run(); // 执行该函数将当前激活的作用域该成该计算属性的作用域，待依赖的属性收集该作用域
    };

    return self._value;
  };


  // 修改value时运行
  set value(newValue) {
    this._setter(newValue);
  }
};








// 追踪和管理响应式副作用的核心机制。它是Vue 3响应式系统的基础之一
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


  /**
   * 
   * @param {*} fn          读取时触发的函数
   * @param {*} scheduler   修改时触发的函数
   * @param {*} scope 
   */
  constructor(fn, scheduler = null, scope) {
    recordEffectScope(this, scope);  // 记录当前的副作用函数所属的作用域
    this.fn = fn; 
    this.scheduler = scheduler;
  }

  run() {

    if (!this.active) {
      return this.fn();
    };

    let parent = this.parent; // 获取父级
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
      shouldTrack = true;  // 开启依赖跟踪

      trackOpBit = 1 << ++effectTrackDepth; 

      // maxMarkerBits  用来限制每一个ReactiveEffect 对象的 deps 数组的长度。

      if (effectTrackDepth <= maxMarkerBits) {
        initDepMarkers(this);  // 始化 deps 数组，并为每个依赖项设置初始标记位。
      } else {
        cleanupEffect(this); // 该方法会清空 deps 数组，并释放相关的资源。
      }

      return this.fn();  // 运行读取函数
    } finally {
      if (effectTrackDepth <= maxMarkerBits) {
        finalizeDepMarkers(this);  // 会根据当前已追踪的依赖项，确定哪些依赖项需要保留，并将其标记位设置为最终状态。
      }

      trackOpBit = 1 << --effectTrackDepth;

      // 恢复原始
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
};


// 将副作用添加到当前的作用域中
function recordEffectScope(effect, scope = activeEffectScope) {
  if (scope && scope.active) {
    scope.effects.push(effect);
  }
};


// ref为 computedRefImpl
function trackRefValue(ref) {
  if (shouldTrack && activeEffect) {
      ref = toRaw(ref);  // 获取对象背后的原始数据的函数
      trackEffects(ref.dep || (ref.dep = createDep()));  // createDep 创建一个set实例，用于存储vue实例
  }
};



export function trackEffects(dep, debuggerEventExtraInfo) {
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
    dep.add(activeEffect); // 装载 当前激活的作用域

    activeEffect.deps.push(dep); // 将set数组添加进当前激活作用域的实例中
    
  }
}


function triggerRefValue(ref, newVal) {
  ref = toRaw(ref);
  const dep = ref.dep;

  triggerEffects(dep);


};


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
      effect.scheduler(); // 计算属性修改脏值
    } else {
      effect.run(); // 页面刷新
    }
  }
};