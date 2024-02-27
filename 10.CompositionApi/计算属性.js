import { DebuggerOptions, ReactiveEffect } from './effect';
import { Ref, trackRefValue, triggerRefValue } from './ref';
import { isFunction, NOOP } from '@vue/shared';
import { ReactiveFlags, toRaw } from './reactive';
import { Dep } from './dep';

const ComputedRefSymbol = Symbol();

export class ComputedRefImpl {
  constructor(getter, setter, isReadonly, isSSR) {
    this.dep = undefined;
    this._value = undefined;
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        triggerRefValue(this);
      }
    });
    this.effect.computed = this;
    this.effect.active = this._cacheable = !isSSR;
    this[ReactiveFlags.IS_READONLY] = isReadonly;
  }

  get value() {
    const self = toRaw(this);
    trackRefValue(self);
    if (self._dirty || !self._cacheable) {
      self._dirty = false;
      self._value = self.effect.run();
    }
    return self._value;
  }

  set value(newValue) {
    this._setter(newValue);
  }
}

export function computed(getterOrOptions, debugOptions, isSSR = false) {
  let getter;
  let setter;

  const onlyGetter = isFunction(getterOrOptions);
  if (onlyGetter) {
    getter = getterOrOptions;
    setter =
      process.env.NODE_ENV !== 'production'
        ? () => {
            console.warn('Write operation failed: computed value is readonly');
          }
        : NOOP;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR);

  if (process.env.NODE_ENV !== 'production' && debugOptions && !isSSR) {
    cRef.effect.onTrack = debugOptions.onTrack;
    cRef.effect.onTrigger = debugOptions.onTrigger;
  }

  return cRef;
}

export function computed(getter, debugOptions) {
  return computed(getter, debugOptions);
}