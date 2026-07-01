const __cjs_module$k = { exports: {} };
(function(module, exports$1, require, process) {
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports$1) {

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; };
  var undefined$1; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function define(obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    return obj[key];
  }
  try {
    // IE 8 has a broken Object.defineProperty that only works on DOM objects.
    define({}, "");
  } catch (err) {
    define = function(obj, key, value) {
      return obj[key] = value;
    };
  }

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) });

    return generator;
  }
  exports$1.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  define(IteratorPrototype, iteratorSymbol, function () {
    return this;
  });

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: true });
  defineProperty(
    GeneratorFunctionPrototype,
    "constructor",
    { value: GeneratorFunction, configurable: true }
  );
  GeneratorFunction.displayName = define(
    GeneratorFunctionPrototype,
    toStringTagSymbol,
    "GeneratorFunction"
  );

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      define(prototype, method, function(arg) {
        return this._invoke(method, arg);
      });
    });
  }

  exports$1.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports$1.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      define(genFun, toStringTagSymbol, "GeneratorFunction");
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports$1.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return PromiseImpl.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return PromiseImpl.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    defineProperty(this, "_invoke", { value: enqueue });
  }

  defineIteratorMethods(AsyncIterator.prototype);
  define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    return this;
  });
  exports$1.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports$1.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    if (PromiseImpl === void 0) PromiseImpl = Promise;

    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList),
      PromiseImpl
    );

    return exports$1.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var methodName = context.method;
    var method = delegate.iterator[methodName];
    if (method === undefined$1) {
      // A .throw or .return when the delegate iterator has no .throw
      // method, or a missing .next mehtod, always terminate the
      // yield* loop.
      context.delegate = null;

      // Note: ["return"] must be used for ES3 parsing compatibility.
      if (methodName === "throw" && delegate.iterator["return"]) {
        // If the delegate iterator has a return method, give it a
        // chance to clean up.
        context.method = "return";
        context.arg = undefined$1;
        maybeInvokeDelegate(delegate, context);

        if (context.method === "throw") {
          // If maybeInvokeDelegate(context) changed context.method from
          // "return" to "throw", let that override the TypeError below.
          return ContinueSentinel;
        }
      }
      if (methodName !== "return") {
        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a '" + methodName + "' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined$1;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  define(Gp, toStringTagSymbol, "Generator");

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  define(Gp, iteratorSymbol, function() {
    return this;
  });

  define(Gp, "toString", function() {
    return "[object Generator]";
  });

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports$1.keys = function(val) {
    var object = Object(val);
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined$1;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports$1.values = values;

  function doneResult() {
    return { value: undefined$1, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined$1;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined$1;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined$1;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined$1;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined$1;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports$1;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
  typeof module === "object" ? module.exports : {}
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, in modern engines
  // we can explicitly access globalThis. In older engines we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  if (typeof globalThis === "object") {
    globalThis.regeneratorRuntime = runtime;
  } else {
    Function("r", "regeneratorRuntime = r")(runtime);
  }
}

})(__cjs_module$k);
const __cjs_default$j = __cjs_module$k.exports && Object.prototype.hasOwnProperty.call(__cjs_module$k.exports, "default") ? __cjs_module$k.exports.default : __cjs_module$k.exports;
const wrap = __cjs_module$k.exports.wrap;
const isGeneratorFunction = __cjs_module$k.exports.isGeneratorFunction;
const mark = __cjs_module$k.exports.mark;
const awrap = __cjs_module$k.exports.awrap;
const AsyncIterator = __cjs_module$k.exports.AsyncIterator;
const async = __cjs_module$k.exports.async;
const keys = __cjs_module$k.exports.keys;
const values = __cjs_module$k.exports.values;

var __cjs_mod_0$4 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  AsyncIterator: AsyncIterator,
  async: async,
  awrap: awrap,
  default: __cjs_default$j,
  isGeneratorFunction: isGeneratorFunction,
  keys: keys,
  mark: mark,
  values: values,
  wrap: wrap
});

const __cjs_module$j = { exports: {} };
(function(module, exports$1, require, process) {

module.exports = (prefix, cnt) => (
  `${prefix}-${cnt}-${Math.random().toString(16).slice(3, 8)}`
);

})(__cjs_module$j);
const __cjs_default$i = __cjs_module$j.exports && Object.prototype.hasOwnProperty.call(__cjs_module$j.exports, "default") ? __cjs_module$j.exports.default : __cjs_module$j.exports;

var __cjs_mod_3$2 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$i
});

const __cjs_module$i = { exports: {} };
let exports$a = __cjs_module$i.exports;
function require$9(id) {
switch (id) {
case "./utils/getId": return __cjs_default$i ?? __cjs_mod_3$2;
default: return {};
}
}
(function(module, exports$1, require, process) {

const getId = require('./utils/getId');

let jobCounter = 0;

module.exports = ({
  id: _id,
  action,
  payload = {},
}) => {
  let id = _id;
  if (typeof id === 'undefined') {
    id = getId('Job', jobCounter);
    jobCounter += 1;
  }

  return {
    id,
    action,
    payload,
  };
};

})(__cjs_module$i, exports$a, require$9);
const __cjs_default$h = __cjs_module$i.exports && Object.prototype.hasOwnProperty.call(__cjs_module$i.exports, "default") ? __cjs_module$i.exports.default : __cjs_module$i.exports;

var __cjs_mod_1$3 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$h
});

const __cjs_module$h = { exports: {} };
let exports$9 = __cjs_module$h.exports;
(function(module, exports$1, require, process) {

let logging = false;

exports$1.logging = logging;

exports$1.setLogging = (_logging) => {
  logging = _logging;
};

exports$1.log = (...args) => (logging ? console.log.apply(this, args) : null);

})(__cjs_module$h, exports$9);
const __cjs_default$g = __cjs_module$h.exports && Object.prototype.hasOwnProperty.call(__cjs_module$h.exports, "default") ? __cjs_module$h.exports.default : __cjs_module$h.exports;
const logging = __cjs_module$h.exports.logging;
const setLogging = __cjs_module$h.exports.setLogging;
const log = __cjs_module$h.exports.log;

var __cjs_mod_7 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$g,
  log: log,
  logging: logging,
  setLogging: setLogging
});

const __cjs_module$g = { exports: {} };
let exports$8 = __cjs_module$g.exports;
function require$8(id) {
switch (id) {
case "./createJob": return __cjs_default$h ?? __cjs_mod_1$3;
case "./utils/log": return __cjs_default$g ?? __cjs_mod_7;
case "./utils/getId": return __cjs_default$i ?? __cjs_mod_3$2;
default: return {};
}
}
(function(module, exports$1, require, process) {

const createJob = require('./createJob');
const { log } = require('./utils/log');
const getId = require('./utils/getId');

let schedulerCounter = 0;

module.exports = () => {
  const id = getId('Scheduler', schedulerCounter);
  const workers = {};
  const runningWorkers = {};
  let jobQueue = [];

  schedulerCounter += 1;

  const getQueueLen = () => jobQueue.length;
  const getNumWorkers = () => Object.keys(workers).length;

  const dequeue = () => {
    if (jobQueue.length !== 0) {
      const wIds = Object.keys(workers);
      for (let i = 0; i < wIds.length; i += 1) {
        if (typeof runningWorkers[wIds[i]] === 'undefined') {
          jobQueue[0](workers[wIds[i]]);
          break;
        }
      }
    }
  };

  const queue = (action, payload) => (
    new Promise((resolve, reject) => {
      const job = createJob({ action, payload });
      jobQueue.push(async (w) => {
        jobQueue.shift();
        runningWorkers[w.id] = job;
        try {
          resolve(await w[action].apply(this, [...payload, job.id]));
        } catch (err) {
          reject(err);
        } finally {
          delete runningWorkers[w.id];
          dequeue();
        }
      });
      log(`[${id}]: Add ${job.id} to JobQueue`);
      log(`[${id}]: JobQueue length=${jobQueue.length}`);
      dequeue();
    })
  );

  const addWorker = (w) => {
    workers[w.id] = w;
    log(`[${id}]: Add ${w.id}`);
    log(`[${id}]: Number of workers=${getNumWorkers()}`);
    dequeue();
    return w.id;
  };

  const addJob = async (action, ...payload) => {
    if (getNumWorkers() === 0) {
      throw Error(`[${id}]: You need to have at least one worker before adding jobs`);
    }
    return queue(action, payload);
  };

  const terminate = async () => {
    Object.keys(workers).forEach(async (wid) => {
      await workers[wid].terminate();
    });
    jobQueue = [];
  };

  return {
    addWorker,
    addJob,
    terminate,
    getQueueLen,
    getNumWorkers,
  };
};

})(__cjs_module$g, exports$8, require$8);
const __cjs_default$f = __cjs_module$g.exports && Object.prototype.hasOwnProperty.call(__cjs_module$g.exports, "default") ? __cjs_module$g.exports.default : __cjs_module$g.exports;

var __cjs_mod_1$2 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$f
});

const __cjs_module$f = { exports: {} };
let exports$7 = __cjs_module$f.exports;
const process = { };
function require$7(id) {
switch (id) {

default: return {};
}
}
(function(module, exports$1, require, process) {

module.exports = (key) => {
  const env = {};

  if (typeof WorkerGlobalScope !== 'undefined') {
    env.type = 'webworker';
  } else if (typeof document === 'object') {
    env.type = 'browser';
  } else if (typeof process === 'object' && typeof require === 'function') {
    env.type = 'node';
  }

  if (typeof key === 'undefined') {
    return env;
  }

  return env[key];
};

})(__cjs_module$f, exports$7, require$7, process);
const __cjs_default$e = __cjs_module$f.exports && Object.prototype.hasOwnProperty.call(__cjs_module$f.exports, "default") ? __cjs_module$f.exports.default : __cjs_module$f.exports;

var __cjs_mod_0$3 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$e
});

