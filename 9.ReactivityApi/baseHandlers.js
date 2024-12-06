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


const ReactiveFlags = {
  SKIP: '__v_skip',           // 标识对象是否跳过响应式处理
  IS_REACTIVE: '__v_isReactive', // 标识对象是否为响应式对象
  IS_READONLY: '__v_isReadonly', // 标识对象是否为只读对象
  RAW: '__v_raw'              // 存储代理对象的原始数据
};


const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`);

const builtInSymbols = new Set(
  /*#__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
);


// 对数组原型上的方法进行劫持，重新封装
const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations();

function createArrayInstrumentations() {
  const instrumentations = {};

  // 处理依赖追踪的方法
  (['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    instrumentations[key] = function (...args) {
      const arr = toRaw(this);  // 获取原始数组
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + ''); // 跟踪每个索引
      }
      const res = arr[key](...args); // 执行原始方法
      if (res === -1 || res === false) {
        return arr[key](...args.map(toRaw)); // 将参数转为原始值后再查找
      } else {
        return res;
      }
    }
  });

  // 处理数组修改的方法
  (['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    instrumentations[key] = function (...args) {
      pauseTracking(); // 暂停依赖追踪
      pauseScheduling(); // 暂停调度
      const res = (toRaw(this))[key].apply(this, args); // 执行数组操作
      resetScheduling(); // 恢复调度
      resetTracking(); // 恢复依赖追踪
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


/**
 * 
 */
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

    const isReadonly = this._isReadonly, // 是否只读
      shallow = this._shallow; // 是否为浅层

    // 判断 是否是 访问特定属性
    if (key === ReactiveFlags.IS_REACTIVE) { // 是否不是只读的
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {  // 是否是只读的
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {  // 是否是浅层响应式
      return shallow;
    } else if (key === ReactiveFlags.RAW) {

      // 判断代理对象是否等于原始对象。如果是，则返回原始对象，否 则返回undefined
      if (receiver === (
         isReadonly ? shallow ? shallowReadonlyMap : readonlyMap :
         shallow ? shallowReactiveMap : reactiveMap ).get(target) ||
        Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
      ) {
        return target;
      }

      return;
    }

    const targetIsArray = isArray(target); // 判断是否是数组

    // 判断是否不是只读的
    if (!isReadonly) {

      // 是否是访问特定的几个数组的api, 这个特定的api是重写的，不是原生的api
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) { // 并且arrayInstrumentations实例中拥有该属性
        return Reflect.get(arrayInstrumentations, key, receiver); // 获取该属性
      }

      // 判断是否是访问hasOwnProperty方法
      if (key === 'hasOwnProperty') {

        // 返回的不是数组原型上的方法，而是重写的
        return hasOwnProperty;
      }
    }

    // 进行反射，获取属性
    const res = Reflect.get(target, key, receiver);

    /* 
        isSymbol 用于判断 key 是否为symbol类型
        builtInSymbols.has(key)  用于判断是否是内置符号
        isNonTrackableKeys  用于判断某个键是否是不可追踪的
    */
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res;
    }

    // 是否不是只读的
    if (!isReadonly) {

      track(target, TrackOpTypes.GET, key);  // 收集依赖,TrackOpTypes.GET类型表示获取

    }

    // 判断是否为浅层
    if (shallow) {
      return res;
    }

    // 判断是否是ref对象
    if (isRef(res)) {

      // 判断是否是数组
      return targetIsArray && isIntegerKey(key) ? res : res.value;
    }

    // 判断是否是引用类型的
    if (isObject(res)) {

      // 进行递归
      return isReadonly ? readonly(res) : reactive(res);
    }

    return res;
  }
}


/**
 * 进行继承BaseReactiveHandler
 * shallow  是否为浅层对象
 */
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

    // 判断是否不是浅层代理
    if (!this._shallow) {
      const isOldValueReadonly = isReadonly(oldValue); // 判断就数据是否是只读的

      // 判断数据是否不是浅层的响应式对象并且不是只读的
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue);  // 获取原始数
        value = toRaw(value); // 获取原始数据
      };


      // 原始数据不是数组并且旧数据是ref数据并且新数据不是ref数据
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {

        /* 
            进到这里将不会触发重渲染
            如 
              const state = reactive({
                count: ref(10), // count 是一个 ref
              });
              state.count = 20; // 修改 count 的值为普通值
        
        */
        
        if (isOldValueReadonly) { // 是否为只读
          return false;
        } else {
          oldValue.value = value;
          return true;
        }
      };

    } else {

      
    };

    // 判断是否是数组并且索引是整数的   hasOwn判断原始数据中是否有指定的键
    const hadKey = (isArray(target) && isIntegerKey(key)) ? Number(key) < target.length : hasOwn(target, key);


    const result = Reflect.set(target, key, value, receiver); // 修改/设置 属性
 
    // 判断原始数据是否是被代理
    if (target === toRaw(receiver)) {

      
      if (!hadKey) {
        // 进这里为添加
        
        trigger(target, TriggerOpTypes.ADD, key, value); // 触发后续微队列中的页面从渲染


      } else if (hasChanged(value, oldValue)) { // 判断新旧属性是否不相同
        // 进这里为修改

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

/**
 * shallow  表示是否应用到目标对象的嵌套属性
 */
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

// 通常用于确保对原始数据的直接访问而不触发 Vue 的响应式机制
function toRaw(value) {

  /* 
      __v_raw  属性返回 reactive 和 readonly 的原始数据
     
  
  */

 return value && value.__v_raw ? value.__v_raw : value;
};

/**
 * 检测字符串是否为整数键
 * @param {*} key 
 * @returns 
 */
function isIntegerKey(key) {
  return typeof key === 'string' && key !== 'NaN' && key[0] !== '-' && '' + parseInt(key, 10) === key;
}

/**
 * 判断数据是否是只读
 * @param {*} value 数据
 * @returns 
 */
function isReadonly(value) {
  return !!(value && value["__v_isReadonly"]);
}


/**
 * 用于判断对象是否拥有某个自身属性，既属性不是对象原型上的
 * @param {*} value 
 * @param {*} key 
 * @returns 
 */
function hasOwn(value, key) {
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  return hasOwnProperty.call(value, key);
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