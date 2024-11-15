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

  constructor(fn, scheduler = null, scope) {
    recordEffectScope(this, scope); // 记录当前的副作用函数所属的作用域
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
    let depsMap = targetMap.get(target);  // 获取存储的数据

    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }

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
    activeEffect.deps.push(dep);
  }
}

/**
 * 驱动更新
 * @param {*} target
 * @param {*} type
 * @param {*} key
 * @param {*} newValue
 * @param {*} oldValue
 * @param {*} oldTarget
 * @returns
 */
export function trigger(target, type, key, newValue, oldValue, oldTarget) {
  const depsMap = targetMap.get(target); // 获取原始对象数据的 Map集合
  if (!depsMap) {
    return;
  }

  let deps = [];
  if (type === TriggerOpTypes.CLEAR) {
    deps = [...depsMap.values()];
  } else if (key === "length" && isArray(target)) {
    const newLength = Number(newValue);
    depsMap.forEach((dep, key) => {
      if (key === "length" || (!isSymbol(key) && key >= newLength)) {
        deps.push(dep);
      }
    });
  } else {
    if (key !== void 0) {
      deps.push(depsMap.get(key));
    }

    // 将原始数据的Map集合下，对应的属性的Set集合中的dep添加进去
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        } else if (isIntegerKey(key)) {
          deps.push(depsMap.get("length"));
        }
        break;
      case TriggerOpTypes.DELETE:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        }
        break;
      case TriggerOpTypes.SET:
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

export function getDepFromReactive(object, key) {
  return targetMap.get(object)?.get(key);
}
