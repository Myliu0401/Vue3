import {
  ReactiveFlags,
  TrackOpTypes,
  TriggerOpTypes
} from './constants';
import {
  pauseScheduling,
  pauseTracking,
  resetScheduling,
  resetTracking,
} from './effect';
import { ITERATE_KEY, track, trigger } from './reactiveEffect';
import {
  hasChanged,
  hasOwn,
  isArray,
  isIntegerKey,
  isObject,
  isSymbol,
  makeMap,
} from '@vue/shared';
import { isRef } from './ref';
import { warn } from './warning';

const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`);

const builtInSymbols = new Set(
  /*#__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
);

const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations();

function createArrayInstrumentations() {
  const instrumentations = {};
  (['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    instrumentations[key] = function (...args) {
      const arr = toRaw(this);
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + '');
      }
      const res = arr[key](...args);
      if (res === -1 || res === false) {
        return arr[key](...args.map(toRaw));
      } else {
        return res;
      }
    }
  });
  (['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    instrumentations[key] = function (...args) {
      pauseTracking();
      pauseScheduling();
      const res = (toRaw(this))[key].apply(this, args);
      resetScheduling();
      resetTracking();
      return res;
    }
  });
  return instrumentations;
}

function hasOwnProperty(key) {
  const obj = toRaw(this);
  track(obj, TrackOpTypes.HAS, key);
  return obj.hasOwnProperty(key);
}

class BaseReactiveHandler {
  constructor(_isReadonly = false, _shallow = false) {
    this._isReadonly = _isReadonly;
    this._shallow = _shallow;
  }

  /**
   * 
   * @param {*} target    原始对象
   * @param {*} key       属性名
   * @param {*} receiver  代理对象
   * @returns 
   */
  get(target, key, receiver) {
    const isReadonly = this._isReadonly,
      shallow = this._shallow;

    // 判断 是否是 访问特定属性
    if (key === ReactiveFlags.IS_REACTIVE) { // 是否不是只读的
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {  // 是否是只读的
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {  // 是否是浅层响应式
      return shallow;
    } else if (key === ReactiveFlags.RAW) {
      // 判断代理对象是否等于原始对象。如果是，则返回原始对象，否 则返回undefined
      if (receiver === (isReadonly ? shallow ? shallowReadonlyMap : readonlyMap : shallow ? shallowReactiveMap : reactiveMap ).get(target) ||
        Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
      ) {
        return target;
      }
      return;
    }

    const targetIsArray = isArray(target); // 判断是否是数组

    // 判断是否不是只读的
    if (!isReadonly) {
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) { // 并且arrayInstrumentations实例中拥有该属性
        return Reflect.get(arrayInstrumentations, key, receiver); // 获取该属性
      }
      if (key === 'hasOwnProperty') {
        return hasOwnProperty;
      }
    }

    const res = Reflect.get(target, key, receiver); // 获取该属性

    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res;
    }

    // 是否不是只读的
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key);  // 收集依赖
    }

    if (shallow) {
      return res;
    }

    // 判断是否是ref对象
    if (isRef(res)) {
      return targetIsArray && isIntegerKey(key) ? res : res.value;
    }

    // 判断是否是引用类型的
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }

    return res;
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(shallow = false) {
    super(false, shallow);
  }

  /**
   * 修改或添加时触发
   * @param {*} target     原始数据 
   * @param {*} key        属性名
   * @param {*} value      修改的属性值
   * @param {*} receiver   代理对象
   * @returns 
   */
  set(target, key, value, receiver) {
    let oldValue = target[key]; // 获取旧的数据


    if (!this._shallow) {
      const isOldValueReadonly = isReadonly(oldValue); // 判断是否是只读的
      
      // 判断数据是否不是浅层的响应式对象并且不是只读的
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue);  // 获取原始数
        value = toRaw(value); // 获取原始数据
      };


      // 不是数组并且旧数据是ref数据并且新数据不是ref数据
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        
        if (isOldValueReadonly) { // 是否为只读
          return false;
        } else {
          oldValue.value = value;
          return true;
        }
      }
    } else { }

    // 判断是否是数组并且索引是整数的   hasOwn判断原始数据中是否有指定的键
    const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);


    const result = Reflect.set(target, key, value, receiver); // 修改/设置 属性

    // 判断原始数据是否跟对象是同一个
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value); // 触发后续微队列中的页面从渲染
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue);  // 触发后续微队列中的页面从渲染
      }
    };


    return result;
  }


  // 删除时触发 
  deleteProperty(target, key) {
    const hadKey = hasOwn(target, key); // 判断原始数据中是否有指定的属性
    const oldValue = target[key]; // 获取旧数据
    const result = Reflect.deleteProperty(target, key); // 从原始对象中，对该属性进行删除

    // 判断是否删除成功并且有该属性
    if (result && hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);  // 触发重渲染
    }

    return result;
  }

  
  //判断一个对象是否拥有一个属性
  has(target, key) {
    const result = Reflect.has(target, key);
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      track(target, TrackOpTypes.HAS, key);
    }
    return result;
  }

  ownKeys(target) {
    track(
      target,
      TrackOpTypes.ITERATE,
      isArray(target) ? 'length' : ITERATE_KEY,
    );
    return Reflect.ownKeys(target);
  }
}

class ReadonlyReactiveHandler extends BaseReactiveHandler {
  constructor(shallow = false) {
    super(true, shallow);
  }

  // 修改/添加 直接返回true
  set(target, key) {
   
    return true;
  }

  // 删除  直接返回true
  deleteProperty(target, key) {
   
    return true;
  }
}

export const mutableHandlers =
  /*#__PURE__*/
  new MutableReactiveHandler();

export const readonlyHandlers =
  /*#__PURE__*/
  new ReadonlyReactiveHandler();

export const shallowReactiveHandlers =
  /*#__PURE__*/
  new MutableReactiveHandler(true);

export const shallowReadonlyHandlers =
  /*#__PURE__*/
  new ReadonlyReactiveHandler(true);