const __cjs_module$e = { exports: {} };
let exports$6 = __cjs_module$e.exports;
function require$6(id) {
switch (id) {
case "./getEnvironment": return __cjs_default$e ?? __cjs_mod_0$3;
default: return {};
}
}
(function(module, exports$1, require, process) {

const isBrowser = require('./getEnvironment')('type') === 'browser';

const resolveURL = isBrowser ? s => (new URL(s, window.location.href)).href : s => s; // eslint-disable-line

module.exports = (options) => {
  const opts = { ...options };
  ['corePath', 'workerPath', 'langPath'].forEach((key) => {
    if (options[key]) {
      opts[key] = resolveURL(opts[key]);
    }
  });
  return opts;
};

})(__cjs_module$e, exports$6, require$6);
const __cjs_default$d = __cjs_module$e.exports && Object.prototype.hasOwnProperty.call(__cjs_module$e.exports, "default") ? __cjs_module$e.exports.default : __cjs_module$e.exports;

var __cjs_mod_0$2 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$d
});

const __cjs_module$d = { exports: {} };
(function(module, exports$1, require, process) {

/*
 * OEM = OCR Engine Mode, and there are 4 possible modes.
 *
 * By default tesseract.js uses LSTM_ONLY mode.
 *
 */
module.exports = {
  TESSERACT_ONLY: 0,
  LSTM_ONLY: 1,
  TESSERACT_LSTM_COMBINED: 2,
  DEFAULT: 3,
};

})(__cjs_module$d);
const __cjs_default$c = __cjs_module$d.exports && Object.prototype.hasOwnProperty.call(__cjs_module$d.exports, "default") ? __cjs_module$d.exports.default : __cjs_module$d.exports;
const TESSERACT_ONLY = __cjs_module$d.exports.TESSERACT_ONLY;
const LSTM_ONLY = __cjs_module$d.exports.LSTM_ONLY;
const TESSERACT_LSTM_COMBINED = __cjs_module$d.exports.TESSERACT_LSTM_COMBINED;
const DEFAULT = __cjs_module$d.exports.DEFAULT;

var __cjs_mod_5$2 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  DEFAULT: DEFAULT,
  LSTM_ONLY: LSTM_ONLY,
  TESSERACT_LSTM_COMBINED: TESSERACT_LSTM_COMBINED,
  TESSERACT_ONLY: TESSERACT_ONLY,
  default: __cjs_default$c
});

var _package = {
  "name": "tesseract.js",
  "version": "7.0.0",
  "description": "Pure Javascript Multilingual OCR",
  "main": "src/index.js",
  "type": "commonjs",
  "types": "src/index.d.ts",
  "unpkg": "dist/tesseract.min.js",
  "jsdelivr": "dist/tesseract.min.js",
  "scripts": {
    "start": "node scripts/server.js",
    "build": "rimraf dist && webpack --config scripts/webpack.config.prod.js && rollup -c scripts/rollup.esm.mjs",
    "profile:tesseract": "webpack-bundle-analyzer dist/tesseract-stats.json",
    "profile:worker": "webpack-bundle-analyzer dist/worker-stats.json",
    "prepublishOnly": "npm run build",
    "wait": "rimraf dist && wait-on http://localhost:3000/dist/tesseract.min.js",
    "test": "npm-run-all -p -r start test:all",
    "test:all": "npm-run-all wait test:browser test:node:all",
    "test:browser": "karma start karma.conf.js",
    "test:node": "nyc mocha --exit --bail --require ./scripts/test-helper.mjs",
    "test:node:all": "npm run test:node -- ./tests/*.test.mjs",
    "lint": "eslint src",
    "lint:fix": "eslint --fix src",
    "postinstall": "opencollective-postinstall || true"
  },
  "browser": {
    "./src/worker/node/index.js": "./src/worker/browser/index.js"
  },
  "author": "",
  "contributors": [
    "jeromewu"
  ],
  "license": "Apache-2.0",
  "devDependencies": {
    "@babel/core": "^7.21.4",
    "@babel/eslint-parser": "^7.21.3",
    "@babel/preset-env": "^7.21.4",
    "@rollup/plugin-commonjs": "^24.1.0",
    "acorn": "^8.8.2",
    "babel-loader": "^9.1.2",
    "buffer": "^6.0.3",
    "cors": "^2.8.5",
    "eslint": "^7.32.0",
    "eslint-config-airbnb-base": "^14.2.1",
    "eslint-plugin-import": "^2.27.5",
    "expect.js": "^0.3.1",
    "express": "^4.18.2",
    "mocha": "^10.2.0",
    "npm-run-all": "^4.1.5",
    "karma": "^6.4.2",
    "karma-chrome-launcher": "^3.2.0",
    "karma-firefox-launcher": "^2.1.2",
    "karma-mocha": "^2.0.1",
    "karma-webpack": "^5.0.0",
    "nyc": "^15.1.0",
    "rimraf": "^5.0.0",
    "rollup": "^3.20.7",
    "wait-on": "^7.0.1",
    "webpack": "^5.79.0",
    "webpack-bundle-analyzer": "^4.8.0",
    "webpack-cli": "^5.0.1",
    "webpack-dev-middleware": "^6.0.2",
    "rollup-plugin-sourcemaps": "^0.6.3"
  },
  "dependencies": {
    "bmp-js": "^0.1.0",
    "idb-keyval": "^6.2.0",
    "is-url": "^1.2.4",
    "node-fetch": "^2.6.9",
    "opencollective-postinstall": "^2.0.3",
    "regenerator-runtime": "^0.13.3",
    "tesseract.js-core": "^7.0.0",
    "wasm-feature-detect": "^1.8.0",
    "zlibjs": "^0.3.1"
  },
  "overrides": {
    "@rollup/pluginutils": "^5.0.2"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/naptha/tesseract.js.git"
  },
  "bugs": {
    "url": "https://github.com/naptha/tesseract.js/issues"
  },
  "homepage": "https://github.com/naptha/tesseract.js",
  "collective": {
    "type": "opencollective",
    "url": "https://opencollective.com/tesseractjs"
  }
}
;

var __cjs_mod_0$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _package
});

const __cjs_module$c = { exports: {} };
(function(module, exports$1, require, process) {

module.exports = {
  /*
   * Use BlobURL for worker script by default
   * TODO: remove this option
   *
   */
  workerBlobURL: true,
  logger: () => {},
};

})(__cjs_module$c);
const __cjs_default$b = __cjs_module$c.exports && Object.prototype.hasOwnProperty.call(__cjs_module$c.exports, "default") ? __cjs_module$c.exports.default : __cjs_module$c.exports;
const workerBlobURL = __cjs_module$c.exports.workerBlobURL;
const logger = __cjs_module$c.exports.logger;

var __cjs_mod_1$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$b,
  logger: logger,
  workerBlobURL: workerBlobURL
});

