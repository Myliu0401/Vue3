import { TrackOpTypes, TriggerOpTypes } from "./operations";
import { extend, isArray, isIntegerKey, isMap, isSymbol } from "@vue/shared";
import { EffectScope, recordEffectScope } from "./effectScope";
import {
  createDep,
  Dep,
  finalizeDepMarkers,
  initDepMarkers,
  newTracked,
  wasTracked,
} from "./dep";
import { ComputedRefImpl } from "./computed";

const targetMap = new WeakMap();

let effectTrackDepth = 0;

export let trackOpBit = 1;

const maxMarkerBits = 30;

export type EffectScheduler = (...args: any[]) => any;

export type DebuggerEvent = {
  effect: ReactiveEffect,
} & DebuggerEventExtraInfo;

export type DebuggerEventExtraInfo = {
  target: object,
  type: TrackOpTypes | TriggerOpTypes,
  key: any,
  newValue?: any,
  oldValue?: any,
  oldTarget?: Map<any, any> | Set<any>,
};

export let activeEffect;

export const ITERATE_KEY = Symbol(__DEV__ ? "iterate" : "");
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? "Map key iterate" : "");

// 组件首次渲染时会先执行该函数创建副作用
export function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  if (!options.lazy) {
    _effect.run(); // 在这里调用 .run()，并设置 activeEffect
  }
  return _effect;
}

// 追踪和管理响应式副作用的核心机制。它是Vue 3响应式系统的基础之一
export class ReactiveEffect {
  active = true;
  deps = [];
  parent;
  computed;
  allowRecurse;
  deferStop;

  onStop;
  onTrack;
  onTrigger;

  // fn 通常是组件的render渲染函数
  constructor(fn, scheduler = null, scope) {
    recordEffectScope(this, scope); // 记录当前的副作用函数所属的作用域
    this.fn = fn;
    this.scheduler = scheduler;
  }

