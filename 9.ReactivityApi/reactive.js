import { isObject, toRawType, def } from "@vue/shared";
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";
import {
  mutableCollectionHandlers,
  readonlyCollectionHandlers,
  shallowCollectionHandlers,
  shallowReadonlyCollectionHandlers,
} from "./collectionHandlers";

export const ReactiveFlags = {
  SKIP: "__v_skip",
  IS_REACTIVE: "__v_isReactive", // 表示是否是响应式对象
  IS_READONLY: "__v_isReadonly", // 表示是否是只读的对象
  IS_SHALLOW: "__v_isShallow",
  RAW: "__v_raw", // 表示是否是代理对象
};

export const reactiveMap = new WeakMap();
export const shallowReactiveMap = new WeakMap();
export const readonlyMap = new WeakMap();
export const shallowReadonlyMap = new WeakMap();
export const targetMap = new WeakMap();

const TargetType = {
  INVALID: 0, // 无效的目标类型  null、undefined
  COMMON: 1, // 普通目标类型
  COLLECTION: 2, // 集合类型  如 Set、Map
};

// 判断该数据是否是通过readonly创建的
function isReadonly(value) {
  return value.__v_readonly; // 是不是只读的
}

/**
 * 创建响应式数据
 * @param {*} target   数据 
 * @returns 
 */
export function reactive(target) {
  
  // 判断数据是否是通过readonly创建的只读数据
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

// 创建只读的代理对象
export function readonly(target) {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  );
}

/**
 *
 * @param {*} target     数据
 * @param {*} isReadonly 是否是只读
 * @param {*} baseHandlers  代理的配置对象
 * @param {*} collectionHandlers  集合类型 Map、Set、WeakMap、WeakSet
 * @param {*} proxyMap  WeakMap  实例
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

  /**
   * target[ReactiveFlags.RAW]  是否是代理对象
   * isReadonly  是否是只读
   * target[ReactiveFlags.IS_REACTIVE]  是否是响应式对象
   *
   * 如果原始数据已经是代理对象并且 (isReadonly为false或者不是只读对象)
   */
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target; // 直接返回原始数据
  }

  const existingProxy = proxyMap.get(target); // 是否已经代理过该数据
  if (existingProxy) {
    return existingProxy; // 直接返回
  }

  // 获取对象是否不可代理或不可扩展或数据不是引用类型
  const targetType = getTargetType(target);

  // 是否是无效类型
  if (targetType === TargetType.INVALID) {
    return target;
  }

  /**
   * 进行代理
   * COLLECTION 集合类型  如  Set、Map
   * 一般第二个参数都为 baseHandlers
   */
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  );

  proxyMap.set(target, proxy); // 向集合中添加该数据

  return proxy; // 返回代理对象
}

/**
 * 该值是否不可扩展（即Object.isExtensible(value)返回false）。如果满足任一条件，表明这个值无法被追踪/观察，因此将返回TargetType.INVALID（无效目标类型）。
 * 都不满足，那么它将使用toRawType函数将值转换为原始类型，并将结果传递给targetTypeMap函数进行进一步处理。targetTypeMap函数可能会根据不同的原始类型返回相应的目标类型。
 *
 * ReactiveFlags.SKIP 是vue内容用来标识一个对象不应该被代理的标志
 * Object.isExtensible(value)  用于检测对象是否可扩展，只有可扩展的才能被代理
 *
 * @param {*} value
 * @returns
 */
function getTargetType(value) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value));
}

const toTypeString = (value) => Object.prototype.toString.call(value); // 获取数据类型

// 截取数据类型
const toRawType = (value) => {
  return toTypeString(value).slice(8, -1);
};

// 返回规定的对应编码
function targetTypeMap(rawType) {
  switch (rawType) {
    case "Object":
    case "Array":
      return TargetType.COMMON; // 普通对象类型
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return TargetType.COLLECTION; // 集合类型
    default:
      return TargetType.INVALID; // 无效类型
  }
}



class BaseReactiveHandler {
  constructor(_isReadonly = false, _shallow = false) {
    this._isReadonly = _isReadonly;
    this._shallow = _shallow;
  }