const __cjs_module$b = { exports: {} };
let exports$5 = __cjs_module$b.exports;
function require$5(id) {
switch (id) {
case "../../../package.json": return _package ?? __cjs_mod_0$1;
case "../../constants/defaultOptions": return __cjs_default$b ?? __cjs_mod_1$1;
default: return {};
}
}
(function(module, exports$1, require, process) {

const version = require('../../../package.json').version;
const defaultOptions = require('../../constants/defaultOptions');

/*
 * Default options for browser worker
 */
module.exports = {
  ...defaultOptions,
  workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@v${version}/dist/worker.min.js`,
};

})(__cjs_module$b, exports$5, require$5);
const __cjs_default$a = __cjs_module$b.exports && Object.prototype.hasOwnProperty.call(__cjs_module$b.exports, "default") ? __cjs_module$b.exports.default : __cjs_module$b.exports;
const workerPath = __cjs_module$b.exports.workerPath;

var __cjs_mod_0 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$a,
  workerPath: workerPath
});

const __cjs_module$a = { exports: {} };
(function(module, exports$1, require, process) {

/**
 * spawnWorker
 *
 * @name spawnWorker
 * @function create a new Worker in browser
 * @access public
 */
module.exports = ({ workerPath, workerBlobURL }) => {
  let worker;
  if (Blob && URL && workerBlobURL) {
    const blob = new Blob([`importScripts("${workerPath}");`], {
      type: 'application/javascript',
    });
    worker = new Worker(URL.createObjectURL(blob));
  } else {
    worker = new Worker(workerPath);
  }

  return worker;
};

})(__cjs_module$a);
const __cjs_default$9 = __cjs_module$a.exports && Object.prototype.hasOwnProperty.call(__cjs_module$a.exports, "default") ? __cjs_module$a.exports.default : __cjs_module$a.exports;

var __cjs_mod_1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$9
});

const __cjs_module$9 = { exports: {} };
(function(module, exports$1, require, process) {

/**
 * terminateWorker
 *
 * @name terminateWorker
 * @function terminate worker
 * @access public
 */
module.exports = (worker) => {
  worker.terminate();
};

})(__cjs_module$9);
const __cjs_default$8 = __cjs_module$9.exports && Object.prototype.hasOwnProperty.call(__cjs_module$9.exports, "default") ? __cjs_module$9.exports.default : __cjs_module$9.exports;

var __cjs_mod_2$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$8
});

const __cjs_module$8 = { exports: {} };
(function(module, exports$1, require, process) {

module.exports = (worker, handler) => {
  worker.onmessage = ({ data }) => { // eslint-disable-line
    handler(data);
  };
};

})(__cjs_module$8);
const __cjs_default$7 = __cjs_module$8.exports && Object.prototype.hasOwnProperty.call(__cjs_module$8.exports, "default") ? __cjs_module$8.exports.default : __cjs_module$8.exports;

var __cjs_mod_3$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$7
});

const __cjs_module$7 = { exports: {} };
(function(module, exports$1, require, process) {

/**
 * send
 *
 * @name send
 * @function send packet to worker and create a job
 * @access public
 */
module.exports = async (worker, packet) => {
  worker.postMessage(packet);
};

})(__cjs_module$7);
const __cjs_default$6 = __cjs_module$7.exports && Object.prototype.hasOwnProperty.call(__cjs_module$7.exports, "default") ? __cjs_module$7.exports.default : __cjs_module$7.exports;

var __cjs_mod_4$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$6
});

const __cjs_module$6 = { exports: {} };
(function(module, exports$1, require, process) {

/**
 * readFromBlobOrFile
 *
 * @name readFromBlobOrFile
 * @function
 * @access private
 */
const readFromBlobOrFile = (blob) => (
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      resolve(fileReader.result);
    };
    fileReader.onerror = ({ target: { error: { code } } }) => {
      reject(Error(`File could not be read! Code=${code}`));
    };
    fileReader.readAsArrayBuffer(blob);
  })
);

/**
 * loadImage
 *
 * @name loadImage
 * @function load image from different source
 * @access private
 */
const loadImage = async (image) => {
  let data = image;
  if (typeof image === 'undefined') {
    return 'undefined';
  }

  if (typeof image === 'string') {
    // Base64 Image
    if (/data:image\/([a-zA-Z]*);base64,([^"]*)/.test(image)) {
      data = atob(image.split(',')[1])
        .split('')
        .map((c) => c.charCodeAt(0));
    } else {
      const resp = await fetch(image);
      data = await resp.arrayBuffer();
    }
  } else if (typeof HTMLElement !== 'undefined' && image instanceof HTMLElement) {
    if (image.tagName === 'IMG') {
      data = await loadImage(image.src);
    }
    if (image.tagName === 'VIDEO') {
      data = await loadImage(image.poster);
    }
    if (image.tagName === 'CANVAS') {
      await new Promise((resolve) => {
        image.toBlob(async (blob) => {
          data = await readFromBlobOrFile(blob);
          resolve();
        });
      });
    }
  } else if (typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas) {
    const blob = await image.convertToBlob();
    data = await readFromBlobOrFile(blob);
  } else if (image instanceof File || image instanceof Blob) {
    data = await readFromBlobOrFile(image);
  }

  return new Uint8Array(data);
};

module.exports = loadImage;

})(__cjs_module$6);
const __cjs_default$5 = __cjs_module$6.exports && Object.prototype.hasOwnProperty.call(__cjs_module$6.exports, "default") ? __cjs_module$6.exports.default : __cjs_module$6.exports;

var __cjs_mod_5$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$5
});

const __cjs_module$5 = { exports: {} };
let exports$4 = __cjs_module$5.exports;
function require$4(id) {
switch (id) {
case "./defaultOptions": return __cjs_default$a ?? __cjs_mod_0;
case "./spawnWorker": return __cjs_default$9 ?? __cjs_mod_1;
case "./terminateWorker": return __cjs_default$8 ?? __cjs_mod_2$1;
case "./onMessage": return __cjs_default$7 ?? __cjs_mod_3$1;
case "./send": return __cjs_default$6 ?? __cjs_mod_4$1;
case "./loadImage": return __cjs_default$5 ?? __cjs_mod_5$1;
default: return {};
}
}
(function(module, exports$1, require, process) {

/**
 *
 * Tesseract Worker adapter for browser
 *
 * @fileoverview Tesseract Worker adapter for browser
 * @author Kevin Kwok <antimatter15@gmail.com>
 * @author Guillermo Webster <gui@mit.edu>
 * @author Jerome Wu <jeromewus@gmail.com>
 */
const defaultOptions = require('./defaultOptions');
const spawnWorker = require('./spawnWorker');
const terminateWorker = require('./terminateWorker');
const onMessage = require('./onMessage');
const send = require('./send');
const loadImage = require('./loadImage');

module.exports = {
  defaultOptions,
  spawnWorker,
  terminateWorker,
  onMessage,
  send,
  loadImage,
};

})(__cjs_module$5, exports$4, require$4);
const __cjs_default$4 = __cjs_module$5.exports && Object.prototype.hasOwnProperty.call(__cjs_module$5.exports, "default") ? __cjs_module$5.exports.default : __cjs_module$5.exports;
const defaultOptions = __cjs_module$5.exports.defaultOptions;
const spawnWorker = __cjs_module$5.exports.spawnWorker;
const terminateWorker = __cjs_module$5.exports.terminateWorker;
const onMessage = __cjs_module$5.exports.onMessage;
const send = __cjs_module$5.exports.send;
const loadImage = __cjs_module$5.exports.loadImage;

var __cjs_mod_5 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$4,
  defaultOptions: defaultOptions,
  loadImage: loadImage,
  onMessage: onMessage,
  send: send,
  spawnWorker: spawnWorker,
  terminateWorker: terminateWorker
});

const __cjs_module$4 = { exports: {} };
let exports$3 = __cjs_module$4.exports;
function require$3(id) {
switch (id) {
case "./utils/resolvePaths": return __cjs_default$d ?? __cjs_mod_0$2;
case "./createJob": return __cjs_default$h ?? __cjs_mod_1$3;
case "./utils/log": return __cjs_default$g ?? __cjs_mod_7;
case "./utils/getId": return __cjs_default$i ?? __cjs_mod_3$2;
case "./constants/OEM": return __cjs_default$c ?? __cjs_mod_5$2;
case "./worker/node": return __cjs_default$4 ?? __cjs_mod_5;
default: return {};
}
}
(function(module, exports$1, require, process) {

const resolvePaths = require('./utils/resolvePaths');
const createJob = require('./createJob');
const { log } = require('./utils/log');
const getId = require('./utils/getId');
const OEM = require('./constants/OEM');
const {
  defaultOptions,
  spawnWorker,
  terminateWorker,
  onMessage,
  loadImage,
  send,
} = require('./worker/node');

let workerCounter = 0;

module.exports = async (langs = 'eng', oem = OEM.LSTM_ONLY, _options = {}, config = {}) => {
  const id = getId('Worker', workerCounter);
  const {
    logger,
    errorHandler,
    ...options
  } = resolvePaths({
    ...defaultOptions,
    ..._options,
  });
  const promises = {};

  // Current langs, oem, and config file.
  // Used if the user ever re-initializes the worker using `worker.reinitialize`.
  const currentLangs = typeof langs === 'string' ? langs.split('+') : langs;
  let currentOem = oem;
  let currentConfig = config;
  const lstmOnlyCore = [OEM.DEFAULT, OEM.LSTM_ONLY].includes(oem) && !options.legacyCore;

  let workerResReject;
  let workerResResolve;
  const workerRes = new Promise((resolve, reject) => {
    workerResResolve = resolve;
    workerResReject = reject;
  });
  const workerError = (event) => { workerResReject(event.message); };

  let worker = spawnWorker(options);
  worker.onerror = workerError;

  workerCounter += 1;

  const startJob = ({ id: jobId, action, payload }) => (
    new Promise((resolve, reject) => {
      log(`[${id}]: Start ${jobId}, action=${action}`);
      // Using both `action` and `jobId` in case user provides non-unique `jobId`.
      const promiseId = `${action}-${jobId}`;
      promises[promiseId] = { resolve, reject };
      send(worker, {
        workerId: id,
        jobId,
        action,
        payload,
      });
    })
  );

  const load = () => (
    console.warn('`load` is depreciated and should be removed from code (workers now come pre-loaded)')
  );

  const loadInternal = (jobId) => (
    startJob(createJob({
      id: jobId, action: 'load', payload: { options: { lstmOnly: lstmOnlyCore, corePath: options.corePath, logging: options.logging } },
    }))
  );

  const writeText = (path, text, jobId) => (
    startJob(createJob({
      id: jobId,
      action: 'FS',
      payload: { method: 'writeFile', args: [path, text] },
    }))
  );

  const readText = (path, jobId) => (
    startJob(createJob({
      id: jobId,
      action: 'FS',
      payload: { method: 'readFile', args: [path, { encoding: 'utf8' }] },
    }))
  );

  const removeFile = (path, jobId) => (
    startJob(createJob({
      id: jobId,
      action: 'FS',
      payload: { method: 'unlink', args: [path] },
    }))
  );

  const FS = (method, args, jobId) => (
    startJob(createJob({
      id: jobId,
      action: 'FS',
      payload: { method, args },
    }))
  );

  const loadLanguageInternal = (_langs, jobId) => startJob(createJob({
    id: jobId,
    action: 'loadLanguage',
    payload: {
      langs: _langs,
      options: {
        langPath: options.langPath,
        dataPath: options.dataPath,
        cachePath: options.cachePath,
        cacheMethod: options.cacheMethod,
        gzip: options.gzip,
        lstmOnly: [OEM.DEFAULT, OEM.LSTM_ONLY].includes(currentOem)
          && !options.legacyLang,
      },
    },
  }));

  const initializeInternal = (_langs, _oem, _config, jobId) => (
    startJob(createJob({
      id: jobId,
      action: 'initialize',
      payload: { langs: _langs, oem: _oem, config: _config },
    }))
  );

  const reinitialize = (langs = 'eng', oem, config, jobId) => { // eslint-disable-line

    if (lstmOnlyCore && [OEM.TESSERACT_ONLY, OEM.TESSERACT_LSTM_COMBINED].includes(oem)) throw Error('Legacy model requested but code missing.');

    const _oem = oem || currentOem;
    currentOem = _oem;

    const _config = config || currentConfig;
    currentConfig = _config;

    // Only load langs that are not already loaded.
    // This logic fails if the user downloaded the LSTM-only English data for a language
    // and then uses `worker.reinitialize` to switch to the Legacy engine.
    // However, the correct data will still be downloaded after initialization fails
    // and this can be avoided entirely if the user loads the correct data ahead of time.
    const langsArr = typeof langs === 'string' ? langs.split('+') : langs;
    const _langs = langsArr.filter((x) => !currentLangs.includes(x));
    currentLangs.push(..._langs);

    if (_langs.length > 0) {
      return loadLanguageInternal(_langs, jobId)
        .then(() => initializeInternal(langs, _oem, _config, jobId));
    }

    return initializeInternal(langs, _oem, _config, jobId);
  };

  const setParameters = (params = {}, jobId) => (
    startJob(createJob({
      id: jobId,
      action: 'setParameters',
      payload: { params },
    }))
  );

  const recognize = async (image, opts = {}, output = {
    text: true,
  }, jobId) => (
    startJob(createJob({
      id: jobId,
      action: 'recognize',
      payload: { image: await loadImage(image), options: opts, output },
    }))
  );

  const detect = async (image, jobId) => {
    if (lstmOnlyCore) throw Error('`worker.detect` requires Legacy model, which was not loaded.');

    return startJob(createJob({
      id: jobId,
      action: 'detect',
      payload: { image: await loadImage(image) },
    }));
  };

  const terminate = async () => {
    if (worker !== null) {
      /*
      await startJob(createJob({
        id: jobId,
        action: 'terminate',
      }));
      */
      terminateWorker(worker);
      worker = null;
    }
    return Promise.resolve();
  };

  onMessage(worker, ({
    workerId, jobId, status, action, data,
  }) => {
    const promiseId = `${action}-${jobId}`;
    if (status === 'resolve') {
      log(`[${workerId}]: Complete ${jobId}`);
      promises[promiseId].resolve({ jobId, data });
      delete promises[promiseId];
    } else if (status === 'reject') {
      promises[promiseId].reject(data);
      delete promises[promiseId];
      if (action === 'load') workerResReject(data);
      if (errorHandler) {
        errorHandler(data);
      } else {
        throw Error(data);
      }
    } else if (status === 'progress') {
      logger({ ...data, userJobId: jobId });
    }
  });

  const resolveObj = {
    id,
    worker,
    load,
    writeText,
    readText,
    removeFile,
    FS,
    reinitialize,
    setParameters,
    recognize,
    detect,
    terminate,
  };

  loadInternal()
    .then(() => loadLanguageInternal(langs))
    .then(() => initializeInternal(langs, oem, config))
    .then(() => workerResResolve(resolveObj))
    .catch(() => {});

  return workerRes;
};

})(__cjs_module$4, exports$3, require$3);
const __cjs_default$3 = __cjs_module$4.exports && Object.prototype.hasOwnProperty.call(__cjs_module$4.exports, "default") ? __cjs_module$4.exports.default : __cjs_module$4.exports;

var __cjs_mod_2 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$3
});

const __cjs_module$3 = { exports: {} };
let exports$2 = __cjs_module$3.exports;
function require$2(id) {
switch (id) {
case "./createWorker": return __cjs_default$3 ?? __cjs_mod_2;
default: return {};
}
}
(function(module, exports$1, require, process) {

const createWorker = require('./createWorker');

const recognize = async (image, langs, options) => {
  const worker = await createWorker(langs, 1, options);
  return worker.recognize(image)
    .finally(async () => {
      await worker.terminate();
    });
};

const detect = async (image, options) => {
  const worker = await createWorker('osd', 0, options);
  return worker.detect(image)
    .finally(async () => {
      await worker.terminate();
    });
};

module.exports = {
  recognize,
  detect,
};

})(__cjs_module$3, exports$2, require$2);
const __cjs_default$2 = __cjs_module$3.exports && Object.prototype.hasOwnProperty.call(__cjs_module$3.exports, "default") ? __cjs_module$3.exports.default : __cjs_module$3.exports;
const recognize = __cjs_module$3.exports.recognize;
const detect = __cjs_module$3.exports.detect;

var __cjs_mod_3 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: __cjs_default$2,
  detect: detect,
  recognize: recognize
});

const __cjs_module$2 = { exports: {} };
(function(module, exports$1, require, process) {

/*
 * languages with existing tesseract traineddata
 * https://tesseract-ocr.github.io/tessdoc/Data-Files#data-files-for-version-400-november-29-2016
 */

/**
 * @typedef {object} Languages
 * @property {string} AFR Afrikaans
 * @property {string} AMH Amharic
 * @property {string} ARA Arabic
 * @property {string} ASM Assamese
 * @property {string} AZE Azerbaijani
 * @property {string} AZE_CYRL Azerbaijani - Cyrillic
 * @property {string} BEL Belarusian
 * @property {string} BEN Bengali
 * @property {string} BOD Tibetan
 * @property {string} BOS Bosnian
 * @property {string} BUL Bulgarian
 * @property {string} CAT Catalan; Valencian
 * @property {string} CEB Cebuano
 * @property {string} CES Czech
 * @property {string} CHI_SIM Chinese - Simplified
 * @property {string} CHI_TRA Chinese - Traditional
 * @property {string} CHR Cherokee
 * @property {string} CYM Welsh
 * @property {string} DAN Danish
 * @property {string} DEU German
 * @property {string} DZO Dzongkha
 * @property {string} ELL Greek, Modern (1453-)
 * @property {string} ENG English
 * @property {string} ENM English, Middle (1100-1500)
 * @property {string} EPO Esperanto
 * @property {string} EST Estonian
 * @property {string} EUS Basque
 * @property {string} FAS Persian
 * @property {string} FIN Finnish
 * @property {string} FRA French
 * @property {string} FRK German Fraktur
 * @property {string} FRM French, Middle (ca. 1400-1600)
 * @property {string} GLE Irish
 * @property {string} GLG Galician
 * @property {string} GRC Greek, Ancient (-1453)
 * @property {string} GUJ Gujarati
 * @property {string} HAT Haitian; Haitian Creole
 * @property {string} HEB Hebrew
 * @property {string} HIN Hindi
 * @property {string} HRV Croatian
 * @property {string} HUN Hungarian
 * @property {string} IKU Inuktitut
 * @property {string} IND Indonesian
 * @property {string} ISL Icelandic
 * @property {string} ITA Italian
 * @property {string} ITA_OLD Italian - Old
 * @property {string} JAV Javanese
 * @property {string} JPN Japanese
 * @property {string} KAN Kannada
 * @property {string} KAT Georgian
 * @property {string} KAT_OLD Georgian - Old
 * @property {string} KAZ Kazakh
 * @property {string} KHM Central Khmer
 * @property {string} KIR Kirghiz; Kyrgyz
 * @property {string} KOR Korean
 * @property {string} KUR Kurdish
 * @property {string} LAO Lao
 * @property {string} LAT Latin
 * @property {string} LAV Latvian
 * @property {string} LIT Lithuanian
 * @property {string} MAL Malayalam
 * @property {string} MAR Marathi
 * @property {string} MKD Macedonian
 * @property {string} MLT Maltese
 * @property {string} MSA Malay
 * @property {string} MYA Burmese
 * @property {string} NEP Nepali
 * @property {string} NLD Dutch; Flemish
 * @property {string} NOR Norwegian
 * @property {string} ORI Oriya
 * @property {string} PAN Panjabi; Punjabi
 * @property {string} POL Polish
 * @property {string} POR Portuguese
 * @property {string} PUS Pushto; Pashto
 * @property {string} RON Romanian; Moldavian; Moldovan
 * @property {string} RUS Russian
 * @property {string} SAN Sanskrit
 * @property {string} SIN Sinhala; Sinhalese
 * @property {string} SLK Slovak
 * @property {string} SLV Slovenian
 * @property {string} SPA Spanish; Castilian
 * @property {string} SPA_OLD Spanish; Castilian - Old
 * @property {string} SQI Albanian
 * @property {string} SRP Serbian
 * @property {string} SRP_LATN Serbian - Latin
 * @property {string} SWA Swahili
 * @property {string} SWE Swedish
 * @property {string} SYR Syriac
 * @property {string} TAM Tamil
 * @property {string} TEL Telugu
 * @property {string} TGK Tajik
 * @property {string} TGL Tagalog
 * @property {string} THA Thai
 * @property {string} TIR Tigrinya
 * @property {string} TUR Turkish
 * @property {string} UIG Uighur; Uyghur
 * @property {string} UKR Ukrainian
 * @property {string} URD Urdu
 * @property {string} UZB Uzbek
 * @property {string} UZB_CYRL Uzbek - Cyrillic
 * @property {string} VIE Vietnamese
 * @property {string} YID Yiddish
 */

/**
  * @type {Languages}
  */
module.exports = {
  AFR: 'afr',
  AMH: 'amh',
  ARA: 'ara',
  ASM: 'asm',
  AZE: 'aze',
  AZE_CYRL: 'aze_cyrl',
  BEL: 'bel',
  BEN: 'ben',
  BOD: 'bod',
  BOS: 'bos',
  BUL: 'bul',
  CAT: 'cat',
  CEB: 'ceb',
  CES: 'ces',
  CHI_SIM: 'chi_sim',
  CHI_TRA: 'chi_tra',
  CHR: 'chr',
  CYM: 'cym',
  DAN: 'dan',
  DEU: 'deu',
  DZO: 'dzo',
  ELL: 'ell',
  ENG: 'eng',
  ENM: 'enm',
  EPO: 'epo',
  EST: 'est',
  EUS: 'eus',
  FAS: 'fas',
  FIN: 'fin',
  FRA: 'fra',
  FRK: 'frk',
  FRM: 'frm',
  GLE: 'gle',
  GLG: 'glg',
  GRC: 'grc',
  GUJ: 'guj',
  HAT: 'hat',
  HEB: 'heb',
  HIN: 'hin',
  HRV: 'hrv',
  HUN: 'hun',
  IKU: 'iku',
  IND: 'ind',
  ISL: 'isl',
  ITA: 'ita',
  ITA_OLD: 'ita_old',
  JAV: 'jav',
  JPN: 'jpn',
  KAN: 'kan',
  KAT: 'kat',
  KAT_OLD: 'kat_old',
  KAZ: 'kaz',
  KHM: 'khm',
  KIR: 'kir',
  KOR: 'kor',
  KUR: 'kur',
  LAO: 'lao',
  LAT: 'lat',
  LAV: 'lav',
  LIT: 'lit',
  MAL: 'mal',
  MAR: 'mar',
  MKD: 'mkd',
  MLT: 'mlt',
  MSA: 'msa',
  MYA: 'mya',
  NEP: 'nep',
  NLD: 'nld',
  NOR: 'nor',
  ORI: 'ori',
  PAN: 'pan',
  POL: 'pol',
  POR: 'por',
  PUS: 'pus',
  RON: 'ron',
  RUS: 'rus',
  SAN: 'san',
  SIN: 'sin',
  SLK: 'slk',
  SLV: 'slv',
  SPA: 'spa',
  SPA_OLD: 'spa_old',
  SQI: 'sqi',
  SRP: 'srp',
  SRP_LATN: 'srp_latn',
  SWA: 'swa',
  SWE: 'swe',
  SYR: 'syr',
  TAM: 'tam',
  TEL: 'tel',
  TGK: 'tgk',
  TGL: 'tgl',
  THA: 'tha',
  TIR: 'tir',
  TUR: 'tur',
  UIG: 'uig',
  UKR: 'ukr',
  URD: 'urd',
  UZB: 'uzb',
  UZB_CYRL: 'uzb_cyrl',
  VIE: 'vie',
  YID: 'yid',
};

})(__cjs_module$2);
const __cjs_default$1 = __cjs_module$2.exports && Object.prototype.hasOwnProperty.call(__cjs_module$2.exports, "default") ? __cjs_module$2.exports.default : __cjs_module$2.exports;
const AFR = __cjs_module$2.exports.AFR;
const AMH = __cjs_module$2.exports.AMH;
const ARA = __cjs_module$2.exports.ARA;
const ASM = __cjs_module$2.exports.ASM;
const AZE = __cjs_module$2.exports.AZE;
const AZE_CYRL = __cjs_module$2.exports.AZE_CYRL;
const BEL = __cjs_module$2.exports.BEL;
const BEN = __cjs_module$2.exports.BEN;
const BOD = __cjs_module$2.exports.BOD;
const BOS = __cjs_module$2.exports.BOS;
const BUL = __cjs_module$2.exports.BUL;
const CAT = __cjs_module$2.exports.CAT;
const CEB = __cjs_module$2.exports.CEB;
const CES = __cjs_module$2.exports.CES;
const CHI_SIM = __cjs_module$2.exports.CHI_SIM;
const CHI_TRA = __cjs_module$2.exports.CHI_TRA;
const CHR = __cjs_module$2.exports.CHR;
const CYM = __cjs_module$2.exports.CYM;
const DAN = __cjs_module$2.exports.DAN;
const DEU = __cjs_module$2.exports.DEU;
const DZO = __cjs_module$2.exports.DZO;
const ELL = __cjs_module$2.exports.ELL;
const ENG = __cjs_module$2.exports.ENG;
const ENM = __cjs_module$2.exports.ENM;
const EPO = __cjs_module$2.exports.EPO;
const EST = __cjs_module$2.exports.EST;
const EUS = __cjs_module$2.exports.EUS;
const FAS = __cjs_module$2.exports.FAS;
const FIN = __cjs_module$2.exports.FIN;
const FRA = __cjs_module$2.exports.FRA;
const FRK = __cjs_module$2.exports.FRK;
const FRM = __cjs_module$2.exports.FRM;
const GLE = __cjs_module$2.exports.GLE;
const GLG = __cjs_module$2.exports.GLG;
const GRC = __cjs_module$2.exports.GRC;
const GUJ = __cjs_module$2.exports.GUJ;
const HAT = __cjs_module$2.exports.HAT;
const HEB = __cjs_module$2.exports.HEB;
const HIN = __cjs_module$2.exports.HIN;
const HRV = __cjs_module$2.exports.HRV;
const HUN = __cjs_module$2.exports.HUN;
const IKU = __cjs_module$2.exports.IKU;
const IND = __cjs_module$2.exports.IND;
const ISL = __cjs_module$2.exports.ISL;
const ITA = __cjs_module$2.exports.ITA;
const ITA_OLD = __cjs_module$2.exports.ITA_OLD;
const JAV = __cjs_module$2.exports.JAV;
const JPN = __cjs_module$2.exports.JPN;
const KAN = __cjs_module$2.exports.KAN;
const KAT = __cjs_module$2.exports.KAT;
const KAT_OLD = __cjs_module$2.exports.KAT_OLD;
const KAZ = __cjs_module$2.exports.KAZ;
const KHM = __cjs_module$2.exports.KHM;
const KIR = __cjs_module$2.exports.KIR;
const KOR = __cjs_module$2.exports.KOR;
const KUR = __cjs_module$2.exports.KUR;
const LAO = __cjs_module$2.exports.LAO;
const LAT = __cjs_module$2.exports.LAT;
const LAV = __cjs_module$2.exports.LAV;
const LIT = __cjs_module$2.exports.LIT;
const MAL = __cjs_module$2.exports.MAL;
const MAR = __cjs_module$2.exports.MAR;
const MKD = __cjs_module$2.exports.MKD;
const MLT = __cjs_module$2.exports.MLT;
const MSA = __cjs_module$2.exports.MSA;
const MYA = __cjs_module$2.exports.MYA;
const NEP = __cjs_module$2.exports.NEP;
const NLD = __cjs_module$2.exports.NLD;
const NOR = __cjs_module$2.exports.NOR;
const ORI = __cjs_module$2.exports.ORI;
const PAN = __cjs_module$2.exports.PAN;
const POL = __cjs_module$2.exports.POL;
const POR = __cjs_module$2.exports.POR;
const PUS = __cjs_module$2.exports.PUS;
const RON = __cjs_module$2.exports.RON;
const RUS = __cjs_module$2.exports.RUS;
const SAN = __cjs_module$2.exports.SAN;
const SIN = __cjs_module$2.exports.SIN;
const SLK = __cjs_module$2.exports.SLK;
const SLV = __cjs_module$2.exports.SLV;
const SPA = __cjs_module$2.exports.SPA;
const SPA_OLD = __cjs_module$2.exports.SPA_OLD;
const SQI = __cjs_module$2.exports.SQI;
const SRP = __cjs_module$2.exports.SRP;
const SRP_LATN = __cjs_module$2.exports.SRP_LATN;
const SWA = __cjs_module$2.exports.SWA;
const SWE = __cjs_module$2.exports.SWE;
const SYR = __cjs_module$2.exports.SYR;
const TAM = __cjs_module$2.exports.TAM;
const TEL = __cjs_module$2.exports.TEL;
const TGK = __cjs_module$2.exports.TGK;
const TGL = __cjs_module$2.exports.TGL;
const THA = __cjs_module$2.exports.THA;
const TIR = __cjs_module$2.exports.TIR;
const TUR = __cjs_module$2.exports.TUR;
const UIG = __cjs_module$2.exports.UIG;
const UKR = __cjs_module$2.exports.UKR;
const URD = __cjs_module$2.exports.URD;
const UZB = __cjs_module$2.exports.UZB;
const UZB_CYRL = __cjs_module$2.exports.UZB_CYRL;
const VIE = __cjs_module$2.exports.VIE;
const YID = __cjs_module$2.exports.YID;

var __cjs_mod_4 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  AFR: AFR,
  AMH: AMH,
  ARA: ARA,
  ASM: ASM,
  AZE: AZE,
  AZE_CYRL: AZE_CYRL,
  BEL: BEL,
  BEN: BEN,
  BOD: BOD,
  BOS: BOS,
  BUL: BUL,
  CAT: CAT,
  CEB: CEB,
  CES: CES,
  CHI_SIM: CHI_SIM,
  CHI_TRA: CHI_TRA,
  CHR: CHR,
  CYM: CYM,
  DAN: DAN,
  DEU: DEU,
  DZO: DZO,
  ELL: ELL,
  ENG: ENG,
  ENM: ENM,
  EPO: EPO,
  EST: EST,
  EUS: EUS,
  FAS: FAS,
  FIN: FIN,
  FRA: FRA,
  FRK: FRK,
  FRM: FRM,
  GLE: GLE,
  GLG: GLG,
  GRC: GRC,
  GUJ: GUJ,
  HAT: HAT,
  HEB: HEB,
  HIN: HIN,
  HRV: HRV,
  HUN: HUN,
  IKU: IKU,
  IND: IND,
  ISL: ISL,
  ITA: ITA,
  ITA_OLD: ITA_OLD,
  JAV: JAV,
  JPN: JPN,
  KAN: KAN,
  KAT: KAT,
  KAT_OLD: KAT_OLD,
  KAZ: KAZ,
  KHM: KHM,
  KIR: KIR,
  KOR: KOR,
  KUR: KUR,
  LAO: LAO,
  LAT: LAT,
  LAV: LAV,
  LIT: LIT,
  MAL: MAL,
  MAR: MAR,
  MKD: MKD,
  MLT: MLT,
  MSA: MSA,
  MYA: MYA,
  NEP: NEP,
  NLD: NLD,
  NOR: NOR,
  ORI: ORI,
  PAN: PAN,
  POL: POL,
  POR: POR,
  PUS: PUS,
  RON: RON,
  RUS: RUS,
  SAN: SAN,
  SIN: SIN,
  SLK: SLK,
  SLV: SLV,
  SPA: SPA,
  SPA_OLD: SPA_OLD,
  SQI: SQI,
  SRP: SRP,
  SRP_LATN: SRP_LATN,
  SWA: SWA,
  SWE: SWE,
  SYR: SYR,
  TAM: TAM,
  TEL: TEL,
  TGK: TGK,
  TGL: TGL,
  THA: THA,
  TIR: TIR,
  TUR: TUR,
  UIG: UIG,
  UKR: UKR,
  URD: URD,
  UZB: UZB,
  UZB_CYRL: UZB_CYRL,
  VIE: VIE,
  YID: YID,
  default: __cjs_default$1
});

const __cjs_module$1 = { exports: {} };
(function(module, exports$1, require, process) {

/*
 * PSM = Page Segmentation Mode
 */
module.exports = {
  OSD_ONLY: '0',
  AUTO_OSD: '1',
  AUTO_ONLY: '2',
  AUTO: '3',
  SINGLE_COLUMN: '4',
  SINGLE_BLOCK_VERT_TEXT: '5',
  SINGLE_BLOCK: '6',
  SINGLE_LINE: '7',
  SINGLE_WORD: '8',
  CIRCLE_WORD: '9',
  SINGLE_CHAR: '10',
  SPARSE_TEXT: '11',
  SPARSE_TEXT_OSD: '12',
  RAW_LINE: '13',
};

})(__cjs_module$1);
const __cjs_default = __cjs_module$1.exports && Object.prototype.hasOwnProperty.call(__cjs_module$1.exports, "default") ? __cjs_module$1.exports.default : __cjs_module$1.exports;
const OSD_ONLY = __cjs_module$1.exports.OSD_ONLY;
const AUTO_OSD = __cjs_module$1.exports.AUTO_OSD;
const AUTO_ONLY = __cjs_module$1.exports.AUTO_ONLY;
const AUTO = __cjs_module$1.exports.AUTO;
const SINGLE_COLUMN = __cjs_module$1.exports.SINGLE_COLUMN;
const SINGLE_BLOCK_VERT_TEXT = __cjs_module$1.exports.SINGLE_BLOCK_VERT_TEXT;
const SINGLE_BLOCK = __cjs_module$1.exports.SINGLE_BLOCK;
const SINGLE_LINE = __cjs_module$1.exports.SINGLE_LINE;
const SINGLE_WORD = __cjs_module$1.exports.SINGLE_WORD;
const CIRCLE_WORD = __cjs_module$1.exports.CIRCLE_WORD;
const SINGLE_CHAR = __cjs_module$1.exports.SINGLE_CHAR;
const SPARSE_TEXT = __cjs_module$1.exports.SPARSE_TEXT;
const SPARSE_TEXT_OSD = __cjs_module$1.exports.SPARSE_TEXT_OSD;
const RAW_LINE = __cjs_module$1.exports.RAW_LINE;

var __cjs_mod_6 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  AUTO: AUTO,
  AUTO_ONLY: AUTO_ONLY,
  AUTO_OSD: AUTO_OSD,
  CIRCLE_WORD: CIRCLE_WORD,
  OSD_ONLY: OSD_ONLY,
  RAW_LINE: RAW_LINE,
  SINGLE_BLOCK: SINGLE_BLOCK,
  SINGLE_BLOCK_VERT_TEXT: SINGLE_BLOCK_VERT_TEXT,
  SINGLE_CHAR: SINGLE_CHAR,
  SINGLE_COLUMN: SINGLE_COLUMN,
  SINGLE_LINE: SINGLE_LINE,
  SINGLE_WORD: SINGLE_WORD,
  SPARSE_TEXT: SPARSE_TEXT,
  SPARSE_TEXT_OSD: SPARSE_TEXT_OSD,
  default: __cjs_default
});

const __cjs_module = { exports: {} };
let exports$1 = __cjs_module.exports;
function require$1(id) {
switch (id) {
case "regenerator-runtime/runtime": return __cjs_default$j ?? __cjs_mod_0$4;
case "./createScheduler": return __cjs_default$f ?? __cjs_mod_1$2;
case "./createWorker": return __cjs_default$3 ?? __cjs_mod_2;
case "./Tesseract": return __cjs_default$2 ?? __cjs_mod_3;
case "./constants/languages": return __cjs_default$1 ?? __cjs_mod_4;
case "./constants/OEM": return __cjs_default$c ?? __cjs_mod_5$2;
case "./constants/PSM": return __cjs_default ?? __cjs_mod_6;
case "./utils/log": return __cjs_default$g ?? __cjs_mod_7;
default: return {};
}
}
(function(module, exports$1, require, process) {
const createScheduler = require('./createScheduler');
const createWorker = require('./createWorker');
const Tesseract = require('./Tesseract');
const languages = require('./constants/languages');
const OEM = require('./constants/OEM');
const PSM = require('./constants/PSM');
const { setLogging } = require('./utils/log');

module.exports = {
  languages,
  OEM,
  PSM,
  createScheduler,
  createWorker,
  setLogging,
  ...Tesseract,
};

})(__cjs_module, exports$1, require$1);
__cjs_module.exports && Object.prototype.hasOwnProperty.call(__cjs_module.exports, "default") ? __cjs_module.exports.default : __cjs_module.exports;
__cjs_module.exports.languages;
__cjs_module.exports.OEM;
__cjs_module.exports.PSM;
__cjs_module.exports.createScheduler;
const createWorker = __cjs_module.exports.createWorker;
__cjs_module.exports.setLogging;

// ─────────────────────────────────────────────────────────────
// 1) OCR runner — uses tesseract.js with progress callback
// ─────────────────────────────────────────────────────────────
let cachedWorker = null;
async function getWorker(onProgress) {
    if (cachedWorker)
        return cachedWorker;
    onProgress({ stage: 'preparing', pct: 5, message: 'Preparing image' });
    const worker = await createWorker('eng+kor', 1, {
        logger: (m) => {
            // tesseract emits status messages like "loading tesseract core",
            // "loading language traineddata", "initializing api", "recognizing text"
            if (m.status === 'recognizing text') {
                onProgress({
                    stage: 'reading',
                    pct: 30 + Math.round(m.progress * 60), // map to 30–90
                    message: 'Reading screenshot',
                });
            }
            else if (m.status.startsWith('loading') || m.status.startsWith('initializing')) {
                onProgress({
                    stage: 'preparing',
                    pct: 5 + Math.round(m.progress * 20), // map to 5–25
                    message: 'Preparing image',
                });
            }
        },
    });
    cachedWorker = worker;
    return worker;
}
async function preprocessImage(file, cropRegion, mode = 'contrast') {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx)
                    throw new Error('Canvas is not available for OCR preprocessing.');
                let sourceX = 0;
                let sourceY = 0;
                let sourceW = img.width;
                let sourceH = img.height;
                if (cropRegion) {
                    sourceX = (cropRegion.x / 100) * img.width;
                    sourceY = (cropRegion.y / 100) * img.height;
                    sourceW = (cropRegion.w / 100) * img.width;
                    sourceH = (cropRegion.h / 100) * img.height;
                }
                const scale = Math.max(1, Math.min(3, 1600 / Math.max(sourceW, sourceH)));
                canvas.width = Math.max(1, Math.round(sourceW * scale));
                canvas.height = Math.max(1, Math.round(sourceH * scale));
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let total = 0;
                for (let i = 0; i < data.length; i += 4) {
                    total += (data[i] + data[i + 1] + data[i + 2]) / 3;
                }
                const average = total / (data.length / 4 || 1);
                const darkScreenshot = average < 128;
                const threshold = Math.max(95, Math.min(180, average + (darkScreenshot ? 18 : -18)));
                for (let i = 0; i < data.length; i += 4) {
                    const gray = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
                    let value = darkScreenshot ? 255 - gray : gray;
                    if (mode === 'threshold') {
                        value = value > threshold ? 255 : 0;
                    }
                    else {
                        value = Math.max(0, Math.min(255, ((value - 128) * 1.35) + 128));
                    }
                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            }
            catch (err) {
                reject(err);
            }
            finally {
                URL.revokeObjectURL(objectUrl);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image for OCR.'));
        };
        img.src = objectUrl;
    });
}
async function runScreenshotOcr(file, onProgress) {
    if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file (PNG or JPG).');
    }
    onProgress({ stage: 'preparing', pct: 0, message: 'Preparing image' });
    const regions = [
        { name: 'full', mode: 'contrast' },
        { name: 'stats', region: { x: 0, y: 18, w: 100, h: 76 }, mode: 'contrast' },
        { name: 'stats_sharp', region: { x: 0, y: 18, w: 100, h: 76 }, mode: 'threshold' },
        { name: 'header', region: { x: 0, y: 0, w: 100, h: 32 }, mode: 'contrast' },
    ];
    let mergedText = '';
    const failures = [];
    const worker = await getWorker(onProgress);
    try {
        await worker.setParameters({
            preserve_interword_spaces: '1',
            user_defined_dpi: '300',
        });
    }
    catch {
        // Older Tesseract builds may ignore parameters; OCR can still proceed.
    }
    for (let i = 0; i < regions.length; i++) {
        const r = regions[i];
        onProgress({
            stage: 'reading',
            pct: 28 + Math.round((i / regions.length) * 58),
            message: `Reading ${r.name} area`,
        });
        try {
            const processedUrl = await preprocessImage(file, r.region, r.mode);
            const res = await fetch(processedUrl);
            const blob = await res.blob();
            const processedFile = new File([blob], `${r.name}_${file.name}`, { type: 'image/png' });
            const { data } = await worker.recognize(processedFile);
            const text = (data.text || '').trim();
            if (text) {
                mergedText += `\n--- AREA: ${r.name.toUpperCase()} ---\n${text}\n`;
            }
        }
        catch (err) {
            const message = err instanceof Error && err.message ? err.message : 'OCR area failed';
            failures.push(`${r.name}: ${message}`);
        }
    }
    onProgress({ stage: 'extracting', pct: 92, message: 'Extracting running data' });
    if (!mergedText.trim()) {
        throw new Error(failures.length > 0 ? `OCR failed: ${failures.join('; ')}` : 'OCR did not find readable text.');
    }
    return mergedText + (failures.length ? '\n--- OCR WARNINGS ---\n' + failures.join('\n') : '');
}
/**
 * Optional: terminate the worker. Call when leaving the import flow
 * to free memory. Safe to call even if worker was never created.
 */
async function terminateOcrWorker() {
    if (cachedWorker) {
        try {
            await cachedWorker.terminate();
        }
        catch { /* ignore */ }
        cachedWorker = null;
    }
}
// ─────────────────────────────────────────────────────────────
// 2) Source detection
// ─────────────────────────────────────────────────────────────
function detectSource(text) {
    const t = text.toLowerCase();
    // Strava — most distinctive keywords
    if (t.includes('strava') || (t.includes('moving time') && t.includes('elapsed'))) {
        return 'strava';
    }
    // Garmin — Garmin Connect / specific labels
    if (t.includes('garmin') || t.includes('connect') ||
        (t.includes('avg hr') && t.includes('cadence'))) {
        return 'garmin';
    }
    // Samsung Health
    if (t.includes('samsung health') || t.includes('s health') ||
        (t.includes('exercise') && t.includes('heart rate'))) {
        return 'samsung_health';
    }
    // Apple Fitness — broad checks
    if (t.includes('outdoor run') || t.includes('indoor run') ||
        t.includes('apple fitness') || t.includes('workout details')) {
        return 'apple_fitness';
    }
    return 'generic';
}
// ─────────────────────────────────────────────────────────────
// 3) Generic regex helpers
// ─────────────────────────────────────────────────────────────
/** Find first regex match group as a number; returns undefined if not found. */
function matchNum(text, rx, group = 1) {
    const m = rx.exec(text);
    if (!m || !m[group])
        return undefined;
    const v = parseFloat(m[group].replace(',', '.'));
    return isNaN(v) ? undefined : v;
}
/** Convert any time string (hh:mm:ss / mm:ss / m:ss) to seconds. */
function parseTimeToSeconds(s) {
    const cleaned = s.trim().replace(/[^\d:]/g, '');
    const parts = cleaned.split(':').map(p => parseInt(p, 10)).filter(n => !isNaN(n));
    if (parts.length === 3)
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2)
        return parts[0] * 60 + parts[1];
    return undefined;
}
/** Normalise OCR-confused chars (O→0, l→1) inside numeric tokens. */
function fixOcrDigits(s) {
    return s
        .replace(/[Oo](?=\d)/g, '0')
        .replace(/(?<=\d)[Oo]/g, '0')
        .replace(/[lI](?=\d)/g, '1')
        .replace(/(?<=\d)[lI]/g, '1');
}
function normalizeOcrText(text) {
    return fixOcrDigits(text || '')
        .normalize('NFKC')
        .replace(/[’‘′]/g, "'")
        .replace(/[“”″]/g, '"')
        .replace(/[：]/g, ':')
        .replace(/[㎞]/gi, 'km')
        .replace(/[–—]/g, '-')
        .replace(/\bkilometers?\b/gi, 'km')
        .replace(/킬로미터/g, 'km')
        .replace(/\s+/g, ' ')
        .trim();
}
// ─────────────────────────────────────────────────────────────
// 4) Field-level extractors
// ─────────────────────────────────────────────────────────────
function extractDistance(text) {
    const t = normalizeOcrText(text);
    // "5.02 km" / "10.2km" / "5,02 KM"
    const km = /(\d{1,3}(?:[.,]\d{1,3})?)\s*(?:k\s*m|km)\b/i.exec(t);
    if (km) {
        const v = parseFloat(km[1].replace(',', '.'));
        if (!isNaN(v) && v > 0 && v < 500)
            return v;
    }
    // "3.11 mi" / "3.11mi" / "3.11 miles"
    const mi = /(\d{1,3}(?:[.,]\d{1,3})?)\s*mi(?:les?)?\b/i.exec(t);
    if (mi) {
        const v = parseFloat(mi[1].replace(',', '.'));
        if (!isNaN(v) && v > 0 && v < 500)
            return v * 1.60934;
    }
    // "5000 m" — only treat as metres if a clean integer 100-99999
    const m = /(?<![.,\d])(\d{3,5})\s*m\b(?!\w)/i.exec(t);
    if (m) {
        const v = parseInt(m[1], 10);
        if (!isNaN(v) && v >= 100 && v <= 99999)
            return v / 1000;
    }
    return undefined;
}
function extractDuration(text) {
    const t = normalizeOcrText(text);
    const koHms = /(\d{1,2})\s*시간\s*(?:(\d{1,2})\s*분)?\s*(?:(\d{1,2})\s*초)?/.exec(t);
    if (koHms) {
        const sec = (parseInt(koHms[1], 10) * 3600) + (parseInt(koHms[2] || '0', 10) * 60) + parseInt(koHms[3] || '0', 10);
        if (sec >= 60 && sec <= 86400)
            return sec;
    }
    const koMs = /(\d{1,3})\s*분\s*(?:(\d{1,2})\s*초)?/.exec(t);
    if (koMs) {
        const sec = (parseInt(koMs[1], 10) * 60) + parseInt(koMs[2] || '0', 10);
        if (sec >= 60 && sec <= 86400)
            return sec;
    }
    // Labels prioritized
    const labelled = [
        /(?:운동\s*시간|경과\s*시간|duration|moving\s*time|elapsed\s*time|total\s*time)\s*[:\s]?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i,
        /(\d{1,2}:\d{2}:\d{2})\s*(?:duration|total)?/i,
    ];
    for (const rx of labelled) {
        const m = rx.exec(t);
        if (m && m[1]) {
            const sec = parseTimeToSeconds(m[1]);
            if (sec && sec >= 30 && sec <= 86400)
                return sec;
        }
    }
    const tokenRx = /(?<![\d/:])(\d{1,2}:\d{2}(?::\d{2})?)(?![\d:])/g;
    const candidates = [];
    let m;
    while ((m = tokenRx.exec(t)) !== null) {
        const sec = parseTimeToSeconds(m[1]);
        if (sec && sec >= 60 && sec <= 86400)
            candidates.push(sec);
    }
    if (candidates.length === 0)
        return undefined;
    const big = candidates.filter(c => c > 15 * 60);
    return big.length > 0 ? Math.max(...big) : Math.max(...candidates);
}
function extractPace(text) {
    const t = normalizeOcrText(text);
    const paceToken = "(\\d{1,2})\\s*(?:[:'\"]|분|m)\\s*(\\d{2})";
    const patterns = [
        new RegExp(`${paceToken}\\s*(?:[\"s초])?\\s*\\/?\\s*(?:min\\s*\\/\\s*)?km\\b`, 'i'),
        new RegExp(`(?:평균\\s*페이스|페이스|avg\\s*pace|average\\s*pace|pace)\\s*[:\\s]?\\s*${paceToken}`, 'i'),
        new RegExp(`${paceToken}\\s*(?:페이스|pace)`, 'i'),
    ];
    for (const rx of patterns) {
        const m = rx.exec(t);
        if (!m)
            continue;
        const sec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        if (sec >= 120 && sec <= 1500)
            return sec;
    }
    return undefined;
}
function isReasonableHr(v) {
    return Number.isFinite(v) && v >= 60 && v <= 230;
}
function hasAvgLabel(s) {
    return /\b(avg|average)\b|평균\s*심박수|평균\s*심박|평균심박/.test(s);
}
function hasMaxLabel(s) {
    return /\b(max|maximum|peak)\b|최대\s*심박수|최대\s*심박|최대심박/.test(s);
}
function hasHrContext(s) {
    return /\b(hr|bpm|heart\s*rate)\b|심박수|심박/.test(s);
}
function parseHeartRateFromOcrText(rawText) {
    const text = normalizeOcrText(rawText || '');
    const lower = text.toLowerCase();
    const candidates = [];
    const add = (valueStr, index, explicitBpm) => {
        const value = parseInt(valueStr, 10);
        if (!isReasonableHr(value))
            return;
        const start = Math.max(0, index - 36);
        const end = Math.min(lower.length, index + 36);
        const context = lower.slice(start, end);
        // Ignore random 2-3 digit numbers unless bpm or HR context is present.
        if (!explicitBpm && !hasHrContext(context))
            return;
        candidates.push({ value, context, index, explicitBpm });
    };
    // 151 bpm / 151BPM
    let m;
    const bpmRx = /(?<!\d)(\d{2,3})\s*b\s*p\s*m\b/gi;
    while ((m = bpmRx.exec(text)) !== null)
        add(m[1], m.index, true);
    // Label before value: Avg HR 151, Average Heart Rate 151, 심박수 151
    const labelBeforeRx = /(?:avg\s*hr|average\s*hr|avg\s*heart\s*rate|average\s*heart\s*rate|heart\s*rate|hr|심박수|평균\s*심박수|평균\s*심박|평균심박|최대\s*심박수|최대\s*심박|최대심박)\D{0,14}(\d{2,3})/gi;
    while ((m = labelBeforeRx.exec(text)) !== null)
        add(m[1], m.index, false);
    // Value before label: 151 bpm 평균, 178 max, 151 평균심박
    const valueBeforeRx = /(?<!\d)(\d{2,3})\s*(?:b\s*p\s*m)?\s*(?:avg|average|max|maximum|heart\s*rate|hr|평균|최대|심박수|심박)/gi;
    while ((m = valueBeforeRx.exec(text)) !== null)
        add(m[1], m.index, /b\s*p\s*m/i.test(m[0]));
    // Dedupe while preserving order.
    const deduped = candidates.filter((c, i, arr) => arr.findIndex(x => x.value === c.value && Math.abs(x.index - c.index) < 8) === i);
    let avg_hr;
    let max_hr;
    for (const c of deduped) {
        if (hasMaxLabel(c.context)) {
            max_hr = c.value;
            continue;
        }
        if (hasAvgLabel(c.context)) {
            avg_hr = c.value;
            continue;
        }
    }
    // If no avg label found, use first reasonable bpm / HR-context value as avg.
    if (!avg_hr && deduped.length > 0)
        avg_hr = deduped[0].value;
    // If no max label but we have multiple labeled/unlabeled values, use highest
    // only when it is meaningfully higher than avg (prevents duplicating avg).
    if (!max_hr && avg_hr && deduped.length > 1) {
        const highest = Math.max(...deduped.map(c => c.value));
        if (highest >= avg_hr + 8)
            max_hr = highest;
    }
    return { avg_hr, max_hr };
}
function extractCadence(text) {
    const t = normalizeOcrText(text);
    const candidates = [
        /(?:평균\s*케이던스|케이던스|cadence|steps?\s*\/\s*min|spm)\s*[:\s]?\s*(\d{2,3})/i,
        /(\d{2,3})\s*spm\b/i,
        /(\d{2,3})\s*steps?\s*\/\s*min/i,
    ];
    for (const rx of candidates) {
        const v = matchNum(t, rx);
        if (v && v >= 100 && v <= 250)
            return Math.round(v);
    }
    return undefined;
}
function extractCalories(text) {
    const t = normalizeOcrText(text);
    const candidates = [
        /(?:활동\s*칼로리|총\s*칼로리|칼로리|calories?|cal|kcal|active\s*calories?|active\s*kcal|energy)\s*[:\s]?\s*(\d{2,5})/i,
        /(\d{2,5})\s*(?:cal|kcal)\b/i,
    ];
    for (const rx of candidates) {
        const v = matchNum(t, rx);
        if (v && v >= 10 && v <= 10000)
            return Math.round(v);
    }
    return undefined;
}
function extractElevation(text) {
    const t = normalizeOcrText(text);
    const candidates = [
        /(?:등반\s*고도|상승\s*고도|고도|elev(?:ation)?\s*gain|elev(?:ation)?|ascent|gain)\s*[:\s]?\s*(\d{1,5})\s*m\b/i,
        /(\d{1,5})\s*m\s*(?:elev|gain|ascent)/i,
    ];
    for (const rx of candidates) {
        const v = matchNum(t, rx);
        if (v && v >= 0 && v <= 20000)
            return Math.round(v);
    }
    return undefined;
}
function makeIsoDate(year, month, day) {
    if (year < 2010 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31)
        return undefined;
    const dt = new Date(year, month - 1, day);
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day)
        return undefined;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}
function resolveYearForMonthDay(month, day, weekday) {
    const koWeekdays = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0 };
    const now = new Date();
    const currentYear = now.getFullYear();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const weekdayValue = weekday ? koWeekdays[weekday] : undefined;
    const candidates = [currentYear, currentYear - 1, currentYear + 1]
        .map(year => ({ year, dt: new Date(year, month - 1, day) }))
        .filter(c => c.dt.getMonth() === month - 1 && c.dt.getDate() === day)
        .filter(c => weekdayValue === undefined || c.dt.getDay() === weekdayValue)
        .filter(c => c.dt <= tomorrow)
        .sort((a, b) => Math.abs(now.getTime() - a.dt.getTime()) - Math.abs(now.getTime() - b.dt.getTime()));
    return candidates[0]?.year;
}
function extractDate(text) {
    const t = normalizeOcrText(text);
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const monthNames = {
        jan: 1, january: 1,
        feb: 2, february: 2,
        mar: 3, march: 3,
        apr: 4, april: 4,
        may: 5,
        jun: 6, june: 6,
        jul: 7, july: 7,
        aug: 8, august: 8,
        sep: 9, sept: 9, september: 9,
        oct: 10, october: 10,
        nov: 11, november: 11,
        dec: 12, december: 12,
    };
    const candidates = [];
    const addCandidate = (year, month, day, index, hasExplicitYear, extraScore = 0) => {
        const iso = makeIsoDate(year, month, day);
        if (!iso)
            return;
        const dt = new Date(year, month - 1, day);
        const context = t.slice(Math.max(0, index - 28), Math.min(t.length, index + 48)).toLowerCase();
        let score = extraScore + (hasExplicitYear ? 30 : 12);
        if (dt <= tomorrow)
            score += 8;
        else
            score -= 20;
        if (/run|running|workout|activity|운동|러닝|달리기|실외|실내/.test(context))
            score += 5;
        if (/birthday|birth|생년|나이/.test(context))
            score -= 20;
        candidates.push({ iso, score, index });
    };
    let m;
    const ymd = /(\d{4})\s*(?:[-./년])\s*(\d{1,2})\s*(?:[-./월])\s*(\d{1,2})\s*(?:일)?/g;
    while ((m = ymd.exec(t)) !== null) {
        addCandidate(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), m.index, true, 10);
    }
    const slashYear = /(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/g;
    while ((m = slashYear.exec(t)) !== null) {
        const a = parseInt(m[1], 10);
        const b = parseInt(m[2], 10);
        const y = parseInt(m[3], 10);
        if (a <= 12)
            addCandidate(y, a, b, m.index, true, 6);
        if (b <= 12 && a > 12)
            addCandidate(y, b, a, m.index, true, 5);
    }
    const monthNameWithYear = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{4})\b/gi;
    while ((m = monthNameWithYear.exec(t)) !== null) {
        addCandidate(parseInt(m[3], 10), monthNames[m[1].toLowerCase()], parseInt(m[2], 10), m.index, true, 8);
    }
    const koNoYear = /(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*\(([월화수목금토일])\))?/g;
    while ((m = koNoYear.exec(t)) !== null) {
        const month = parseInt(m[1], 10);
        const day = parseInt(m[2], 10);
        const year = resolveYearForMonthDay(month, day, m[3]);
        if (year)
            addCandidate(year, month, day, m.index, false, m[3] ? 8 : 3);
    }
    const slashNoYear = /(?<!\d)(\d{1,2})\s*\/\s*(\d{1,2})(?!\s*\/\s*\d)/g;
    while ((m = slashNoYear.exec(t)) !== null) {
        const month = parseInt(m[1], 10);
        const day = parseInt(m[2], 10);
        const year = resolveYearForMonthDay(month, day);
        if (year)
            addCandidate(year, month, day, m.index, false, 1);
    }
    const monthNameNoYear = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi;
    while ((m = monthNameNoYear.exec(t)) !== null) {
        const month = monthNames[m[1].toLowerCase()];
        const day = parseInt(m[2], 10);
        const year = resolveYearForMonthDay(month, day);
        if (year)
            addCandidate(year, month, day, m.index, false, 2);
    }
    candidates.sort((a, b) => b.score - a.score || a.index - b.index);
    return candidates[0]?.iso;
}
function extractRunType(text) {
    const t = text.toLowerCase();
    if (t.includes('recovery'))
        return 'recovery';
    if (t.includes('long run') || t.includes('long-run'))
        return 'long';
    if (t.includes('interval') || t.includes('repeats'))
        return 'interval';
    if (t.includes('tempo') || t.includes('threshold'))
        return 'tempo';
    if (t.includes('easy run') || t.includes('easy'))
        return 'easy';
    return undefined;
}
// ─────────────────────────────────────────────────────────────
// 5) Public parsers
// ─────────────────────────────────────────────────────────────
/**
 * Parse raw OCR text into a structured ParsedScreenshotRun.
 * Source-aware where possible, falls back to generic regex extraction.
 * Never throws — missing fields are simply left undefined.
 */