  run() {
    if (!this.active) {
      return this.fn(); // 执行render渲染函数
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
      activeEffect = this; // 将当前的实例赋值到全局变量
      shouldTrack = true;

      trackOpBit = 1 << ++effectTrackDepth;

      if (effectTrackDepth <= maxMarkerBits) {
        initDepMarkers(this);
      } else {
        cleanupEffect(this);
      }

      return this.fn(); // 执行渲染组件
    } finally {
      /* 
          finally 块总会执行：
            即使 try 块中执行了 return，或者 catch 块中执行了 return，
            finally 块也一定会在 return 之后、函数真正返回值之前执行。

          return 和 finally 的交互：
            当 try 或 catch 中执行 return 时，函数的返回值已经确定，但在返回之前，finally 会被执行。
            如果 finally 中不包含 return，try 或 catch 中的 return 结果会作为函数的返回值。
            如果 finally 中包含 return，它会覆盖之前的返回值。
            
          try和catch
            如果try中执行了return 并且发生了错误，catche也一定会执行，如果有finally的话，也会执行

      
      */

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

export function recordEffectScope(effect, scope = activeEffectScope) {
  if (scope && scope.active) {
    scope.effects.push(effect);
  }
}

function cleanupEffect(effect) {
  const deps = effect.deps;
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect);
  }
  deps.length = 0;
}

export function effect(fn, options) {
  if (fn.effect instanceof ReactiveEffect) {
    fn = fn.effect.fn;
  }

  const _effect = new ReactiveEffect(fn);
  if (options) {
    extend(_effect, options);
    if (options.scope) recordEffectScope(_effect, options.scope);
  }
  if (!options || !options.lazy) {
    _effect.run();
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

export function stop(runner) {
  runner.effect.stop();
}

export let shouldTrack = true;
const trackStack = [];

export function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

export function enableTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}

export function resetTracking() {
  const last = trackStack.pop();
  shouldTrack = last === undefined ? true : last;
}

/**
 * 收集依赖
 * @param {*} target   原始对象  被追踪的目标对象
 * @param {*} type     类型      操作类型，通常指示是读取、写入等类型的操作
 * @param {*} key      属性名    在 target 对象中被访问的属性键
 */
export function track(target, type, key) {
  // 判断是否有副作用实例
  if (shouldTrack && activeEffect) {
    let depsMap = targetMap.get(target); // 获取存储的数据

    // 判断是否没有依赖映射表
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }

    // 获取属性的依赖映射表
    let dep = depsMap.get(key);

    if (!dep) {
      // 创建 set数组
      depsMap.set(key, (dep = createDep()));
    }

    const eventInfo = __DEV__
      ? { effect: activeEffect, target, type, key }
      : undefined;

    trackEffects(dep, eventInfo); // 追踪副作用
  }
}

/**
 * 用于追踪副作用
 * @param {*} dep set数组
 * @param {*} debuggerEventExtraInfo
 */
export function trackEffects(dep, debuggerEventExtraInfo) {
  let shouldTrack = false;

  // 这个判断的目的是为了控制副作用追踪的深度，以避免在嵌套副作用的情况下导致性能问题或栈溢出。
  if (effectTrackDepth <= maxMarkerBits) {
    if (!newTracked(dep)) {
      dep.n |= trackOpBit;

      // 判断当前的副作用（activeEffect）是否已经存在于这个集合中
      shouldTrack = !wasTracked(dep);
    }
  } else {
    shouldTrack = !dep.has(activeEffect); // 判断是否已有该作用域
  }

  // 如果没有追踪则进行追踪
  if (shouldTrack) {
    dep.add(activeEffect); // 装载 作用域
    activeEffect.deps.push(dep); // 将映射项装载到作用域中
  }
}

/**
 * 驱动更新
 * @param {*} target      数据对象
 * @param {*} type        类型
 * @param {*} key         属性名
 * @param {*} newValue    新数据
 * @param {*} oldValue    旧数据
 * @param {*} oldTarget
 * @returns
 */
export function trigger(target, type, key, newValue, oldValue, oldTarget) {

  const depsMap = targetMap.get(target); // 获取原始对象数据的 Map集合，因为收集依赖时会为原生数据创建一个map集合

  if (!depsMap) {
    return;
  }

  let deps = [];

  // 是否为清除类型
  if (type === TriggerOpTypes.CLEAR) {
    deps = [...depsMap.values()];
  } else if (key === "length" && isArray(target)) {
    // 判断是否是数组并且获取的是长度
    const newLength = Number(newValue);
    depsMap.forEach((dep, key) => {
      if (key === "length" || (!isSymbol(key) && key >= newLength)) {
        deps.push(dep);
      }
    });
  } else {

    // 判断key是否不是undefined
    if (key !== void 0) {
      deps.push(depsMap.get(key));  // 获取
    }

    // 将原始数据的Map集合下，对应的属性的Set集合中的dep添加进去
    switch (type) {
      case TriggerOpTypes.ADD: // 类型为添加

        // 是否不是数组
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        } else if (isIntegerKey(key)) {
          deps.push(depsMap.get("length"));
        }
        break;
      case TriggerOpTypes.DELETE: // 类型为删除
        // 是否不是数组
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY));

          // 是否是map实例
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        }
        break;
      case TriggerOpTypes.SET: // 类型为修改

        // 判断参数是否为map实例
        if (isMap(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
        }
        break;
    }
  }

  const eventInfo = __DEV__
    ? { target, type, key, newValue, oldValue, oldTarget }
    : undefined;

  if (deps.length === 1) {
    if (deps[0]) {
      if (__DEV__) {
        triggerEffects(deps[0], eventInfo);
      } else {
        triggerEffects(deps[0]);
      }
    }
  } else {
    const effects = [];
    for (const dep of deps) {
      if (dep) {
        effects.push(...dep);
      }
    }
    if (__DEV__) {
      triggerEffects(createDep(effects), eventInfo);
    } else {
      triggerEffects(createDep(effects));
    }
  }
}



/**
 *
 * @param {*} dep
 * @param {*} debuggerEventExtraInfo
 */
export function triggerEffects(dep, debuggerEventExtraInfo) {
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
}

function triggerEffect(effect, debuggerEventExtraInfo) {
  if (effect !== activeEffect || effect.allowRecurse) {
    if (effect.scheduler) {
      effect.scheduler(); // 这一个一般是计算属性的将
    } else {
      effect.run(); // 触发重渲染
    }
  }
}

// 判断数据是否是map类型
function isMap(value) {
  return Object.prototype.toString.call(value) === '[object Map]';
}

export function getDepFromReactive(object, key) {
  return targetMap.get(object)?.get(key);
}