  /**
   * 获取属性时触发
   * @param {*} target    原始对象
   * @param {*} key       属性名
   * @param {*} receiver  代理对象
   * @returns
   */
  get(target, key, receiver) {
    const isReadonly = this._isReadonly,  // 是否只读
      shallow = this._shallow; // 是否是浅层代理

    // 判断 是否是 访问特定属性
    if (key === ReactiveFlags.IS_REACTIVE) {
      // 是否不是只读的
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      // 是否是只读的
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      // 是否是浅层响应式
      return shallow;
    } else if (key === ReactiveFlags.RAW) {
      // 判断代理对象是否等于创建数据时存起来的代理对象 或者 原始数据中的原型是否等于代理对象的原型
      if (
        receiver === (
          isReadonly ? shallow ? shallowReadonlyMap : readonlyMap : 
          shallow ? shallowReactiveMap : reactiveMap
          ).get(target) ||
        Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
      ) {
        return target; // 返回原始对象
      }
      return;
    }

    const targetIsArray = isArray(target); // 判断是否是数组

    // arrayInstrumentations是一个对象，用于提供对数组操作的响应式拦截方法。它包含了一组针对数组的处理器函数，用于拦截并处理数组的变更操作，从而实现对数组的响应式追踪。

    // 判断是否不是只读的
    if (!isReadonly) {
      // 并且arrayInstrumentations实例中拥有该属性  就是判断是不是访问数组的原型方法
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver); // 获取该属性
      }

      // 是否是获取特殊属性
      if (key === "hasOwnProperty") {
        return hasOwnProperty;
      }
    }

    const res = Reflect.get(target, key, receiver); // 进行反射，获取该属性

    // 判断属性是否是symbol类型的
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res;
    }

    // 是否不是只读的，只读的就不会进入，从而不会进行当前作用域的收集
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key); // 收集依赖
    }

    /**
     * 是否是浅层响应式
     * 浅层响应式对象，表示只对响应式的数据和顶层属性进代理
     */
    if (shallow) {
      return res;
    }

    // 判断是否是ref对象
    if (isRef(res)) {

      // 是否是数组并且是属性有效果的数值
      return targetIsArray && isIntegerKey(key) ? res : res.value;
    }

    // 判断是否是引用类型的
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res); // 进行递归
    }

    return res; // 返回数据
  }
}

/**
 * 进行继承BaseReactiveHandler
 * reactive代理对象的配置实例
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

    if (!this._shallow) {
      const isOldValueReadonly = isReadonly(oldValue); // 判断是否是只读的

      // 判断数据是否不是浅层的响应式对象并且不是只读的
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue); // 获取原始数
        value = toRaw(value); // 获取原始数据
      }

      // 不是数组并且旧数据是ref数据并且新数据不是ref数据
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        if (isOldValueReadonly) {
          // 是否为只读
          return false;
        } else {
          oldValue.value = value; // 修改ref的value也会触发重渲染
          return true;
        }
      }
    } else {
    }

    // 判断是否是数组并且索引是整数的   hasOwn判断原始数据中是否有指定的键
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);

    // Reflect为反射

    const result = Reflect.set(target, key, value, receiver); // 修改/设置 属性

    // 判断原始数据是否跟对象是同一个
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value); // 触发后续微队列中的页面重渲染
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue); // 触发后续微队列中的页面重渲染
      }
    }

    return result;
  }

  // 删除时触发
  deleteProperty(target, key) {
    const hadKey = hasOwn(target, key); // 判断原始数据中是否有指定的属性
    const oldValue = target[key]; // 获取旧数据
    const result = Reflect.deleteProperty(target, key); // 从原始对象中，对该属性进行删除

    // 判断是否删除成功并且有该属性
    if (result && hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue); // 触发重渲染
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
      isArray(target) ? "length" : ITERATE_KEY
    );
    return Reflect.ownKeys(target);
  }
}

function toRaw(observed) {
  // 该代理对象是否是 Reactive 或 Readonly 代理的
  if (isReactive(observed) || isReadonly(observed)) {
    return observed.__v_raw; // 返回原始数据
  }
  return observed; // 返回代理对象
}

// readonly代理对象的配置实例
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