function parseRunningScreenshotText(rawText) {
    const text = normalizeOcrText(rawText || '');
    const source = detectSource(text);
    const heartRate = parseHeartRateFromOcrText(text);
    // All extractors are pure regex over normalised text — same logic
    // works for all sources (the source label is mostly informational).
    return {
        source,
        rawText: text,
        date: extractDate(text),
        runType: extractRunType(text),
        distanceKm: extractDistance(text),
        durationSeconds: extractDuration(text),
        paceSecPerKm: extractPace(text),
        avg_hr: heartRate.avg_hr,
        max_hr: heartRate.max_hr,
        avgHeartRate: heartRate.avg_hr,
        maxHeartRate: heartRate.max_hr,
        averageHeartRate: heartRate.avg_hr,
        heartRate: heartRate.avg_hr,
        cadence: extractCadence(text),
        calories: extractCalories(text),
        elevationGainM: extractElevation(text),
    };
}
/**
 * Normalise extracted run data:
 *   - default date to today if missing
 *   - default run type to 'easy' if missing
 *   - calculate pace from distance + duration if pace missing
 *   - round numeric values appropriately
 */
function normalizeExtractedRunData(parsed) {
    const out = { ...parsed };
    // Preserve and normalize accepted HR field names into app fields.
    const avgHr = out.avg_hr ?? out.avgHeartRate ?? out.averageHeartRate ?? out.heartRate;
    const maxHr = out.max_hr ?? out.maxHeartRate;
    if (avgHr !== undefined && isReasonableHr(avgHr)) {
        out.avg_hr = Math.round(avgHr);
        out.avgHeartRate = Math.round(avgHr);
        out.averageHeartRate = Math.round(avgHr);
        out.heartRate = Math.round(avgHr);
    }
    if (maxHr !== undefined && isReasonableHr(maxHr)) {
        out.max_hr = Math.round(maxHr);
        out.maxHeartRate = Math.round(maxHr);
    }
    // Default date → today (marked as fallback)
    if (!out.date) {
        const d = new Date();
        out.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        // Note: UI should show "using upload date as fallback"
    }
    // Default run type
    if (!out.runType)
        out.runType = 'easy';
    // Round distance to 2 decimals
    if (out.distanceKm)
        out.distanceKm = parseFloat(out.distanceKm.toFixed(2));
    // Round duration to whole seconds
    if (out.durationSeconds)
        out.durationSeconds = Math.round(out.durationSeconds);
    // Calculate pace if missing
    if (!out.paceSecPerKm && out.distanceKm && out.durationSeconds && out.distanceKm > 0) {
        out.paceSecPerKm = Math.round(out.durationSeconds / out.distanceKm);
    }
    // Calculate duration if missing (pace * distance)
    if (!out.durationSeconds && out.distanceKm && out.paceSecPerKm && out.distanceKm > 0) {
        out.durationSeconds = Math.round(out.distanceKm * out.paceSecPerKm);
    }
    // Calculate distance if missing (duration / pace)
    if (!out.distanceKm && out.durationSeconds && out.paceSecPerKm && out.paceSecPerKm > 0) {
        out.distanceKm = parseFloat((out.durationSeconds / out.paceSecPerKm).toFixed(2));
    }
    return out;
}
/**
 * Validate a parsed/normalised run.
 * Returns isSavable=true only when date + distance + duration are all set.
 */
