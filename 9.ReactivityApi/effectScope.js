
let activeEffectScope;

class EffectScope {
  constructor(detached = false) {
    this._active = true;
    this.effects = [];
    this.cleanups = [];

    this.parent = activeEffectScope;
    if (!detached && activeEffectScope) {
      this.index = (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this) - 1;
    }
  }

  get active() {
    return this._active;
  }

  run(fn) {
    if (this._active) {
      const currentEffectScope = activeEffectScope;
      try {
        activeEffectScope = this;
        return fn();
      } finally {
        activeEffectScope = currentEffectScope;
      }
    } else if (__DEV__) {
      warn(`cannot run an inactive effect scope.`);
    }
  }

  on() {
    activeEffectScope = this;
  }

  off() {
    activeEffectScope = this.parent;
  }

  stop(fromParent) {
    if (this._active) {
      let i, l;
      for (i = 0, l = this.effects.length; i < l; i++) {
        this.effects[i].stop();
      }
      for (i = 0, l = this.cleanups.length; i < l; i++) {
        this.cleanups[i]();
      }
      if (this.scopes) {
        for (i = 0, l = this.scopes.length; i < l; i++) {
          this.scopes[i].stop(true);
        }
      }
      if (!this.detached && this.parent && !fromParent) {
        const last = this.parent.scopes.pop();
        if (last && last !== this) {
          this.parent.scopes[this.index] = last;
          last.index = this.index;
        }
      }
      this.parent = undefined;
      this._active = false;
    }
  }
}

export function effectScope(detached) {
  return new EffectScope(detached);
}

export function recordEffectScope(effect, scope = activeEffectScope) {
  if (scope && scope.active) {
    scope.effects.push(effect);
  }
}

export function getCurrentScope() {
  return activeEffectScope;
}

export function onScopeDispose(fn) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn);
  } else if (__DEV__) {
    warn(`onScopeDispose() is called when there is no active effect scope to be associated with.`);
  }
}