function validateExtractedRun(run) {
    const warnings = [];
    const errors = [];
    const avgHr = run.avg_hr ?? run.avgHeartRate ?? run.averageHeartRate ?? run.heartRate;
    const maxHr = run.max_hr ?? run.maxHeartRate;
    const hasDate = !!run.date;
    const hasDist = run.distanceKm !== undefined && run.distanceKm > 0;
    const hasDur = run.durationSeconds !== undefined && run.durationSeconds > 0;
    if (!hasDate)
        errors.push('Date is required');
    if (!hasDist)
        errors.push('Distance is required');
    if (!hasDur)
        errors.push('Duration is required');
    // Pace mismatch warning
    let paceMismatch;
    if (run.paceSecPerKm && run.distanceKm && run.durationSeconds && run.distanceKm > 0) {
        const calc = Math.round(run.durationSeconds / run.distanceKm);
        if (Math.abs(calc - run.paceSecPerKm) > 15) {
            paceMismatch = { extracted: run.paceSecPerKm, calculated: calc };
            warnings.push(`Extracted pace (${formatPaceShort(run.paceSecPerKm)}) differs from calculated (${formatPaceShort(calc)}).`);
        }
    }
    // Reasonable range checks
    if (run.distanceKm && (run.distanceKm < 0.1 || run.distanceKm > 200)) {
        warnings.push('Distance is outside typical range. Please verify.');
    }
    if (run.durationSeconds && (run.durationSeconds < 60 || run.durationSeconds > 24 * 3600)) {
        warnings.push('Duration is outside typical range. Please verify.');
    }
    if (run.paceSecPerKm && (run.paceSecPerKm < 120 || run.paceSecPerKm > 1500)) {
        warnings.push('Pace is outside typical range. Please verify.');
    }
    if (avgHr !== undefined && !isReasonableHr(avgHr)) {
        warnings.push('Avg HR is outside typical range.');
    }
    if (maxHr !== undefined && !isReasonableHr(maxHr)) {
        warnings.push('Max HR is outside typical range.');
    }
    return {
        isValid: errors.length === 0,
        isComplete: hasDate && hasDist && hasDur,
        isSavable: hasDate && hasDist && hasDur,
        warnings,
        errors,
        paceMismatch,
    };
}
function formatPaceShort(secPerKm) {
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export { normalizeExtractedRunData, parseHeartRateFromOcrText, parseRunningScreenshotText, runScreenshotOcr, terminateOcrWorker, validateExtractedRun };
