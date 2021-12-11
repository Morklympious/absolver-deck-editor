(function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    var __assign = function () {
      __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];

          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }

        return t;
      };

      return __assign.apply(this, arguments);
    };

    function __rest(s, e) {
      var t = {};

      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];

      if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
      }
      return t;
    }

    function __values(o) {
      var m = typeof Symbol === "function" && o[Symbol.iterator],
          i = 0;
      if (m) return m.call(o);
      return {
        next: function () {
          if (o && i >= o.length) o = void 0;
          return {
            value: o && o[i++],
            done: !o
          };
        }
      };
    }

    function __read(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o),
          r,
          ar = [],
          e;

      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = {
          error: error
        };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }

      return ar;
    }

    function __spread() {
      for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));

      return ar;
    }

    var STATE_DELIMITER = '.';
    var EMPTY_ACTIVITY_MAP = {};
    var DEFAULT_GUARD_TYPE = 'xstate.guard';
    var TARGETLESS_KEY = '';

    function keys(value) {
      return Object.keys(value);
    }

    function matchesState(parentStateId, childStateId, delimiter) {
      if (delimiter === void 0) {
        delimiter = STATE_DELIMITER;
      }

      var parentStateValue = toStateValue(parentStateId, delimiter);
      var childStateValue = toStateValue(childStateId, delimiter);

      if (isString(childStateValue)) {
        if (isString(parentStateValue)) {
          return childStateValue === parentStateValue;
        } // Parent more specific than child


        return false;
      }

      if (isString(parentStateValue)) {
        return parentStateValue in childStateValue;
      }

      return keys(parentStateValue).every(function (key) {
        if (!(key in childStateValue)) {
          return false;
        }

        return matchesState(parentStateValue[key], childStateValue[key]);
      });
    }

    function getEventType(event) {
      try {
        return isString(event) || typeof event === 'number' ? "" + event : event.type;
      } catch (e) {
        throw new Error('Events must be strings or objects with a string event.type property.');
      }
    }

    function toStatePath(stateId, delimiter) {
      try {
        if (isArray(stateId)) {
          return stateId;
        }

        return stateId.toString().split(delimiter);
      } catch (e) {
        throw new Error("'" + stateId + "' is not a valid state path.");
      }
    }

    function isStateLike(state) {
      return typeof state === 'object' && 'value' in state && 'context' in state && 'event' in state && '_event' in state;
    }

    function toStateValue(stateValue, delimiter) {
      if (isStateLike(stateValue)) {
        return stateValue.value;
      }

      if (isArray(stateValue)) {
        return pathToStateValue(stateValue);
      }

      if (typeof stateValue !== 'string') {
        return stateValue;
      }

      var statePath = toStatePath(stateValue, delimiter);
      return pathToStateValue(statePath);
    }

    function pathToStateValue(statePath) {
      if (statePath.length === 1) {
        return statePath[0];
      }

      var value = {};
      var marker = value;

      for (var i = 0; i < statePath.length - 1; i++) {
        if (i === statePath.length - 2) {
          marker[statePath[i]] = statePath[i + 1];
        } else {
          marker[statePath[i]] = {};
          marker = marker[statePath[i]];
        }
      }

      return value;
    }

    function mapValues(collection, iteratee) {
      var result = {};
      var collectionKeys = keys(collection);

      for (var i = 0; i < collectionKeys.length; i++) {
        var key = collectionKeys[i];
        result[key] = iteratee(collection[key], key, collection, i);
      }

      return result;
    }

    function mapFilterValues(collection, iteratee, predicate) {
      var e_1, _a;

      var result = {};

      try {
        for (var _b = __values(keys(collection)), _c = _b.next(); !_c.done; _c = _b.next()) {
          var key = _c.value;
          var item = collection[key];

          if (!predicate(item)) {
            continue;
          }

          result[key] = iteratee(item, key, collection);
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        } finally {
          if (e_1) throw e_1.error;
        }
      }

      return result;
    }
    /**
     * Retrieves a value at the given path.
     * @param props The deep path to the prop of the desired value
     */


    var path = function (props) {
      return function (object) {
        var e_2, _a;

        var result = object;

        try {
          for (var props_1 = __values(props), props_1_1 = props_1.next(); !props_1_1.done; props_1_1 = props_1.next()) {
            var prop = props_1_1.value;
            result = result[prop];
          }
        } catch (e_2_1) {
          e_2 = {
            error: e_2_1
          };
        } finally {
          try {
            if (props_1_1 && !props_1_1.done && (_a = props_1.return)) _a.call(props_1);
          } finally {
            if (e_2) throw e_2.error;
          }
        }

        return result;
      };
    };
    /**
     * Retrieves a value at the given path via the nested accessor prop.
     * @param props The deep path to the prop of the desired value
     */


    function nestedPath(props, accessorProp) {
      return function (object) {
        var e_3, _a;

        var result = object;

        try {
          for (var props_2 = __values(props), props_2_1 = props_2.next(); !props_2_1.done; props_2_1 = props_2.next()) {
            var prop = props_2_1.value;
            result = result[accessorProp][prop];
          }
        } catch (e_3_1) {
          e_3 = {
            error: e_3_1
          };
        } finally {
          try {
            if (props_2_1 && !props_2_1.done && (_a = props_2.return)) _a.call(props_2);
          } finally {
            if (e_3) throw e_3.error;
          }
        }

        return result;
      };
    }

    function toStatePaths(stateValue) {
      if (!stateValue) {
        return [[]];
      }

      if (isString(stateValue)) {
        return [[stateValue]];
      }

      var result = flatten(keys(stateValue).map(function (key) {
        var subStateValue = stateValue[key];

        if (typeof subStateValue !== 'string' && (!subStateValue || !Object.keys(subStateValue).length)) {
          return [[key]];
        }

        return toStatePaths(stateValue[key]).map(function (subPath) {
          return [key].concat(subPath);
        });
      }));
      return result;
    }

    function flatten(array) {
      var _a;

      return (_a = []).concat.apply(_a, __spread(array));
    }

    function toArrayStrict(value) {
      if (isArray(value)) {
        return value;
      }

      return [value];
    }

    function toArray(value) {
      if (value === undefined) {
        return [];
      }

      return toArrayStrict(value);
    }

    function mapContext(mapper, context, _event) {
      var e_5, _a;

      if (isFunction(mapper)) {
        return mapper(context, _event.data);
      }

      var result = {};

      try {
        for (var _b = __values(keys(mapper)), _c = _b.next(); !_c.done; _c = _b.next()) {
          var key = _c.value;
          var subMapper = mapper[key];

          if (isFunction(subMapper)) {
            result[key] = subMapper(context, _event.data);
          } else {
            result[key] = subMapper;
          }
        }
      } catch (e_5_1) {
        e_5 = {
          error: e_5_1
        };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        } finally {
          if (e_5) throw e_5.error;
        }
      }

      return result;
    }

    function isBuiltInEvent(eventType) {
      return /^(done|error)\./.test(eventType);
    }

    function isPromiseLike(value) {
      if (value instanceof Promise) {
        return true;
      } // Check if shape matches the Promise/A+ specification for a "thenable".


      if (value !== null && (isFunction(value) || typeof value === 'object') && isFunction(value.then)) {
        return true;
      }

      return false;
    }

    function partition(items, predicate) {
      var e_6, _a;

      var _b = __read([[], []], 2),
          truthy = _b[0],
          falsy = _b[1];

      try {
        for (var items_1 = __values(items), items_1_1 = items_1.next(); !items_1_1.done; items_1_1 = items_1.next()) {
          var item = items_1_1.value;

          if (predicate(item)) {
            truthy.push(item);
          } else {
            falsy.push(item);
          }
        }
      } catch (e_6_1) {
        e_6 = {
          error: e_6_1
        };
      } finally {
        try {
          if (items_1_1 && !items_1_1.done && (_a = items_1.return)) _a.call(items_1);
        } finally {
          if (e_6) throw e_6.error;
        }
      }

      return [truthy, falsy];
    }

    function updateHistoryStates(hist, stateValue) {
      return mapValues(hist.states, function (subHist, key) {
        if (!subHist) {
          return undefined;
        }

        var subStateValue = (isString(stateValue) ? undefined : stateValue[key]) || (subHist ? subHist.current : undefined);

        if (!subStateValue) {
          return undefined;
        }

        return {
          current: subStateValue,
          states: updateHistoryStates(subHist, subStateValue)
        };
      });
    }

    function updateHistoryValue(hist, stateValue) {
      return {
        current: stateValue,
        states: updateHistoryStates(hist, stateValue)
      };
    }

    function updateContext(context, _event, assignActions, state) {

      var updatedContext = context ? assignActions.reduce(function (acc, assignAction) {
        var e_7, _a;

        var assignment = assignAction.assignment;
        var meta = {
          state: state,
          action: assignAction,
          _event: _event
        };
        var partialUpdate = {};

        if (isFunction(assignment)) {
          partialUpdate = assignment(acc, _event.data, meta);
        } else {
          try {
            for (var _b = __values(keys(assignment)), _c = _b.next(); !_c.done; _c = _b.next()) {
              var key = _c.value;
              var propAssignment = assignment[key];
              partialUpdate[key] = isFunction(propAssignment) ? propAssignment(acc, _event.data, meta) : propAssignment;
            }
          } catch (e_7_1) {
            e_7 = {
              error: e_7_1
            };
          } finally {
            try {
              if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            } finally {
              if (e_7) throw e_7.error;
            }
          }
        }

        return Object.assign({}, acc, partialUpdate);
      }, context) : context;
      return updatedContext;
    } // tslint:disable-next-line:no-empty

    function isArray(value) {
      return Array.isArray(value);
    } // tslint:disable-next-line:ban-types


    function isFunction(value) {
      return typeof value === 'function';
    }

    function isString(value) {
      return typeof value === 'string';
    } // export function memoizedGetter<T, TP extends { prototype: object }>(
    //   o: TP,
    //   property: string,
    //   getter: () => T
    // ): void {
    //   Object.defineProperty(o.prototype, property, {
    //     get: getter,
    //     enumerable: false,
    //     configurable: false
    //   });
    // }


    function toGuard(condition, guardMap) {
      if (!condition) {
        return undefined;
      }

      if (isString(condition)) {
        return {
          type: DEFAULT_GUARD_TYPE,
          name: condition,
          predicate: guardMap ? guardMap[condition] : undefined
        };
      }

      if (isFunction(condition)) {
        return {
          type: DEFAULT_GUARD_TYPE,
          name: condition.name,
          predicate: condition
        };
      }

      return condition;
    }

    function isObservable(value) {
      try {
        return 'subscribe' in value && isFunction(value.subscribe);
      } catch (e) {
        return false;
      }
    }

    var symbolObservable =
    /*#__PURE__*/
    function () {
      return typeof Symbol === 'function' && Symbol.observable || '@@observable';
    }();

    function isMachine(value) {
      try {
        return '__xstatenode' in value;
      } catch (e) {
        return false;
      }
    }

    function toEventObject(event, payload // id?: TEvent['type']
    ) {
      if (isString(event) || typeof event === 'number') {
        return __assign({
          type: event
        }, payload);
      }

      return event;
    }

    function toSCXMLEvent(event, scxmlEvent) {
      if (!isString(event) && '$$type' in event && event.$$type === 'scxml') {
        return event;
      }

      var eventObject = toEventObject(event);
      return __assign({
        name: eventObject.type,
        data: eventObject,
        $$type: 'scxml',
        type: 'external'
      }, scxmlEvent);
    }

    function toTransitionConfigArray(event, configLike) {
      var transitions = toArrayStrict(configLike).map(function (transitionLike) {
        if (typeof transitionLike === 'undefined' || typeof transitionLike === 'string' || isMachine(transitionLike)) {
          // @ts-ignore until Type instantiation is excessively deep and possibly infinite bug is fixed
          return {
            target: transitionLike,
            event: event
          };
        }

        return __assign(__assign({}, transitionLike), {
          event: event
        });
      });
      return transitions;
    }

    function normalizeTarget(target) {
      if (target === undefined || target === TARGETLESS_KEY) {
        return undefined;
      }

      return toArray(target);
    }

    var ActionTypes;

    (function (ActionTypes) {
      ActionTypes["Start"] = "xstate.start";
      ActionTypes["Stop"] = "xstate.stop";
      ActionTypes["Raise"] = "xstate.raise";
      ActionTypes["Send"] = "xstate.send";
      ActionTypes["Cancel"] = "xstate.cancel";
      ActionTypes["NullEvent"] = "";
      ActionTypes["Assign"] = "xstate.assign";
      ActionTypes["After"] = "xstate.after";
      ActionTypes["DoneState"] = "done.state";
      ActionTypes["DoneInvoke"] = "done.invoke";
      ActionTypes["Log"] = "xstate.log";
      ActionTypes["Init"] = "xstate.init";
      ActionTypes["Invoke"] = "xstate.invoke";
      ActionTypes["ErrorExecution"] = "error.execution";
      ActionTypes["ErrorCommunication"] = "error.communication";
      ActionTypes["ErrorPlatform"] = "error.platform";
      ActionTypes["ErrorCustom"] = "xstate.error";
      ActionTypes["Update"] = "xstate.update";
      ActionTypes["Pure"] = "xstate.pure";
    })(ActionTypes || (ActionTypes = {}));

    var SpecialTargets;

    (function (SpecialTargets) {
      SpecialTargets["Parent"] = "#_parent";
      SpecialTargets["Internal"] = "#_internal";
    })(SpecialTargets || (SpecialTargets = {}));

    var start = ActionTypes.Start;
    var stop = ActionTypes.Stop;
    var raise = ActionTypes.Raise;
    var send = ActionTypes.Send;
    var cancel = ActionTypes.Cancel;
    var nullEvent = ActionTypes.NullEvent;
    var assign$1 = ActionTypes.Assign;
    var after = ActionTypes.After;
    var doneState = ActionTypes.DoneState;
    var log = ActionTypes.Log;
    var init$1 = ActionTypes.Init;
    var invoke = ActionTypes.Invoke;
    var errorExecution = ActionTypes.ErrorExecution;
    var errorPlatform = ActionTypes.ErrorPlatform;
    var error = ActionTypes.ErrorCustom;
    var update$1 = ActionTypes.Update;
    var pure = ActionTypes.Pure;

    var initEvent =
    /*#__PURE__*/
    toSCXMLEvent({
      type: init$1
    });

    function getActionFunction(actionType, actionFunctionMap) {
      return actionFunctionMap ? actionFunctionMap[actionType] || undefined : undefined;
    }

    function toActionObject(action, actionFunctionMap) {
      var actionObject;

      if (isString(action) || typeof action === 'number') {
        var exec = getActionFunction(action, actionFunctionMap);

        if (isFunction(exec)) {
          actionObject = {
            type: action,
            exec: exec
          };
        } else if (exec) {
          actionObject = exec;
        } else {
          actionObject = {
            type: action,
            exec: undefined
          };
        }
      } else if (isFunction(action)) {
        actionObject = {
          // Convert action to string if unnamed
          type: action.name || action.toString(),
          exec: action
        };
      } else {
        var exec = getActionFunction(action.type, actionFunctionMap);

        if (isFunction(exec)) {
          actionObject = __assign(__assign({}, action), {
            exec: exec
          });
        } else if (exec) {
          var type = action.type,
              other = __rest(action, ["type"]);

          actionObject = __assign(__assign({
            type: type
          }, exec), other);
        } else {
          actionObject = action;
        }
      }

      Object.defineProperty(actionObject, 'toString', {
        value: function () {
          return actionObject.type;
        },
        enumerable: false,
        configurable: true
      });
      return actionObject;
    }

    var toActionObjects = function (action, actionFunctionMap) {
      if (!action) {
        return [];
      }

      var actions = isArray(action) ? action : [action];
      return actions.map(function (subAction) {
        return toActionObject(subAction, actionFunctionMap);
      });
    };

    function toActivityDefinition(action) {
      var actionObject = toActionObject(action);
      return __assign(__assign({
        id: isString(action) ? action : actionObject.id
      }, actionObject), {
        type: actionObject.type
      });
    }
    /**
     * Raises an event. This places the event in the internal event queue, so that
     * the event is immediately consumed by the machine in the current step.
     *
     * @param eventType The event to raise.
     */


    function raise$1(event) {
      if (!isString(event)) {
        return send$1(event, {
          to: SpecialTargets.Internal
        });
      }

      return {
        type: raise,
        event: event
      };
    }

    function resolveRaise(action) {
      return {
        type: raise,
        _event: toSCXMLEvent(action.event)
      };
    }
    /**
     * Sends an event. This returns an action that will be read by an interpreter to
     * send the event in the next step, after the current step is finished executing.
     *
     * @param event The event to send.
     * @param options Options to pass into the send event:
     *  - `id` - The unique send event identifier (used with `cancel()`).
     *  - `delay` - The number of milliseconds to delay the sending of the event.
     *  - `to` - The target of this event (by default, the machine the event was sent from).
     */


    function send$1(event, options) {
      return {
        to: options ? options.to : undefined,
        type: send,
        event: isFunction(event) ? event : toEventObject(event),
        delay: options ? options.delay : undefined,
        id: options && options.id !== undefined ? options.id : isFunction(event) ? event.name : getEventType(event)
      };
    }

    function resolveSend(action, ctx, _event, delaysMap) {
      var meta = {
        _event: _event
      }; // TODO: helper function for resolving Expr

      var resolvedEvent = toSCXMLEvent(isFunction(action.event) ? action.event(ctx, _event.data, meta) : action.event);
      var resolvedDelay;

      if (isString(action.delay)) {
        var configDelay = delaysMap && delaysMap[action.delay];
        resolvedDelay = isFunction(configDelay) ? configDelay(ctx, _event.data, meta) : configDelay;
      } else {
        resolvedDelay = isFunction(action.delay) ? action.delay(ctx, _event.data, meta) : action.delay;
      }

      var resolvedTarget = isFunction(action.to) ? action.to(ctx, _event.data, meta) : action.to;
      return __assign(__assign({}, action), {
        to: resolvedTarget,
        _event: resolvedEvent,
        event: resolvedEvent.data,
        delay: resolvedDelay
      });
    }
    /**
     * Sends an event to this machine's parent.
     *
     * @param event The event to send to the parent machine.
     * @param options Options to pass into the send event.
     */


    function sendParent(event, options) {
      return send$1(event, __assign(__assign({}, options), {
        to: SpecialTargets.Parent
      }));
    }
    /**
     * Sends an update event to this machine's parent.
     */


    function sendUpdate() {
      return sendParent(update$1);
    }
    /**
     * Sends an event back to the sender of the original event.
     *
     * @param event The event to send back to the sender
     * @param options Options to pass into the send event
     */


    function respond(event, options) {
      return send$1(event, __assign(__assign({}, options), {
        to: function (_, __, _a) {
          var _event = _a._event;
          return _event.origin; // TODO: handle when _event.origin is undefined
        }
      }));
    }

    var defaultLogExpr = function (context, event) {
      return {
        context: context,
        event: event
      };
    };
    /**
     *
     * @param expr The expression function to evaluate which will be logged.
     *  Takes in 2 arguments:
     *  - `ctx` - the current state context
     *  - `event` - the event that caused this action to be executed.
     * @param label The label to give to the logged expression.
     */


    function log$1(expr, label) {
      if (expr === void 0) {
        expr = defaultLogExpr;
      }

      return {
        type: log,
        label: label,
        expr: expr
      };
    }

    var resolveLog = function (action, ctx, _event) {
      return __assign(__assign({}, action), {
        value: isString(action.expr) ? action.expr : action.expr(ctx, _event.data, {
          _event: _event
        })
      });
    };
    /**
     * Cancels an in-flight `send(...)` action. A canceled sent action will not
     * be executed, nor will its event be sent, unless it has already been sent
     * (e.g., if `cancel(...)` is called after the `send(...)` action's `delay`).
     *
     * @param sendId The `id` of the `send(...)` action to cancel.
     */


    var cancel$1 = function (sendId) {
      return {
        type: cancel,
        sendId: sendId
      };
    };
    /**
     * Starts an activity.
     *
     * @param activity The activity to start.
     */


    function start$1(activity) {
      var activityDef = toActivityDefinition(activity);
      return {
        type: ActionTypes.Start,
        activity: activityDef,
        exec: undefined
      };
    }
    /**
     * Stops an activity.
     *
     * @param activity The activity to stop.
     */


    function stop$1(activity) {
      var activityDef = toActivityDefinition(activity);
      return {
        type: ActionTypes.Stop,
        activity: activityDef,
        exec: undefined
      };
    }
    /**
     * Updates the current context of the machine.
     *
     * @param assignment An object that represents the partial context to update.
     */


    var assign$2 = function (assignment) {
      return {
        type: assign$1,
        assignment: assignment
      };
    };
    /**
     * Returns an event type that represents an implicit event that
     * is sent after the specified `delay`.
     *
     * @param delayRef The delay in milliseconds
     * @param id The state node ID where this event is handled
     */


    function after$1(delayRef, id) {
      var idSuffix = id ? "#" + id : '';
      return ActionTypes.After + "(" + delayRef + ")" + idSuffix;
    }
    /**
     * Returns an event that represents that a final state node
     * has been reached in the parent state node.
     *
     * @param id The final state node's parent state node `id`
     * @param data The data to pass into the event
     */


    function done(id, data) {
      var type = ActionTypes.DoneState + "." + id;
      var eventObject = {
        type: type,
        data: data
      };

      eventObject.toString = function () {
        return type;
      };

      return eventObject;
    }
    /**
     * Returns an event that represents that an invoked service has terminated.
     *
     * An invoked service is terminated when it has reached a top-level final state node,
     * but not when it is canceled.
     *
     * @param id The final state node ID
     * @param data The data to pass into the event
     */


    function doneInvoke(id, data) {
      var type = ActionTypes.DoneInvoke + "." + id;
      var eventObject = {
        type: type,
        data: data
      };

      eventObject.toString = function () {
        return type;
      };

      return eventObject;
    }

    function error$1(id, data) {
      var type = ActionTypes.ErrorPlatform + "." + id;
      var eventObject = {
        type: type,
        data: data
      };

      eventObject.toString = function () {
        return type;
      };

      return eventObject;
    }
    /**
     * Forwards (sends) an event to a specified service.
     *
     * @param target The target service to forward the event to.
     * @param options Options to pass into the send action creator.
     */


    function forwardTo(target, options) {
      return send$1(function (_, event) {
        return event;
      }, __assign(__assign({}, options), {
        to: target
      }));
    }
    /**
     * Escalates an error by sending it as an event to this machine's parent.
     *
     * @param errorData The error data to send, or the expression function that
     * takes in the `context`, `event`, and `meta`, and returns the error data to send.
     * @param options Options to pass into the send action creator.
     */


    function escalate(errorData, options) {
      return sendParent(function (context, event, meta) {
        return {
          type: error,
          data: isFunction(errorData) ? errorData(context, event, meta) : errorData
        };
      }, __assign(__assign({}, options), {
        to: SpecialTargets.Parent
      }));
    }

    var isLeafNode = function (stateNode) {
      return stateNode.type === 'atomic' || stateNode.type === 'final';
    };

    function getChildren(stateNode) {
      return keys(stateNode.states).map(function (key) {
        return stateNode.states[key];
      });
    }

    function getAllStateNodes(stateNode) {
      var stateNodes = [stateNode];

      if (isLeafNode(stateNode)) {
        return stateNodes;
      }

      return stateNodes.concat(flatten(getChildren(stateNode).map(getAllStateNodes)));
    }

    function getConfiguration(prevStateNodes, stateNodes) {
      var e_1, _a, e_2, _b, e_3, _c, e_4, _d;

      var prevConfiguration = new Set(prevStateNodes);
      var prevAdjList = getAdjList(prevConfiguration);
      var configuration = new Set(stateNodes);

      try {
        // add all ancestors
        for (var configuration_1 = __values(configuration), configuration_1_1 = configuration_1.next(); !configuration_1_1.done; configuration_1_1 = configuration_1.next()) {
          var s = configuration_1_1.value;
          var m = s.parent;

          while (m && !configuration.has(m)) {
            configuration.add(m);
            m = m.parent;
          }
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (configuration_1_1 && !configuration_1_1.done && (_a = configuration_1.return)) _a.call(configuration_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }

      var adjList = getAdjList(configuration);

      try {
        // add descendants
        for (var configuration_2 = __values(configuration), configuration_2_1 = configuration_2.next(); !configuration_2_1.done; configuration_2_1 = configuration_2.next()) {
          var s = configuration_2_1.value; // if previously active, add existing child nodes

          if (s.type === 'compound' && (!adjList.get(s) || !adjList.get(s).length)) {
            if (prevAdjList.get(s)) {
              prevAdjList.get(s).forEach(function (sn) {
                return configuration.add(sn);
              });
            } else {
              s.initialStateNodes.forEach(function (sn) {
                return configuration.add(sn);
              });
            }
          } else {
            if (s.type === 'parallel') {
              try {
                for (var _e = (e_3 = void 0, __values(getChildren(s))), _f = _e.next(); !_f.done; _f = _e.next()) {
                  var child = _f.value;

                  if (child.type === 'history') {
                    continue;
                  }

                  if (!configuration.has(child)) {
                    configuration.add(child);

                    if (prevAdjList.get(child)) {
                      prevAdjList.get(child).forEach(function (sn) {
                        return configuration.add(sn);
                      });
                    } else {
                      child.initialStateNodes.forEach(function (sn) {
                        return configuration.add(sn);
                      });
                    }
                  }
                }
              } catch (e_3_1) {
                e_3 = {
                  error: e_3_1
                };
              } finally {
                try {
                  if (_f && !_f.done && (_c = _e.return)) _c.call(_e);
                } finally {
                  if (e_3) throw e_3.error;
                }
              }
            }
          }
        }
      } catch (e_2_1) {
        e_2 = {
          error: e_2_1
        };
      } finally {
        try {
          if (configuration_2_1 && !configuration_2_1.done && (_b = configuration_2.return)) _b.call(configuration_2);
        } finally {
          if (e_2) throw e_2.error;
        }
      }

      try {
        // add all ancestors
        for (var configuration_3 = __values(configuration), configuration_3_1 = configuration_3.next(); !configuration_3_1.done; configuration_3_1 = configuration_3.next()) {
          var s = configuration_3_1.value;
          var m = s.parent;

          while (m && !configuration.has(m)) {
            configuration.add(m);
            m = m.parent;
          }
        }
      } catch (e_4_1) {
        e_4 = {
          error: e_4_1
        };
      } finally {
        try {
          if (configuration_3_1 && !configuration_3_1.done && (_d = configuration_3.return)) _d.call(configuration_3);
        } finally {
          if (e_4) throw e_4.error;
        }
      }

      return configuration;
    }

    function getValueFromAdj(baseNode, adjList) {
      var childStateNodes = adjList.get(baseNode);

      if (!childStateNodes) {
        return {}; // todo: fix?
      }

      if (baseNode.type === 'compound') {
        var childStateNode = childStateNodes[0];

        if (childStateNode) {
          if (isLeafNode(childStateNode)) {
            return childStateNode.key;
          }
        } else {
          return {};
        }
      }

      var stateValue = {};
      childStateNodes.forEach(function (csn) {
        stateValue[csn.key] = getValueFromAdj(csn, adjList);
      });
      return stateValue;
    }

    function getAdjList(configuration) {
      var e_5, _a;

      var adjList = new Map();

      try {
        for (var configuration_4 = __values(configuration), configuration_4_1 = configuration_4.next(); !configuration_4_1.done; configuration_4_1 = configuration_4.next()) {
          var s = configuration_4_1.value;

          if (!adjList.has(s)) {
            adjList.set(s, []);
          }

          if (s.parent) {
            if (!adjList.has(s.parent)) {
              adjList.set(s.parent, []);
            }

            adjList.get(s.parent).push(s);
          }
        }
      } catch (e_5_1) {
        e_5 = {
          error: e_5_1
        };
      } finally {
        try {
          if (configuration_4_1 && !configuration_4_1.done && (_a = configuration_4.return)) _a.call(configuration_4);
        } finally {
          if (e_5) throw e_5.error;
        }
      }

      return adjList;
    }

    function getValue(rootNode, configuration) {
      var config = getConfiguration([rootNode], configuration);
      return getValueFromAdj(rootNode, getAdjList(config));
    }

    function has(iterable, item) {
      if (Array.isArray(iterable)) {
        return iterable.some(function (member) {
          return member === item;
        });
      }

      if (iterable instanceof Set) {
        return iterable.has(item);
      }

      return false; // TODO: fix
    }

    function nextEvents(configuration) {
      return flatten(__spread(new Set(configuration.map(function (sn) {
        return sn.ownEvents;
      }))));
    }

    function isInFinalState(configuration, stateNode) {
      if (stateNode.type === 'compound') {
        return getChildren(stateNode).some(function (s) {
          return s.type === 'final' && has(configuration, s);
        });
      }

      if (stateNode.type === 'parallel') {
        return getChildren(stateNode).every(function (sn) {
          return isInFinalState(configuration, sn);
        });
      }

      return false;
    }

    function stateValuesEqual(a, b) {
      if (a === b) {
        return true;
      }

      if (a === undefined || b === undefined) {
        return false;
      }

      if (isString(a) || isString(b)) {
        return a === b;
      }

      var aKeys = keys(a);
      var bKeys = keys(b);
      return aKeys.length === bKeys.length && aKeys.every(function (key) {
        return stateValuesEqual(a[key], b[key]);
      });
    }

    function isState(state) {
      if (isString(state)) {
        return false;
      }

      return 'value' in state && 'history' in state;
    }

    function bindActionToState(action, state) {
      var exec = action.exec;

      var boundAction = __assign(__assign({}, action), {
        exec: exec !== undefined ? function () {
          return exec(state.context, state.event, {
            action: action,
            state: state,
            _event: state._event
          });
        } : undefined
      });

      return boundAction;
    }

    var State =
    /*#__PURE__*/

    /** @class */
    function () {
      /**
       * Creates a new State instance.
       * @param value The state value
       * @param context The extended state
       * @param historyValue The tree representing historical values of the state nodes
       * @param history The previous state
       * @param actions An array of action objects to execute as side-effects
       * @param activities A mapping of activities and whether they are started (`true`) or stopped (`false`).
       * @param meta
       * @param events Internal event queue. Should be empty with run-to-completion semantics.
       * @param configuration
       */
      function State(config) {
        this.actions = [];
        this.activities = EMPTY_ACTIVITY_MAP;
        this.meta = {};
        this.events = [];
        this.value = config.value;
        this.context = config.context;
        this._event = config._event;
        this._sessionid = config._sessionid;
        this.event = this._event.data;
        this.historyValue = config.historyValue;
        this.history = config.history;
        this.actions = config.actions || [];
        this.activities = config.activities || EMPTY_ACTIVITY_MAP;
        this.meta = config.meta || {};
        this.events = config.events || [];
        this.matches = this.matches.bind(this);
        this.toStrings = this.toStrings.bind(this);
        this.configuration = config.configuration;
        this.transitions = config.transitions;
        this.children = config.children;
        this.done = !!config.done;
        Object.defineProperty(this, 'nextEvents', {
          get: function () {
            return nextEvents(config.configuration);
          }
        });
      }
      /**
       * Creates a new State instance for the given `stateValue` and `context`.
       * @param stateValue
       * @param context
       */


      State.from = function (stateValue, context) {
        if (stateValue instanceof State) {
          if (stateValue.context !== context) {
            return new State({
              value: stateValue.value,
              context: context,
              _event: stateValue._event,
              _sessionid: null,
              historyValue: stateValue.historyValue,
              history: stateValue.history,
              actions: [],
              activities: stateValue.activities,
              meta: {},
              events: [],
              configuration: [],
              transitions: [],
              children: {}
            });
          }

          return stateValue;
        }

        var _event = initEvent;
        return new State({
          value: stateValue,
          context: context,
          _event: _event,
          _sessionid: null,
          historyValue: undefined,
          history: undefined,
          actions: [],
          activities: undefined,
          meta: undefined,
          events: [],
          configuration: [],
          transitions: [],
          children: {}
        });
      };
      /**
       * Creates a new State instance for the given `config`.
       * @param config The state config
       */


      State.create = function (config) {
        return new State(config);
      };
      /**
       * Creates a new `State` instance for the given `stateValue` and `context` with no actions (side-effects).
       * @param stateValue
       * @param context
       */


      State.inert = function (stateValue, context) {
        if (stateValue instanceof State) {
          if (!stateValue.actions.length) {
            return stateValue;
          }

          var _event = initEvent;
          return new State({
            value: stateValue.value,
            context: context,
            _event: _event,
            _sessionid: null,
            historyValue: stateValue.historyValue,
            history: stateValue.history,
            activities: stateValue.activities,
            configuration: stateValue.configuration,
            transitions: [],
            children: {}
          });
        }

        return State.from(stateValue, context);
      };
      /**
       * Returns an array of all the string leaf state node paths.
       * @param stateValue
       * @param delimiter The character(s) that separate each subpath in the string state node path.
       */


      State.prototype.toStrings = function (stateValue, delimiter) {
        var _this = this;

        if (stateValue === void 0) {
          stateValue = this.value;
        }

        if (delimiter === void 0) {
          delimiter = '.';
        }

        if (isString(stateValue)) {
          return [stateValue];
        }

        var valueKeys = keys(stateValue);
        return valueKeys.concat.apply(valueKeys, __spread(valueKeys.map(function (key) {
          return _this.toStrings(stateValue[key], delimiter).map(function (s) {
            return key + delimiter + s;
          });
        })));
      };

      State.prototype.toJSON = function () {
        var _a = this,
            configuration = _a.configuration,
            transitions = _a.transitions,
            jsonValues = __rest(_a, ["configuration", "transitions"]);

        return jsonValues;
      };
      /**
       * Whether the current state value is a subset of the given parent state value.
       * @param parentStateValue
       */


      State.prototype.matches = function (parentStateValue) {
        return matchesState(parentStateValue, this.value);
      };

      return State;
    }();

    function createNullActor(id) {
      return {
        id: id,
        send: function () {
          return void 0;
        },
        subscribe: function () {
          return {
            unsubscribe: function () {
              return void 0;
            }
          };
        },
        toJSON: function () {
          return {
            id: id
          };
        }
      };
    }
    /**
     * Creates a null actor that is able to be invoked given the provided
     * invocation information in its `.meta` value.
     *
     * @param invokeDefinition The meta information needed to invoke the actor.
     */


    function createInvocableActor(invokeDefinition) {
      var tempActor = createNullActor(invokeDefinition.id);
      tempActor.meta = invokeDefinition;
      return tempActor;
    }

    function isActor(item) {
      try {
        return typeof item.send === 'function';
      } catch (e) {
        return false;
      }
    }

    var NULL_EVENT = '';
    var STATE_IDENTIFIER = '#';
    var WILDCARD = '*';
    var EMPTY_OBJECT = {};

    var isStateId = function (str) {
      return str[0] === STATE_IDENTIFIER;
    };

    var createDefaultOptions = function () {
      return {
        actions: {},
        guards: {},
        services: {},
        activities: {},
        delays: {}
      };
    };

    var StateNode =
    /*#__PURE__*/

    /** @class */
    function () {
      function StateNode(
      /**
       * The raw config used to create the machine.
       */
      config, options,
      /**
       * The initial extended state
       */
      context) {
        var _this = this;

        this.config = config;
        this.context = context;
        /**
         * The order this state node appears. Corresponds to the implicit SCXML document order.
         */

        this.order = -1;
        this.__xstatenode = true;
        this.__cache = {
          events: undefined,
          relativeValue: new Map(),
          initialStateValue: undefined,
          initialState: undefined,
          on: undefined,
          transitions: undefined,
          candidates: {},
          delayedTransitions: undefined
        };
        this.idMap = {};
        this.options = Object.assign(createDefaultOptions(), options);
        this.parent = this.options._parent;
        this.key = this.config.key || this.options._key || this.config.id || '(machine)';
        this.machine = this.parent ? this.parent.machine : this;
        this.path = this.parent ? this.parent.path.concat(this.key) : [];
        this.delimiter = this.config.delimiter || (this.parent ? this.parent.delimiter : STATE_DELIMITER);
        this.id = this.config.id || __spread([this.machine.key], this.path).join(this.delimiter);
        this.version = this.parent ? this.parent.version : this.config.version;
        this.type = this.config.type || (this.config.parallel ? 'parallel' : this.config.states && keys(this.config.states).length ? 'compound' : this.config.history ? 'history' : 'atomic');

        this.initial = this.config.initial;
        this.states = this.config.states ? mapValues(this.config.states, function (stateConfig, key) {
          var _a;

          var stateNode = new StateNode(stateConfig, {
            _parent: _this,
            _key: key
          });
          Object.assign(_this.idMap, __assign((_a = {}, _a[stateNode.id] = stateNode, _a), stateNode.idMap));
          return stateNode;
        }) : EMPTY_OBJECT; // Document order

        var order = 0;

        function dfs(stateNode) {
          var e_1, _a;

          stateNode.order = order++;

          try {
            for (var _b = __values(getChildren(stateNode)), _c = _b.next(); !_c.done; _c = _b.next()) {
              var child = _c.value;
              dfs(child);
            }
          } catch (e_1_1) {
            e_1 = {
              error: e_1_1
            };
          } finally {
            try {
              if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            } finally {
              if (e_1) throw e_1.error;
            }
          }
        }

        dfs(this); // History config

        this.history = this.config.history === true ? 'shallow' : this.config.history || false;
        this._transient = !this.config.on ? false : Array.isArray(this.config.on) ? this.config.on.some(function (_a) {
          var event = _a.event;
          return event === NULL_EVENT;
        }) : NULL_EVENT in this.config.on;
        this.strict = !!this.config.strict; // TODO: deprecate (entry)

        this.onEntry = toArray(this.config.entry || this.config.onEntry).map(function (action) {
          return toActionObject(action);
        }); // TODO: deprecate (exit)

        this.onExit = toArray(this.config.exit || this.config.onExit).map(function (action) {
          return toActionObject(action);
        });
        this.meta = this.config.meta;
        this.data = this.type === 'final' ? this.config.data : undefined;
        this.invoke = toArray(this.config.invoke).map(function (invokeConfig, i) {
          var _a, _b;

          if (isMachine(invokeConfig)) {
            _this.machine.options.services = __assign((_a = {}, _a[invokeConfig.id] = invokeConfig, _a), _this.machine.options.services);
            return {
              type: invoke,
              src: invokeConfig.id,
              id: invokeConfig.id
            };
          } else if (typeof invokeConfig.src !== 'string') {
            var invokeSrc = _this.id + ":invocation[" + i + "]"; // TODO: util function

            _this.machine.options.services = __assign((_b = {}, _b[invokeSrc] = invokeConfig.src, _b), _this.machine.options.services);
            return __assign(__assign({
              type: invoke,
              id: invokeSrc
            }, invokeConfig), {
              src: invokeSrc
            });
          } else {
            return __assign(__assign({}, invokeConfig), {
              type: invoke,
              id: invokeConfig.id || invokeConfig.src,
              src: invokeConfig.src
            });
          }
        });
        this.activities = toArray(this.config.activities).concat(this.invoke).map(function (activity) {
          return toActivityDefinition(activity);
        });
        this.transition = this.transition.bind(this);
      }

      StateNode.prototype._init = function () {
        if (this.__cache.transitions) {
          return;
        }

        getAllStateNodes(this).forEach(function (stateNode) {
          return stateNode.on;
        });
      };
      /**
       * Clones this state machine with custom options and context.
       *
       * @param options Options (actions, guards, activities, services) to recursively merge with the existing options.
       * @param context Custom context (will override predefined context)
       */


      StateNode.prototype.withConfig = function (options, context) {
        if (context === void 0) {
          context = this.context;
        }

        var _a = this.options,
            actions = _a.actions,
            activities = _a.activities,
            guards = _a.guards,
            services = _a.services,
            delays = _a.delays;
        return new StateNode(this.config, {
          actions: __assign(__assign({}, actions), options.actions),
          activities: __assign(__assign({}, activities), options.activities),
          guards: __assign(__assign({}, guards), options.guards),
          services: __assign(__assign({}, services), options.services),
          delays: __assign(__assign({}, delays), options.delays)
        }, context);
      };
      /**
       * Clones this state machine with custom context.
       *
       * @param context Custom context (will override predefined context, not recursive)
       */


      StateNode.prototype.withContext = function (context) {
        return new StateNode(this.config, this.options, context);
      };

      Object.defineProperty(StateNode.prototype, "definition", {
        /**
         * The well-structured state node definition.
         */
        get: function () {
          return {
            id: this.id,
            key: this.key,
            version: this.version,
            type: this.type,
            initial: this.initial,
            history: this.history,
            states: mapValues(this.states, function (state) {
              return state.definition;
            }),
            on: this.on,
            transitions: this.transitions,
            onEntry: this.onEntry,
            onExit: this.onExit,
            activities: this.activities || [],
            meta: this.meta,
            order: this.order || -1,
            data: this.data,
            invoke: this.invoke
          };
        },
        enumerable: true,
        configurable: true
      });

      StateNode.prototype.toJSON = function () {
        return this.definition;
      };

      Object.defineProperty(StateNode.prototype, "on", {
        /**
         * The mapping of events to transitions.
         */
        get: function () {
          if (this.__cache.on) {
            return this.__cache.on;
          }

          var transitions = this.transitions;
          return this.__cache.on = transitions.reduce(function (map, transition) {
            map[transition.eventType] = map[transition.eventType] || [];
            map[transition.eventType].push(transition);
            return map;
          }, {});
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(StateNode.prototype, "after", {
        get: function () {
          return this.__cache.delayedTransitions || (this.__cache.delayedTransitions = this.getDelayedTransitions(), this.__cache.delayedTransitions);
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(StateNode.prototype, "transitions", {
        /**
         * All the transitions that can be taken from this state node.
         */
        get: function () {
          return this.__cache.transitions || (this.__cache.transitions = this.formatTransitions(), this.__cache.transitions);
        },
        enumerable: true,
        configurable: true
      });

      StateNode.prototype.getCandidates = function (eventName) {
        if (this.__cache.candidates[eventName]) {
          return this.__cache.candidates[eventName];
        }

        var transient = eventName === NULL_EVENT;
        var candidates = this.transitions.filter(function (transition) {
          var sameEventType = transition.eventType === eventName; // null events should only match against eventless transitions

          return transient ? sameEventType : sameEventType || transition.eventType === WILDCARD;
        });
        this.__cache.candidates[eventName] = candidates;
        return candidates;
      };
      /**
       * All delayed transitions from the config.
       */


      StateNode.prototype.getDelayedTransitions = function () {
        var _this = this;

        var afterConfig = this.config.after;

        if (!afterConfig) {
          return [];
        }

        var mutateEntryExit = function (delay, i) {
          var delayRef = isFunction(delay) ? _this.id + ":delay[" + i + "]" : delay;
          var eventType = after$1(delayRef, _this.id);

          _this.onEntry.push(send$1(eventType, {
            delay: delay
          }));

          _this.onExit.push(cancel$1(eventType));

          return eventType;
        };

        var delayedTransitions = isArray(afterConfig) ? afterConfig.map(function (transition, i) {
          var eventType = mutateEntryExit(transition.delay, i);
          return __assign(__assign({}, transition), {
            event: eventType
          });
        }) : flatten(keys(afterConfig).map(function (delay, i) {
          var configTransition = afterConfig[delay];
          var resolvedTransition = isString(configTransition) ? {
            target: configTransition
          } : configTransition;
          var resolvedDelay = !isNaN(+delay) ? +delay : delay;
          var eventType = mutateEntryExit(resolvedDelay, i);
          return toArray(resolvedTransition).map(function (transition) {
            return __assign(__assign({}, transition), {
              event: eventType,
              delay: resolvedDelay
            });
          });
        }));
        return delayedTransitions.map(function (delayedTransition) {
          var delay = delayedTransition.delay;
          return __assign(__assign({}, _this.formatTransition(delayedTransition)), {
            delay: delay
          });
        });
      };
      /**
       * Returns the state nodes represented by the current state value.
       *
       * @param state The state value or State instance
       */


      StateNode.prototype.getStateNodes = function (state) {
        var _a;

        var _this = this;

        if (!state) {
          return [];
        }

        var stateValue = state instanceof State ? state.value : toStateValue(state, this.delimiter);

        if (isString(stateValue)) {
          var initialStateValue = this.getStateNode(stateValue).initial;
          return initialStateValue !== undefined ? this.getStateNodes((_a = {}, _a[stateValue] = initialStateValue, _a)) : [this.states[stateValue]];
        }

        var subStateKeys = keys(stateValue);
        var subStateNodes = subStateKeys.map(function (subStateKey) {
          return _this.getStateNode(subStateKey);
        });
        return subStateNodes.concat(subStateKeys.reduce(function (allSubStateNodes, subStateKey) {
          var subStateNode = _this.getStateNode(subStateKey).getStateNodes(stateValue[subStateKey]);

          return allSubStateNodes.concat(subStateNode);
        }, []));
      };
      /**
       * Returns `true` if this state node explicitly handles the given event.
       *
       * @param event The event in question
       */


      StateNode.prototype.handles = function (event) {
        var eventType = getEventType(event);
        return this.events.includes(eventType);
      };
      /**
       * Resolves the given `state` to a new `State` instance relative to this machine.
       *
       * This ensures that `.events` and `.nextEvents` represent the correct values.
       *
       * @param state The state to resolve
       */


      StateNode.prototype.resolveState = function (state) {
        var configuration = Array.from(getConfiguration([], this.getStateNodes(state.value)));
        return new State(__assign(__assign({}, state), {
          value: this.resolve(state.value),
          configuration: configuration
        }));
      };

      StateNode.prototype.transitionLeafNode = function (stateValue, state, _event) {
        var stateNode = this.getStateNode(stateValue);
        var next = stateNode.next(state, _event);

        if (!next || !next.transitions.length) {
          return this.next(state, _event);
        }

        return next;
      };

      StateNode.prototype.transitionCompoundNode = function (stateValue, state, _event) {
        var subStateKeys = keys(stateValue);
        var stateNode = this.getStateNode(subStateKeys[0]);

        var next = stateNode._transition(stateValue[subStateKeys[0]], state, _event);

        if (!next || !next.transitions.length) {
          return this.next(state, _event);
        }

        return next;
      };

      StateNode.prototype.transitionParallelNode = function (stateValue, state, _event) {
        var e_2, _a;

        var transitionMap = {};

        try {
          for (var _b = __values(keys(stateValue)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var subStateKey = _c.value;
            var subStateValue = stateValue[subStateKey];

            if (!subStateValue) {
              continue;
            }

            var subStateNode = this.getStateNode(subStateKey);

            var next = subStateNode._transition(subStateValue, state, _event);

            if (next) {
              transitionMap[subStateKey] = next;
            }
          }
        } catch (e_2_1) {
          e_2 = {
            error: e_2_1
          };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          } finally {
            if (e_2) throw e_2.error;
          }
        }

        var stateTransitions = keys(transitionMap).map(function (key) {
          return transitionMap[key];
        });
        var enabledTransitions = flatten(stateTransitions.map(function (st) {
          return st.transitions;
        }));
        var willTransition = stateTransitions.some(function (st) {
          return st.transitions.length > 0;
        });

        if (!willTransition) {
          return this.next(state, _event);
        }

        var entryNodes = flatten(stateTransitions.map(function (t) {
          return t.entrySet;
        }));
        var configuration = flatten(keys(transitionMap).map(function (key) {
          return transitionMap[key].configuration;
        }));
        return {
          transitions: enabledTransitions,
          entrySet: entryNodes,
          exitSet: flatten(stateTransitions.map(function (t) {
            return t.exitSet;
          })),
          configuration: configuration,
          source: state,
          actions: flatten(keys(transitionMap).map(function (key) {
            return transitionMap[key].actions;
          }))
        };
      };

      StateNode.prototype._transition = function (stateValue, state, _event) {
        // leaf node
        if (isString(stateValue)) {
          return this.transitionLeafNode(stateValue, state, _event);
        } // hierarchical node


        if (keys(stateValue).length === 1) {
          return this.transitionCompoundNode(stateValue, state, _event);
        } // orthogonal node


        return this.transitionParallelNode(stateValue, state, _event);
      };

      StateNode.prototype.next = function (state, _event) {
        var e_3, _a;

        var _this = this;

        var eventName = _event.name;
        var actions = [];
        var nextStateNodes = [];
        var selectedTransition;

        try {
          for (var _b = __values(this.getCandidates(eventName)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var candidate = _c.value;
            var cond = candidate.cond,
                stateIn = candidate.in;
            var resolvedContext = state.context;
            var isInState = stateIn ? isString(stateIn) && isStateId(stateIn) ? // Check if in state by ID
            state.matches(toStateValue(this.getStateNodeById(stateIn).path, this.delimiter)) : // Check if in state by relative grandparent
            matchesState(toStateValue(stateIn, this.delimiter), path(this.path.slice(0, -2))(state.value)) : true;
            var guardPassed = false;

            try {
              guardPassed = !cond || this.evaluateGuard(cond, resolvedContext, _event, state);
            } catch (err) {
              throw new Error("Unable to evaluate guard '" + (cond.name || cond.type) + "' in transition for event '" + eventName + "' in state node '" + this.id + "':\n" + err.message);
            }

            if (guardPassed && isInState) {
              if (candidate.target !== undefined) {
                nextStateNodes = candidate.target;
              }

              actions.push.apply(actions, __spread(candidate.actions));
              selectedTransition = candidate;
              break;
            }
          }
        } catch (e_3_1) {
          e_3 = {
            error: e_3_1
          };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          } finally {
            if (e_3) throw e_3.error;
          }
        }

        if (!selectedTransition) {
          return undefined;
        }

        if (!nextStateNodes.length) {
          return {
            transitions: [selectedTransition],
            entrySet: [],
            exitSet: [],
            configuration: state.value ? [this] : [],
            source: state,
            actions: actions
          };
        }

        var allNextStateNodes = flatten(nextStateNodes.map(function (stateNode) {
          return _this.getRelativeStateNodes(stateNode, state.historyValue);
        }));
        var isInternal = !!selectedTransition.internal;
        var reentryNodes = isInternal ? [] : flatten(allNextStateNodes.map(function (n) {
          return _this.nodesFromChild(n);
        }));
        return {
          transitions: [selectedTransition],
          entrySet: reentryNodes,
          exitSet: isInternal ? [] : [this],
          configuration: allNextStateNodes,
          source: state,
          actions: actions
        };
      };

      StateNode.prototype.nodesFromChild = function (childStateNode) {
        if (childStateNode.escapes(this)) {
          return [];
        }

        var nodes = [];
        var marker = childStateNode;

        while (marker && marker !== this) {
          nodes.push(marker);
          marker = marker.parent;
        }

        nodes.push(this); // inclusive

        return nodes;
      };
      /**
       * Whether the given state node "escapes" this state node. If the `stateNode` is equal to or the parent of
       * this state node, it does not escape.
       */


      StateNode.prototype.escapes = function (stateNode) {
        if (this === stateNode) {
          return false;
        }

        var parent = this.parent;

        while (parent) {
          if (parent === stateNode) {
            return false;
          }

          parent = parent.parent;
        }

        return true;
      };

      StateNode.prototype.evaluateGuard = function (guard, context, _event, state) {
        var guards = this.machine.options.guards;
        var guardMeta = {
          state: state,
          cond: guard,
          _event: _event
        }; // TODO: do not hardcode!

        if (guard.type === DEFAULT_GUARD_TYPE) {
          return guard.predicate(context, _event.data, guardMeta);
        }

        var condFn = guards[guard.type];

        if (!condFn) {
          throw new Error("Guard '" + guard.type + "' is not implemented on machine '" + this.machine.id + "'.");
        }

        return condFn(context, _event.data, guardMeta);
      };

      StateNode.prototype.getActions = function (transition, currentContext, _event, prevState) {
        var e_4, _a, e_5, _b;

        var prevConfig = getConfiguration([], prevState ? this.getStateNodes(prevState.value) : [this]);
        var resolvedConfig = transition.configuration.length ? getConfiguration(prevConfig, transition.configuration) : prevConfig;

        try {
          for (var resolvedConfig_1 = __values(resolvedConfig), resolvedConfig_1_1 = resolvedConfig_1.next(); !resolvedConfig_1_1.done; resolvedConfig_1_1 = resolvedConfig_1.next()) {
            var sn = resolvedConfig_1_1.value;

            if (!has(prevConfig, sn)) {
              transition.entrySet.push(sn);
            }
          }
        } catch (e_4_1) {
          e_4 = {
            error: e_4_1
          };
        } finally {
          try {
            if (resolvedConfig_1_1 && !resolvedConfig_1_1.done && (_a = resolvedConfig_1.return)) _a.call(resolvedConfig_1);
          } finally {
            if (e_4) throw e_4.error;
          }
        }

        try {
          for (var prevConfig_1 = __values(prevConfig), prevConfig_1_1 = prevConfig_1.next(); !prevConfig_1_1.done; prevConfig_1_1 = prevConfig_1.next()) {
            var sn = prevConfig_1_1.value;

            if (!has(resolvedConfig, sn) || has(transition.exitSet, sn.parent)) {
              transition.exitSet.push(sn);
            }
          }
        } catch (e_5_1) {
          e_5 = {
            error: e_5_1
          };
        } finally {
          try {
            if (prevConfig_1_1 && !prevConfig_1_1.done && (_b = prevConfig_1.return)) _b.call(prevConfig_1);
          } finally {
            if (e_5) throw e_5.error;
          }
        }

        if (!transition.source) {
          transition.exitSet = []; // Ensure that root StateNode (machine) is entered

          transition.entrySet.push(this);
        }

        var doneEvents = flatten(transition.entrySet.map(function (sn) {
          var events = [];

          if (sn.type !== 'final') {
            return events;
          }

          var parent = sn.parent;
          events.push(done(sn.id, sn.data), // TODO: deprecate - final states should not emit done events for their own state.
          done(parent.id, sn.data ? mapContext(sn.data, currentContext, _event) : undefined));

          if (parent.parent) {
            var grandparent = parent.parent;

            if (grandparent.type === 'parallel') {
              if (getChildren(grandparent).every(function (parentNode) {
                return isInFinalState(transition.configuration, parentNode);
              })) {
                events.push(done(grandparent.id, grandparent.data));
              }
            }
          }

          return events;
        }));
        transition.exitSet.sort(function (a, b) {
          return b.order - a.order;
        });
        transition.entrySet.sort(function (a, b) {
          return a.order - b.order;
        });
        var entryStates = new Set(transition.entrySet);
        var exitStates = new Set(transition.exitSet);

        var _c = __read([flatten(Array.from(entryStates).map(function (stateNode) {
          return __spread(stateNode.activities.map(function (activity) {
            return start$1(activity);
          }), stateNode.onEntry);
        })).concat(doneEvents.map(raise$1)), flatten(Array.from(exitStates).map(function (stateNode) {
          return __spread(stateNode.onExit, stateNode.activities.map(function (activity) {
            return stop$1(activity);
          }));
        }))], 2),
            entryActions = _c[0],
            exitActions = _c[1];

        var actions = toActionObjects(exitActions.concat(transition.actions).concat(entryActions), this.machine.options.actions);
        return actions;
      };
      /**
       * Determines the next state given the current `state` and sent `event`.
       *
       * @param state The current State instance or state value
       * @param event The event that was sent at the current state
       * @param context The current context (extended state) of the current state
       */


      StateNode.prototype.transition = function (state, event, context) {
        if (state === void 0) {
          state = this.initialState;
        }

        var _event = toSCXMLEvent(event);

        var currentState;

        if (state instanceof State) {
          currentState = context === undefined ? state : this.resolveState(State.from(state, context));
        } else {
          var resolvedStateValue = isString(state) ? this.resolve(pathToStateValue(this.getResolvedPath(state))) : this.resolve(state);
          var resolvedContext = context ? context : this.machine.context;
          currentState = this.resolveState(State.from(resolvedStateValue, resolvedContext));
        }

        if (this.strict) {
          if (!this.events.includes(_event.name) && !isBuiltInEvent(_event.name)) {
            throw new Error("Machine '" + this.id + "' does not accept event '" + _event.name + "'");
          }
        }

        var stateTransition = this._transition(currentState.value, currentState, _event) || {
          transitions: [],
          configuration: [],
          entrySet: [],
          exitSet: [],
          source: currentState,
          actions: []
        };
        var prevConfig = getConfiguration([], this.getStateNodes(currentState.value));
        var resolvedConfig = stateTransition.configuration.length ? getConfiguration(prevConfig, stateTransition.configuration) : prevConfig;
        stateTransition.configuration = __spread(resolvedConfig);
        return this.resolveTransition(stateTransition, currentState, _event);
      };

      StateNode.prototype.resolveRaisedTransition = function (state, _event, originalEvent) {
        var _a;

        var currentActions = state.actions;
        state = this.transition(state, _event); // Save original event to state

        state._event = originalEvent;
        state.event = originalEvent.data;

        (_a = state.actions).unshift.apply(_a, __spread(currentActions));

        return state;
      };

      StateNode.prototype.resolveTransition = function (stateTransition, currentState, _event, context) {
        var e_6, _a;

        var _this = this;

        if (_event === void 0) {
          _event = initEvent;
        }

        if (context === void 0) {
          context = this.machine.context;
        }

        var configuration = stateTransition.configuration; // Transition will "apply" if:
        // - this is the initial state (there is no current state)
        // - OR there are transitions

        var willTransition = !currentState || stateTransition.transitions.length > 0;
        var resolvedStateValue = willTransition ? getValue(this.machine, configuration) : undefined;
        var historyValue = currentState ? currentState.historyValue ? currentState.historyValue : stateTransition.source ? this.machine.historyValue(currentState.value) : undefined : undefined;
        var currentContext = currentState ? currentState.context : context;
        var actions = this.getActions(stateTransition, currentContext, _event, currentState);
        var activities = currentState ? __assign({}, currentState.activities) : {};

        try {
          for (var actions_1 = __values(actions), actions_1_1 = actions_1.next(); !actions_1_1.done; actions_1_1 = actions_1.next()) {
            var action = actions_1_1.value;

            if (action.type === start) {
              activities[action.activity.type] = action;
            } else if (action.type === stop) {
              activities[action.activity.type] = false;
            }
          }
        } catch (e_6_1) {
          e_6 = {
            error: e_6_1
          };
        } finally {
          try {
            if (actions_1_1 && !actions_1_1.done && (_a = actions_1.return)) _a.call(actions_1);
          } finally {
            if (e_6) throw e_6.error;
          }
        }

        var _b = __read(partition(actions, function (action) {
          return action.type === assign$1;
        }), 2),
            assignActions = _b[0],
            otherActions = _b[1];

        var updatedContext = assignActions.length ? updateContext(currentContext, _event, assignActions, currentState) : currentContext;
        var resolvedActions = flatten(otherActions.map(function (actionObject) {
          switch (actionObject.type) {
            case raise:
              return resolveRaise(actionObject);

            case send:
              var sendAction = resolveSend(actionObject, updatedContext, _event, _this.machine.options.delays); // TODO: fix ActionTypes.Init

              return sendAction;

            case log:
              return resolveLog(actionObject, updatedContext, _event);

            case pure:
              return actionObject.get(updatedContext, _event.data) || [];

            default:
              return toActionObject(actionObject, _this.options.actions);
          }
        }));

        var _c = __read(partition(resolvedActions, function (action) {
          return action.type === raise || action.type === send && action.to === SpecialTargets.Internal;
        }), 2),
            raisedEvents = _c[0],
            nonRaisedActions = _c[1];

        var invokeActions = resolvedActions.filter(function (action) {
          return action.type === start && action.activity.type === invoke;
        });
        var children = invokeActions.reduce(function (acc, action) {
          acc[action.activity.id] = createInvocableActor(action.activity);
          return acc;
        }, currentState ? __assign({}, currentState.children) : {});
        var resolvedConfiguration = resolvedStateValue ? stateTransition.configuration : currentState ? currentState.configuration : [];
        var meta = resolvedConfiguration.reduce(function (acc, stateNode) {
          if (stateNode.meta !== undefined) {
            acc[stateNode.id] = stateNode.meta;
          }

          return acc;
        }, {});
        var isDone = isInFinalState(resolvedConfiguration, this);
        var nextState = new State({
          value: resolvedStateValue || currentState.value,
          context: updatedContext,
          _event: _event,
          // Persist _sessionid between states
          _sessionid: currentState ? currentState._sessionid : null,
          historyValue: resolvedStateValue ? historyValue ? updateHistoryValue(historyValue, resolvedStateValue) : undefined : currentState ? currentState.historyValue : undefined,
          history: !resolvedStateValue || stateTransition.source ? currentState : undefined,
          actions: resolvedStateValue ? nonRaisedActions : [],
          activities: resolvedStateValue ? activities : currentState ? currentState.activities : {},
          meta: resolvedStateValue ? meta : currentState ? currentState.meta : undefined,
          events: [],
          configuration: resolvedConfiguration,
          transitions: stateTransition.transitions,
          children: children,
          done: isDone
        });
        nextState.changed = _event.name === update$1 || !!assignActions.length; // Dispose of penultimate histories to prevent memory leaks

        var history = nextState.history;

        if (history) {
          delete history.history;
        }

        if (!resolvedStateValue) {
          return nextState;
        }

        var maybeNextState = nextState;

        if (!isDone) {
          var isTransient = this._transient || configuration.some(function (stateNode) {
            return stateNode._transient;
          });

          if (isTransient) {
            maybeNextState = this.resolveRaisedTransition(maybeNextState, {
              type: nullEvent
            }, _event);
          }

          while (raisedEvents.length) {
            var raisedEvent = raisedEvents.shift();
            maybeNextState = this.resolveRaisedTransition(maybeNextState, raisedEvent._event, _event);
          }
        } // Detect if state changed


        var changed = maybeNextState.changed || (history ? !!maybeNextState.actions.length || !!assignActions.length || typeof history.value !== typeof maybeNextState.value || !stateValuesEqual(maybeNextState.value, history.value) : undefined);
        maybeNextState.changed = changed; // Preserve original history after raised events

        maybeNextState.historyValue = nextState.historyValue;
        maybeNextState.history = history;
        return maybeNextState;
      };
      /**
       * Returns the child state node from its relative `stateKey`, or throws.
       */


      StateNode.prototype.getStateNode = function (stateKey) {
        if (isStateId(stateKey)) {
          return this.machine.getStateNodeById(stateKey);
        }

        if (!this.states) {
          throw new Error("Unable to retrieve child state '" + stateKey + "' from '" + this.id + "'; no child states exist.");
        }

        var result = this.states[stateKey];

        if (!result) {
          throw new Error("Child state '" + stateKey + "' does not exist on '" + this.id + "'");
        }

        return result;
      };
      /**
       * Returns the state node with the given `stateId`, or throws.
       *
       * @param stateId The state ID. The prefix "#" is removed.
       */


      StateNode.prototype.getStateNodeById = function (stateId) {
        var resolvedStateId = isStateId(stateId) ? stateId.slice(STATE_IDENTIFIER.length) : stateId;

        if (resolvedStateId === this.id) {
          return this;
        }

        var stateNode = this.machine.idMap[resolvedStateId];

        if (!stateNode) {
          throw new Error("Child state node '#" + resolvedStateId + "' does not exist on machine '" + this.id + "'");
        }

        return stateNode;
      };
      /**
       * Returns the relative state node from the given `statePath`, or throws.
       *
       * @param statePath The string or string array relative path to the state node.
       */


      StateNode.prototype.getStateNodeByPath = function (statePath) {
        if (typeof statePath === 'string' && isStateId(statePath)) {
          try {
            return this.getStateNodeById(statePath.slice(1));
          } catch (e) {// try individual paths
            // throw e;
          }
        }

        var arrayStatePath = toStatePath(statePath, this.delimiter).slice();
        var currentStateNode = this;

        while (arrayStatePath.length) {
          var key = arrayStatePath.shift();

          if (!key.length) {
            break;
          }

          currentStateNode = currentStateNode.getStateNode(key);
        }

        return currentStateNode;
      };
      /**
       * Resolves a partial state value with its full representation in this machine.
       *
       * @param stateValue The partial state value to resolve.
       */


      StateNode.prototype.resolve = function (stateValue) {
        var _a;

        var _this = this;

        if (!stateValue) {
          return this.initialStateValue || EMPTY_OBJECT; // TODO: type-specific properties
        }

        switch (this.type) {
          case 'parallel':
            return mapValues(this.initialStateValue, function (subStateValue, subStateKey) {
              return subStateValue ? _this.getStateNode(subStateKey).resolve(stateValue[subStateKey] || subStateValue) : EMPTY_OBJECT;
            });

          case 'compound':
            if (isString(stateValue)) {
              var subStateNode = this.getStateNode(stateValue);

              if (subStateNode.type === 'parallel' || subStateNode.type === 'compound') {
                return _a = {}, _a[stateValue] = subStateNode.initialStateValue, _a;
              }

              return stateValue;
            }

            if (!keys(stateValue).length) {
              return this.initialStateValue || {};
            }

            return mapValues(stateValue, function (subStateValue, subStateKey) {
              return subStateValue ? _this.getStateNode(subStateKey).resolve(subStateValue) : EMPTY_OBJECT;
            });

          default:
            return stateValue || EMPTY_OBJECT;
        }
      };

      StateNode.prototype.getResolvedPath = function (stateIdentifier) {
        if (isStateId(stateIdentifier)) {
          var stateNode = this.machine.idMap[stateIdentifier.slice(STATE_IDENTIFIER.length)];

          if (!stateNode) {
            throw new Error("Unable to find state node '" + stateIdentifier + "'");
          }

          return stateNode.path;
        }

        return toStatePath(stateIdentifier, this.delimiter);
      };

      Object.defineProperty(StateNode.prototype, "initialStateValue", {
        get: function () {
          var _a;

          if (this.__cache.initialStateValue) {
            return this.__cache.initialStateValue;
          }

          var initialStateValue;

          if (this.type === 'parallel') {
            initialStateValue = mapFilterValues(this.states, function (state) {
              return state.initialStateValue || EMPTY_OBJECT;
            }, function (stateNode) {
              return !(stateNode.type === 'history');
            });
          } else if (this.initial !== undefined) {
            if (!this.states[this.initial]) {
              throw new Error("Initial state '" + this.initial + "' not found on '" + this.key + "'");
            }

            initialStateValue = isLeafNode(this.states[this.initial]) ? this.initial : (_a = {}, _a[this.initial] = this.states[this.initial].initialStateValue, _a);
          }

          this.__cache.initialStateValue = initialStateValue;
          return this.__cache.initialStateValue;
        },
        enumerable: true,
        configurable: true
      });

      StateNode.prototype.getInitialState = function (stateValue, context) {
        var configuration = this.getStateNodes(stateValue);
        return this.resolveTransition({
          configuration: configuration,
          entrySet: configuration,
          exitSet: [],
          transitions: [],
          source: undefined,
          actions: []
        }, undefined, undefined, context);
      };

      Object.defineProperty(StateNode.prototype, "initialState", {
        /**
         * The initial State instance, which includes all actions to be executed from
         * entering the initial state.
         */
        get: function () {
          this._init();

          var initialStateValue = this.initialStateValue;

          if (!initialStateValue) {
            throw new Error("Cannot retrieve initial state from simple state '" + this.id + "'.");
          }

          return this.getInitialState(initialStateValue);
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(StateNode.prototype, "target", {
        /**
         * The target state value of the history state node, if it exists. This represents the
         * default state value to transition to if no history value exists yet.
         */
        get: function () {
          var target;

          if (this.type === 'history') {
            var historyConfig = this.config;

            if (isString(historyConfig.target)) {
              target = isStateId(historyConfig.target) ? pathToStateValue(this.machine.getStateNodeById(historyConfig.target).path.slice(this.path.length - 1)) : historyConfig.target;
            } else {
              target = historyConfig.target;
            }
          }

          return target;
        },
        enumerable: true,
        configurable: true
      });
      /**
       * Returns the leaf nodes from a state path relative to this state node.
       *
       * @param relativeStateId The relative state path to retrieve the state nodes
       * @param history The previous state to retrieve history
       * @param resolve Whether state nodes should resolve to initial child state nodes
       */

      StateNode.prototype.getRelativeStateNodes = function (relativeStateId, historyValue, resolve) {
        if (resolve === void 0) {
          resolve = true;
        }

        return resolve ? relativeStateId.type === 'history' ? relativeStateId.resolveHistory(historyValue) : relativeStateId.initialStateNodes : [relativeStateId];
      };

      Object.defineProperty(StateNode.prototype, "initialStateNodes", {
        get: function () {
          var _this = this;

          if (isLeafNode(this)) {
            return [this];
          } // Case when state node is compound but no initial state is defined


          if (this.type === 'compound' && !this.initial) {

            return [this];
          }

          var initialStateNodePaths = toStatePaths(this.initialStateValue);
          return flatten(initialStateNodePaths.map(function (initialPath) {
            return _this.getFromRelativePath(initialPath);
          }));
        },
        enumerable: true,
        configurable: true
      });
      /**
       * Retrieves state nodes from a relative path to this state node.
       *
       * @param relativePath The relative path from this state node
       * @param historyValue
       */

      StateNode.prototype.getFromRelativePath = function (relativePath) {
        if (!relativePath.length) {
          return [this];
        }

        var _a = __read(relativePath),
            stateKey = _a[0],
            childStatePath = _a.slice(1);

        if (!this.states) {
          throw new Error("Cannot retrieve subPath '" + stateKey + "' from node with no states");
        }

        var childStateNode = this.getStateNode(stateKey);

        if (childStateNode.type === 'history') {
          return childStateNode.resolveHistory();
        }

        if (!this.states[stateKey]) {
          throw new Error("Child state '" + stateKey + "' does not exist on '" + this.id + "'");
        }

        return this.states[stateKey].getFromRelativePath(childStatePath);
      };

      StateNode.prototype.historyValue = function (relativeStateValue) {
        if (!keys(this.states).length) {
          return undefined;
        }

        return {
          current: relativeStateValue || this.initialStateValue,
          states: mapFilterValues(this.states, function (stateNode, key) {
            if (!relativeStateValue) {
              return stateNode.historyValue();
            }

            var subStateValue = isString(relativeStateValue) ? undefined : relativeStateValue[key];
            return stateNode.historyValue(subStateValue || stateNode.initialStateValue);
          }, function (stateNode) {
            return !stateNode.history;
          })
        };
      };
      /**
       * Resolves to the historical value(s) of the parent state node,
       * represented by state nodes.
       *
       * @param historyValue
       */


      StateNode.prototype.resolveHistory = function (historyValue) {
        var _this = this;

        if (this.type !== 'history') {
          return [this];
        }

        var parent = this.parent;

        if (!historyValue) {
          var historyTarget = this.target;
          return historyTarget ? flatten(toStatePaths(historyTarget).map(function (relativeChildPath) {
            return parent.getFromRelativePath(relativeChildPath);
          })) : parent.initialStateNodes;
        }

        var subHistoryValue = nestedPath(parent.path, 'states')(historyValue).current;

        if (isString(subHistoryValue)) {
          return [parent.getStateNode(subHistoryValue)];
        }

        return flatten(toStatePaths(subHistoryValue).map(function (subStatePath) {
          return _this.history === 'deep' ? parent.getFromRelativePath(subStatePath) : [parent.states[subStatePath[0]]];
        }));
      };

      Object.defineProperty(StateNode.prototype, "stateIds", {
        /**
         * All the state node IDs of this state node and its descendant state nodes.
         */
        get: function () {
          var _this = this;

          var childStateIds = flatten(keys(this.states).map(function (stateKey) {
            return _this.states[stateKey].stateIds;
          }));
          return [this.id].concat(childStateIds);
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(StateNode.prototype, "events", {
        /**
         * All the event types accepted by this state node and its descendants.
         */
        get: function () {
          var e_7, _a, e_8, _b;

          if (this.__cache.events) {
            return this.__cache.events;
          }

          var states = this.states;
          var events = new Set(this.ownEvents);

          if (states) {
            try {
              for (var _c = __values(keys(states)), _d = _c.next(); !_d.done; _d = _c.next()) {
                var stateId = _d.value;
                var state = states[stateId];

                if (state.states) {
                  try {
                    for (var _e = (e_8 = void 0, __values(state.events)), _f = _e.next(); !_f.done; _f = _e.next()) {
                      var event_1 = _f.value;
                      events.add("" + event_1);
                    }
                  } catch (e_8_1) {
                    e_8 = {
                      error: e_8_1
                    };
                  } finally {
                    try {
                      if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    } finally {
                      if (e_8) throw e_8.error;
                    }
                  }
                }
              }
            } catch (e_7_1) {
              e_7 = {
                error: e_7_1
              };
            } finally {
              try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
              } finally {
                if (e_7) throw e_7.error;
              }
            }
          }

          return this.__cache.events = Array.from(events);
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(StateNode.prototype, "ownEvents", {
        /**
         * All the events that have transitions directly from this state node.
         *
         * Excludes any inert events.
         */
        get: function () {
          var events = new Set(this.transitions.filter(function (transition) {
            return !(!transition.target && !transition.actions.length && transition.internal);
          }).map(function (transition) {
            return transition.eventType;
          }));
          return Array.from(events);
        },
        enumerable: true,
        configurable: true
      });

      StateNode.prototype.resolveTarget = function (_target) {
        var _this = this;

        if (_target === undefined) {
          // an undefined target signals that the state node should not transition from that state when receiving that event
          return undefined;
        }

        return _target.map(function (target) {
          if (!isString(target)) {
            return target;
          }

          var isInternalTarget = target[0] === _this.delimiter; // If internal target is defined on machine,
          // do not include machine key on target

          if (isInternalTarget && !_this.parent) {
            return _this.getStateNodeByPath(target.slice(1));
          }

          var resolvedTarget = isInternalTarget ? _this.key + target : target;

          if (_this.parent) {
            try {
              var targetStateNode = _this.parent.getStateNodeByPath(resolvedTarget);

              return targetStateNode;
            } catch (err) {
              throw new Error("Invalid transition definition for state node '" + _this.id + "':\n" + err.message);
            }
          } else {
            return _this.getStateNodeByPath(resolvedTarget);
          }
        });
      };

      StateNode.prototype.formatTransition = function (transitionConfig) {
        var _this = this;

        var normalizedTarget = normalizeTarget(transitionConfig.target);
        var internal = 'internal' in transitionConfig ? transitionConfig.internal : normalizedTarget ? normalizedTarget.some(function (_target) {
          return isString(_target) && _target[0] === _this.delimiter;
        }) : true;
        var guards = this.machine.options.guards;
        var target = this.resolveTarget(normalizedTarget);
        return __assign(__assign({}, transitionConfig), {
          actions: toActionObjects(toArray(transitionConfig.actions)),
          cond: toGuard(transitionConfig.cond, guards),
          target: target,
          source: this,
          internal: internal,
          eventType: transitionConfig.event
        });
      };

      StateNode.prototype.formatTransitions = function () {
        var e_9, _a;

        var _this = this;

        var onConfig;

        if (!this.config.on) {
          onConfig = [];
        } else if (Array.isArray(this.config.on)) {
          onConfig = this.config.on;
        } else {
          var _b = this.config.on,
              _c = WILDCARD,
              _d = _b[_c],
              wildcardConfigs = _d === void 0 ? [] : _d,
              strictOnConfigs_1 = __rest(_b, [typeof _c === "symbol" ? _c : _c + ""]);

          onConfig = flatten(keys(strictOnConfigs_1).map(function (key) {
            var arrayified = toTransitionConfigArray(key, strictOnConfigs_1[key]);

            return arrayified;
          }).concat(toTransitionConfigArray(WILDCARD, wildcardConfigs)));
        }

        var doneConfig = this.config.onDone ? toTransitionConfigArray(String(done(this.id)), this.config.onDone) : [];
        var invokeConfig = flatten(this.invoke.map(function (invokeDef) {
          var settleTransitions = [];

          if (invokeDef.onDone) {
            settleTransitions.push.apply(settleTransitions, __spread(toTransitionConfigArray(String(doneInvoke(invokeDef.id)), invokeDef.onDone)));
          }

          if (invokeDef.onError) {
            settleTransitions.push.apply(settleTransitions, __spread(toTransitionConfigArray(String(error$1(invokeDef.id)), invokeDef.onError)));
          }

          return settleTransitions;
        }));
        var delayedTransitions = this.after;
        var formattedTransitions = flatten(__spread(doneConfig, invokeConfig, onConfig).map(function (transitionConfig) {
          return toArray(transitionConfig).map(function (transition) {
            return _this.formatTransition(transition);
          });
        }));

        try {
          for (var delayedTransitions_1 = __values(delayedTransitions), delayedTransitions_1_1 = delayedTransitions_1.next(); !delayedTransitions_1_1.done; delayedTransitions_1_1 = delayedTransitions_1.next()) {
            var delayedTransition = delayedTransitions_1_1.value;
            formattedTransitions.push(delayedTransition);
          }
        } catch (e_9_1) {
          e_9 = {
            error: e_9_1
          };
        } finally {
          try {
            if (delayedTransitions_1_1 && !delayedTransitions_1_1.done && (_a = delayedTransitions_1.return)) _a.call(delayedTransitions_1);
          } finally {
            if (e_9) throw e_9.error;
          }
        }

        return formattedTransitions;
      };

      return StateNode;
    }();

    function Machine(config, options, initialContext) {
      if (initialContext === void 0) {
        initialContext = config.context;
      }

      var resolvedInitialContext = typeof initialContext === 'function' ? initialContext() : initialContext;
      return new StateNode(config, options, resolvedInitialContext);
    }

    var defaultOptions = {
      deferEvents: false
    };

    var Scheduler =
    /*#__PURE__*/

    /** @class */
    function () {
      function Scheduler(options) {
        this.processingEvent = false;
        this.queue = [];
        this.initialized = false;
        this.options = __assign(__assign({}, defaultOptions), options);
      }

      Scheduler.prototype.initialize = function (callback) {
        this.initialized = true;

        if (callback) {
          if (!this.options.deferEvents) {
            this.schedule(callback);
            return;
          }

          this.process(callback);
        }

        this.flushEvents();
      };

      Scheduler.prototype.schedule = function (task) {
        if (!this.initialized || this.processingEvent) {
          this.queue.push(task);
          return;
        }

        if (this.queue.length !== 0) {
          throw new Error('Event queue should be empty when it is not processing events');
        }

        this.process(task);
        this.flushEvents();
      };

      Scheduler.prototype.clear = function () {
        this.queue = [];
      };

      Scheduler.prototype.flushEvents = function () {
        var nextCallback = this.queue.shift();

        while (nextCallback) {
          this.process(nextCallback);
          nextCallback = this.queue.shift();
        }
      };

      Scheduler.prototype.process = function (callback) {
        this.processingEvent = true;

        try {
          callback();
        } catch (e) {
          // there is no use to keep the future events
          // as the situation is not anymore the same
          this.clear();
          throw e;
        } finally {
          this.processingEvent = false;
        }
      };

      return Scheduler;
    }();

    var children$1 =
    /*#__PURE__*/
    new Map();
    var sessionIdIndex = 0;
    var registry = {
      bookId: function () {
        return "x:" + sessionIdIndex++;
      },
      register: function (id, actor) {
        children$1.set(id, actor);
        return id;
      },
      get: function (id) {
        return children$1.get(id);
      },
      free: function (id) {
        children$1.delete(id);
      }
    };

    var DEFAULT_SPAWN_OPTIONS = {
      sync: false,
      autoForward: false
    };
    /**
     * Maintains a stack of the current service in scope.
     * This is used to provide the correct service to spawn().
     *
     * @private
     */

    var withServiceScope =
    /*#__PURE__*/
    function () {
      var serviceStack = [];
      return function (service, fn) {
        service && serviceStack.push(service);
        var result = fn(service || serviceStack[serviceStack.length - 1]);
        service && serviceStack.pop();
        return result;
      };
    }();

    var InterpreterStatus;

    (function (InterpreterStatus) {
      InterpreterStatus[InterpreterStatus["NotStarted"] = 0] = "NotStarted";
      InterpreterStatus[InterpreterStatus["Running"] = 1] = "Running";
      InterpreterStatus[InterpreterStatus["Stopped"] = 2] = "Stopped";
    })(InterpreterStatus || (InterpreterStatus = {}));

    var Interpreter =
    /*#__PURE__*/

    /** @class */
    function () {
      /**
       * Creates a new Interpreter instance (i.e., service) for the given machine with the provided options, if any.
       *
       * @param machine The machine to be interpreted
       * @param options Interpreter options
       */
      function Interpreter(machine, options) {
        var _this = this;

        if (options === void 0) {
          options = Interpreter.defaultOptions;
        }

        this.machine = machine;
        this.scheduler = new Scheduler();
        this.delayedEventsMap = {};
        this.listeners = new Set();
        this.contextListeners = new Set();
        this.stopListeners = new Set();
        this.doneListeners = new Set();
        this.eventListeners = new Set();
        this.sendListeners = new Set();
        /**
         * Whether the service is started.
         */

        this.initialized = false;
        this._status = InterpreterStatus.NotStarted;
        this.children = new Map();
        this.forwardTo = new Set();
        /**
         * Alias for Interpreter.prototype.start
         */

        this.init = this.start;
        /**
         * Sends an event to the running interpreter to trigger a transition.
         *
         * An array of events (batched) can be sent as well, which will send all
         * batched events to the running interpreter. The listeners will be
         * notified only **once** when all events are processed.
         *
         * @param event The event(s) to send
         */

        this.send = function (event, payload) {
          if (isArray(event)) {
            _this.batch(event);

            return _this.state;
          }

          var _event = toSCXMLEvent(toEventObject(event, payload));

          if (_this._status === InterpreterStatus.Stopped) {

            return _this.state;
          }

          if (_this._status === InterpreterStatus.NotStarted && _this.options.deferEvents) ; else if (_this._status !== InterpreterStatus.Running) {
            throw new Error("Event \"" + _event.name + "\" was sent to uninitialized service \"" + _this.machine.id + "\". Make sure .start() is called for this service, or set { deferEvents: true } in the service options.\nEvent: " + JSON.stringify(_event.data));
          }

          _this.scheduler.schedule(function () {
            // Forward copy of event to child actors
            _this.forward(_event);

            var nextState = _this.nextState(_event);

            _this.update(nextState, _event);
          });

          return _this._state; // TODO: deprecate (should return void)
          // tslint:disable-next-line:semicolon
        };

        this.sendTo = function (event, to) {
          var isParent = _this.parent && (to === SpecialTargets.Parent || _this.parent.id === to);
          var target = isParent ? _this.parent : isActor(to) ? to : _this.children.get(to) || registry.get(to);

          if (!target) {
            if (!isParent) {
              throw new Error("Unable to send event to child '" + to + "' from service '" + _this.id + "'.");
            } // tslint:disable-next-line:no-console

            return;
          }

          if ('machine' in target) {
            // Send SCXML events to machines
            target.send(__assign(__assign({}, event), {
              name: event.name === error ? "" + error$1(_this.id) : event.name,
              origin: _this.sessionId
            }));
          } else {
            // Send normal events to other targets
            target.send(event.data);
          }
        };

        var resolvedOptions = __assign(__assign({}, Interpreter.defaultOptions), options);

        var clock = resolvedOptions.clock,
            logger = resolvedOptions.logger,
            parent = resolvedOptions.parent,
            id = resolvedOptions.id;
        var resolvedId = id !== undefined ? id : machine.id;
        this.id = resolvedId;
        this.logger = logger;
        this.clock = clock;
        this.parent = parent;
        this.options = resolvedOptions;
        this.scheduler = new Scheduler({
          deferEvents: this.options.deferEvents
        });
        this.sessionId = registry.bookId();
      }

      Object.defineProperty(Interpreter.prototype, "initialState", {
        get: function () {
          var _this = this;

          if (this._initialState) {
            return this._initialState;
          }

          return withServiceScope(this, function () {
            _this._initialState = _this.machine.initialState;
            return _this._initialState;
          });
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(Interpreter.prototype, "state", {
        get: function () {

          return this._state;
        },
        enumerable: true,
        configurable: true
      });
      /**
       * Executes the actions of the given state, with that state's `context` and `event`.
       *
       * @param state The state whose actions will be executed
       * @param actionsConfig The action implementations to use
       */

      Interpreter.prototype.execute = function (state, actionsConfig) {
        var e_1, _a;

        try {
          for (var _b = __values(state.actions), _c = _b.next(); !_c.done; _c = _b.next()) {
            var action = _c.value;
            this.exec(action, state, actionsConfig);
          }
        } catch (e_1_1) {
          e_1 = {
            error: e_1_1
          };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
      };

      Interpreter.prototype.update = function (state, _event) {
        var e_2, _a, e_3, _b, e_4, _c, e_5, _d;

        var _this = this; // Attach session ID to state


        state._sessionid = this.sessionId; // Update state

        this._state = state; // Execute actions

        if (this.options.execute) {
          this.execute(this.state);
        } // Dev tools


        if (this.devTools) {
          this.devTools.send(_event.data, state);
        } // Execute listeners


        if (state.event) {
          try {
            for (var _e = __values(this.eventListeners), _f = _e.next(); !_f.done; _f = _e.next()) {
              var listener = _f.value;
              listener(state.event);
            }
          } catch (e_2_1) {
            e_2 = {
              error: e_2_1
            };
          } finally {
            try {
              if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            } finally {
              if (e_2) throw e_2.error;
            }
          }
        }

        try {
          for (var _g = __values(this.listeners), _h = _g.next(); !_h.done; _h = _g.next()) {
            var listener = _h.value;
            listener(state, state.event);
          }
        } catch (e_3_1) {
          e_3 = {
            error: e_3_1
          };
        } finally {
          try {
            if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
          } finally {
            if (e_3) throw e_3.error;
          }
        }

        try {
          for (var _j = __values(this.contextListeners), _k = _j.next(); !_k.done; _k = _j.next()) {
            var contextListener = _k.value;
            contextListener(this.state.context, this.state.history ? this.state.history.context : undefined);
          }
        } catch (e_4_1) {
          e_4 = {
            error: e_4_1
          };
        } finally {
          try {
            if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
          } finally {
            if (e_4) throw e_4.error;
          }
        }

        var isDone = isInFinalState(state.configuration || [], this.machine);

        if (this.state.configuration && isDone) {
          // get final child state node
          var finalChildStateNode = state.configuration.find(function (sn) {
            return sn.type === 'final' && sn.parent === _this.machine;
          });
          var doneData = finalChildStateNode && finalChildStateNode.data ? mapContext(finalChildStateNode.data, state.context, _event) : undefined;

          try {
            for (var _l = __values(this.doneListeners), _m = _l.next(); !_m.done; _m = _l.next()) {
              var listener = _m.value;
              listener(doneInvoke(this.id, doneData));
            }
          } catch (e_5_1) {
            e_5 = {
              error: e_5_1
            };
          } finally {
            try {
              if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
            } finally {
              if (e_5) throw e_5.error;
            }
          }

          this.stop();
        }
      };
      /*
       * Adds a listener that is notified whenever a state transition happens. The listener is called with
       * the next state and the event object that caused the state transition.
       *
       * @param listener The state listener
       */


      Interpreter.prototype.onTransition = function (listener) {
        this.listeners.add(listener); // Send current state to listener

        if (this._status === InterpreterStatus.Running) {
          listener(this.state, this.state.event);
        }

        return this;
      };

      Interpreter.prototype.subscribe = function (nextListenerOrObserver, // @ts-ignore
      errorListener, completeListener) {
        var _this = this;

        if (!nextListenerOrObserver) {
          return {
            unsubscribe: function () {
              return void 0;
            }
          };
        }

        var listener;
        var resolvedCompleteListener = completeListener;

        if (typeof nextListenerOrObserver === 'function') {
          listener = nextListenerOrObserver;
        } else {
          listener = nextListenerOrObserver.next.bind(nextListenerOrObserver);
          resolvedCompleteListener = nextListenerOrObserver.complete.bind(nextListenerOrObserver);
        }

        this.listeners.add(listener); // Send current state to listener

        if (this._status === InterpreterStatus.Running) {
          listener(this.state);
        }

        if (resolvedCompleteListener) {
          this.onDone(resolvedCompleteListener);
        }

        return {
          unsubscribe: function () {
            listener && _this.listeners.delete(listener);
            resolvedCompleteListener && _this.doneListeners.delete(resolvedCompleteListener);
          }
        };
      };
      /**
       * Adds an event listener that is notified whenever an event is sent to the running interpreter.
       * @param listener The event listener
       */


      Interpreter.prototype.onEvent = function (listener) {
        this.eventListeners.add(listener);
        return this;
      };
      /**
       * Adds an event listener that is notified whenever a `send` event occurs.
       * @param listener The event listener
       */


      Interpreter.prototype.onSend = function (listener) {
        this.sendListeners.add(listener);
        return this;
      };
      /**
       * Adds a context listener that is notified whenever the state context changes.
       * @param listener The context listener
       */


      Interpreter.prototype.onChange = function (listener) {
        this.contextListeners.add(listener);
        return this;
      };
      /**
       * Adds a listener that is notified when the machine is stopped.
       * @param listener The listener
       */


      Interpreter.prototype.onStop = function (listener) {
        this.stopListeners.add(listener);
        return this;
      };
      /**
       * Adds a state listener that is notified when the statechart has reached its final state.
       * @param listener The state listener
       */


      Interpreter.prototype.onDone = function (listener) {
        this.doneListeners.add(listener);
        return this;
      };
      /**
       * Removes a listener.
       * @param listener The listener to remove
       */


      Interpreter.prototype.off = function (listener) {
        this.listeners.delete(listener);
        this.eventListeners.delete(listener);
        this.sendListeners.delete(listener);
        this.stopListeners.delete(listener);
        this.doneListeners.delete(listener);
        this.contextListeners.delete(listener);
        return this;
      };
      /**
       * Starts the interpreter from the given state, or the initial state.
       * @param initialState The state to start the statechart from
       */


      Interpreter.prototype.start = function (initialState) {
        var _this = this;

        if (this._status === InterpreterStatus.Running) {
          // Do not restart the service if it is already started
          return this;
        }

        registry.register(this.sessionId, this);
        this.initialized = true;
        this._status = InterpreterStatus.Running;
        var resolvedState = initialState === undefined ? this.initialState : withServiceScope(this, function () {
          return isState(initialState) ? _this.machine.resolveState(initialState) : _this.machine.resolveState(State.from(initialState, _this.machine.context));
        });

        if (this.options.devTools) {
          this.attachDev();
        }

        this.scheduler.initialize(function () {
          _this.update(resolvedState, initEvent);
        });
        return this;
      };
      /**
       * Stops the interpreter and unsubscribe all listeners.
       *
       * This will also notify the `onStop` listeners.
       */


      Interpreter.prototype.stop = function () {
        var e_6, _a, e_7, _b, e_8, _c, e_9, _d, e_10, _e;

        try {
          for (var _f = __values(this.listeners), _g = _f.next(); !_g.done; _g = _f.next()) {
            var listener = _g.value;
            this.listeners.delete(listener);
          }
        } catch (e_6_1) {
          e_6 = {
            error: e_6_1
          };
        } finally {
          try {
            if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
          } finally {
            if (e_6) throw e_6.error;
          }
        }

        try {
          for (var _h = __values(this.stopListeners), _j = _h.next(); !_j.done; _j = _h.next()) {
            var listener = _j.value; // call listener, then remove

            listener();
            this.stopListeners.delete(listener);
          }
        } catch (e_7_1) {
          e_7 = {
            error: e_7_1
          };
        } finally {
          try {
            if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
          } finally {
            if (e_7) throw e_7.error;
          }
        }

        try {
          for (var _k = __values(this.contextListeners), _l = _k.next(); !_l.done; _l = _k.next()) {
            var listener = _l.value;
            this.contextListeners.delete(listener);
          }
        } catch (e_8_1) {
          e_8 = {
            error: e_8_1
          };
        } finally {
          try {
            if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
          } finally {
            if (e_8) throw e_8.error;
          }
        }

        try {
          for (var _m = __values(this.doneListeners), _o = _m.next(); !_o.done; _o = _m.next()) {
            var listener = _o.value;
            this.doneListeners.delete(listener);
          }
        } catch (e_9_1) {
          e_9 = {
            error: e_9_1
          };
        } finally {
          try {
            if (_o && !_o.done && (_d = _m.return)) _d.call(_m);
          } finally {
            if (e_9) throw e_9.error;
          }
        } // Stop all children


        this.children.forEach(function (child) {
          if (isFunction(child.stop)) {
            child.stop();
          }
        });

        try {
          // Cancel all delayed events
          for (var _p = __values(keys(this.delayedEventsMap)), _q = _p.next(); !_q.done; _q = _p.next()) {
            var key = _q.value;
            this.clock.clearTimeout(this.delayedEventsMap[key]);
          }
        } catch (e_10_1) {
          e_10 = {
            error: e_10_1
          };
        } finally {
          try {
            if (_q && !_q.done && (_e = _p.return)) _e.call(_p);
          } finally {
            if (e_10) throw e_10.error;
          }
        }

        this.scheduler.clear();
        this.initialized = false;
        this._status = InterpreterStatus.Stopped;
        registry.free(this.sessionId);
        return this;
      };

      Interpreter.prototype.batch = function (events) {
        var _this = this;

        if (this._status === InterpreterStatus.NotStarted && this.options.deferEvents) ; else if (this._status !== InterpreterStatus.Running) {
          throw new Error( // tslint:disable-next-line:max-line-length
          events.length + " event(s) were sent to uninitialized service \"" + this.machine.id + "\". Make sure .start() is called for this service, or set { deferEvents: true } in the service options.");
        }

        this.scheduler.schedule(function () {
          var e_11, _a;

          var nextState = _this.state;
          var batchChanged = false;
          var batchedActions = [];

          var _loop_1 = function (event_1) {
            var _event = toSCXMLEvent(event_1);

            _this.forward(_event);

            nextState = withServiceScope(_this, function () {
              return _this.machine.transition(nextState, _event);
            });
            batchedActions.push.apply(batchedActions, __spread(nextState.actions.map(function (a) {
              return bindActionToState(a, nextState);
            })));
            batchChanged = batchChanged || !!nextState.changed;
          };

          try {
            for (var events_1 = __values(events), events_1_1 = events_1.next(); !events_1_1.done; events_1_1 = events_1.next()) {
              var event_1 = events_1_1.value;

              _loop_1(event_1);
            }
          } catch (e_11_1) {
            e_11 = {
              error: e_11_1
            };
          } finally {
            try {
              if (events_1_1 && !events_1_1.done && (_a = events_1.return)) _a.call(events_1);
            } finally {
              if (e_11) throw e_11.error;
            }
          }

          nextState.changed = batchChanged;
          nextState.actions = batchedActions;

          _this.update(nextState, toSCXMLEvent(events[events.length - 1]));
        });
      };
      /**
       * Returns a send function bound to this interpreter instance.
       *
       * @param event The event to be sent by the sender.
       */


      Interpreter.prototype.sender = function (event) {
        return this.send.bind(this, event);
      };
      /**
       * Returns the next state given the interpreter's current state and the event.
       *
       * This is a pure method that does _not_ update the interpreter's state.
       *
       * @param event The event to determine the next state
       */


      Interpreter.prototype.nextState = function (event) {
        var _this = this;

        var _event = toSCXMLEvent(event);

        if (_event.name.indexOf(errorPlatform) === 0 && !this.state.nextEvents.some(function (nextEvent) {
          return nextEvent.indexOf(errorPlatform) === 0;
        })) {
          throw _event.data.data;
        }

        var nextState = withServiceScope(this, function () {
          return _this.machine.transition(_this.state, _event);
        });
        return nextState;
      };

      Interpreter.prototype.forward = function (event) {
        var e_12, _a;

        try {
          for (var _b = __values(this.forwardTo), _c = _b.next(); !_c.done; _c = _b.next()) {
            var id = _c.value;
            var child = this.children.get(id);

            if (!child) {
              throw new Error("Unable to forward event '" + event + "' from interpreter '" + this.id + "' to nonexistant child '" + id + "'.");
            }

            child.send(event);
          }
        } catch (e_12_1) {
          e_12 = {
            error: e_12_1
          };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          } finally {
            if (e_12) throw e_12.error;
          }
        }
      };

      Interpreter.prototype.defer = function (sendAction) {
        var _this = this;

        this.delayedEventsMap[sendAction.id] = this.clock.setTimeout(function () {
          if (sendAction.to) {
            _this.sendTo(sendAction._event, sendAction.to);
          } else {
            _this.send(sendAction._event);
          }
        }, sendAction.delay);
      };

      Interpreter.prototype.cancel = function (sendId) {
        this.clock.clearTimeout(this.delayedEventsMap[sendId]);
        delete this.delayedEventsMap[sendId];
      };

      Interpreter.prototype.exec = function (action, state, actionFunctionMap) {
        var context = state.context,
            _event = state._event;
        var actionOrExec = getActionFunction(action.type, actionFunctionMap) || action.exec;
        var exec = isFunction(actionOrExec) ? actionOrExec : actionOrExec ? actionOrExec.exec : action.exec;

        if (exec) {
          try {
            return exec(context, _event.data, {
              action: action,
              state: this.state,
              _event: _event
            });
          } catch (err) {
            if (this.parent) {
              this.parent.send({
                type: 'xstate.error',
                data: err
              });
            }

            throw err;
          }
        }

        switch (action.type) {
          case send:
            var sendAction = action;

            if (typeof sendAction.delay === 'number') {
              this.defer(sendAction);
              return;
            } else {
              if (sendAction.to) {
                this.sendTo(sendAction._event, sendAction.to);
              } else {
                this.send(sendAction._event);
              }
            }

            break;

          case cancel:
            this.cancel(action.sendId);
            break;

          case start:
            {
              var activity = action.activity; // If the activity will be stopped right after it's started
              // (such as in transient states)
              // don't bother starting the activity.

              if (!this.state.activities[activity.type]) {
                break;
              } // Invoked services


              if (activity.type === ActionTypes.Invoke) {
                var serviceCreator = this.machine.options.services ? this.machine.options.services[activity.src] : undefined;
                var id = activity.id,
                    data = activity.data;

                var autoForward = 'autoForward' in activity ? activity.autoForward : !!activity.forward;

                if (!serviceCreator) {

                  return;
                }

                var source = isFunction(serviceCreator) ? serviceCreator(context, _event.data) : serviceCreator;

                if (isPromiseLike(source)) {
                  this.state.children[id] = this.spawnPromise(Promise.resolve(source), id);
                } else if (isFunction(source)) {
                  this.state.children[id] = this.spawnCallback(source, id);
                } else if (isObservable(source)) {
                  this.state.children[id] = this.spawnObservable(source, id);
                } else if (isMachine(source)) {
                  // TODO: try/catch here
                  this.state.children[id] = this.spawnMachine(data ? source.withContext(mapContext(data, context, _event)) : source, {
                    id: id,
                    autoForward: autoForward
                  });
                }
              } else {
                this.spawnActivity(activity);
              }

              break;
            }

          case stop:
            {
              this.stopChild(action.activity.id);
              break;
            }

          case log:
            var label = action.label,
                value = action.value;

            if (label) {
              this.logger(label, value);
            } else {
              this.logger(value);
            }

            break;
        }

        return undefined;
      };

      Interpreter.prototype.stopChild = function (childId) {
        var child = this.children.get(childId);

        if (!child) {
          return;
        }

        this.children.delete(childId);
        this.forwardTo.delete(childId);
        delete this.state.children[childId];

        if (isFunction(child.stop)) {
          child.stop();
        }
      };

      Interpreter.prototype.spawn = function (entity, name, options) {
        if (isPromiseLike(entity)) {
          return this.spawnPromise(Promise.resolve(entity), name);
        } else if (isFunction(entity)) {
          return this.spawnCallback(entity, name);
        } else if (isActor(entity)) {
          return this.spawnActor(entity);
        } else if (isObservable(entity)) {
          return this.spawnObservable(entity, name);
        } else if (isMachine(entity)) {
          return this.spawnMachine(entity, __assign(__assign({}, options), {
            id: name
          }));
        } else {
          throw new Error("Unable to spawn entity \"" + name + "\" of type \"" + typeof entity + "\".");
        }
      };

      Interpreter.prototype.spawnMachine = function (machine, options) {
        var _this = this;

        if (options === void 0) {
          options = {};
        }

        var childService = new Interpreter(machine, __assign(__assign({}, this.options), {
          parent: this,
          id: options.id || machine.id
        }));

        var resolvedOptions = __assign(__assign({}, DEFAULT_SPAWN_OPTIONS), options);

        if (resolvedOptions.sync) {
          childService.onTransition(function (state) {
            _this.send(update$1, {
              state: state,
              id: childService.id
            });
          });
        }

        childService.onDone(function (doneEvent) {
          _this.send(toSCXMLEvent(doneEvent, {
            origin: childService.id
          }));
        }).start();
        var actor = childService;
        this.children.set(childService.id, actor);

        if (resolvedOptions.autoForward) {
          this.forwardTo.add(childService.id);
        }

        return actor;
      };

      Interpreter.prototype.spawnPromise = function (promise, id) {
        var _this = this;

        var canceled = false;
        promise.then(function (response) {
          if (!canceled) {
            _this.send(toSCXMLEvent(doneInvoke(id, response), {
              origin: id
            }));
          }
        }, function (errorData) {
          if (!canceled) {
            var errorEvent = error$1(id, errorData);

            try {
              // Send "error.platform.id" to this (parent).
              _this.send(toSCXMLEvent(errorEvent, {
                origin: id
              }));
            } catch (error) {

              if (_this.devTools) {
                _this.devTools.send(errorEvent, _this.state);
              }

              if (_this.machine.strict) {
                // it would be better to always stop the state machine if unhandled
                // exception/promise rejection happens but because we don't want to
                // break existing code so enforce it on strict mode only especially so
                // because documentation says that onError is optional
                _this.stop();
              }
            }
          }
        });
        var actor = {
          id: id,
          send: function () {
            return void 0;
          },
          subscribe: function (next, handleError, complete) {
            var unsubscribed = false;
            promise.then(function (response) {
              if (unsubscribed) {
                return;
              }

              next && next(response);

              if (unsubscribed) {
                return;
              }

              complete && complete();
            }, function (err) {
              if (unsubscribed) {
                return;
              }

              handleError(err);
            });
            return {
              unsubscribe: function () {
                return unsubscribed = true;
              }
            };
          },
          stop: function () {
            canceled = true;
          },
          toJSON: function () {
            return {
              id: id
            };
          }
        };
        this.children.set(id, actor);
        return actor;
      };

      Interpreter.prototype.spawnCallback = function (callback, id) {
        var _this = this;

        var canceled = false;
        var receivers = new Set();
        var listeners = new Set();

        var receive = function (e) {
          listeners.forEach(function (listener) {
            return listener(e);
          });

          if (canceled) {
            return;
          }

          _this.send(e);
        };

        var callbackStop;

        try {
          callbackStop = callback(receive, function (newListener) {
            receivers.add(newListener);
          });
        } catch (err) {
          this.send(error$1(id, err));
        }

        if (isPromiseLike(callbackStop)) {
          // it turned out to be an async function, can't reliably check this before calling `callback`
          // because transpiled async functions are not recognizable
          return this.spawnPromise(callbackStop, id);
        }

        var actor = {
          id: id,
          send: function (event) {
            return receivers.forEach(function (receiver) {
              return receiver(event);
            });
          },
          subscribe: function (next) {
            listeners.add(next);
            return {
              unsubscribe: function () {
                listeners.delete(next);
              }
            };
          },
          stop: function () {
            canceled = true;

            if (isFunction(callbackStop)) {
              callbackStop();
            }
          },
          toJSON: function () {
            return {
              id: id
            };
          }
        };
        this.children.set(id, actor);
        return actor;
      };

      Interpreter.prototype.spawnObservable = function (source, id) {
        var _this = this;

        var subscription = source.subscribe(function (value) {
          _this.send(toSCXMLEvent(value, {
            origin: id
          }));
        }, function (err) {
          _this.send(toSCXMLEvent(error$1(id, err), {
            origin: id
          }));
        }, function () {
          _this.send(toSCXMLEvent(doneInvoke(id), {
            origin: id
          }));
        });
        var actor = {
          id: id,
          send: function () {
            return void 0;
          },
          subscribe: function (next, handleError, complete) {
            return source.subscribe(next, handleError, complete);
          },
          stop: function () {
            return subscription.unsubscribe();
          },
          toJSON: function () {
            return {
              id: id
            };
          }
        };
        this.children.set(id, actor);
        return actor;
      };

      Interpreter.prototype.spawnActor = function (actor) {
        this.children.set(actor.id, actor);
        return actor;
      };

      Interpreter.prototype.spawnActivity = function (activity) {
        var implementation = this.machine.options && this.machine.options.activities ? this.machine.options.activities[activity.type] : undefined;

        if (!implementation) {


          return;
        } // Start implementation


        var dispose = implementation(this.state.context, activity);
        this.spawnEffect(activity.id, dispose);
      };

      Interpreter.prototype.spawnEffect = function (id, dispose) {
        this.children.set(id, {
          id: id,
          send: function () {
            return void 0;
          },
          subscribe: function () {
            return {
              unsubscribe: function () {
                return void 0;
              }
            };
          },
          stop: dispose || undefined,
          toJSON: function () {
            return {
              id: id
            };
          }
        });
      };

      Interpreter.prototype.attachDev = function () {
        if (this.options.devTools && typeof window !== 'undefined') {
          if (window.__REDUX_DEVTOOLS_EXTENSION__) {
            var devToolsOptions = typeof this.options.devTools === 'object' ? this.options.devTools : undefined;
            this.devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect(__assign(__assign({
              name: this.id,
              autoPause: true,
              stateSanitizer: function (state) {
                return {
                  value: state.value,
                  context: state.context,
                  actions: state.actions
                };
              }
            }, devToolsOptions), {
              features: __assign({
                jump: false,
                skip: false
              }, devToolsOptions ? devToolsOptions.features : undefined)
            }), this.machine);
            this.devTools.init(this.state);
          } // add XState-specific dev tooling hook
        }
      };

      Interpreter.prototype.toJSON = function () {
        return {
          id: this.id
        };
      };

      Interpreter.prototype[symbolObservable] = function () {
        return this;
      };
      /**
       * The default interpreter options:
       *
       * - `clock` uses the global `setTimeout` and `clearTimeout` functions
       * - `logger` uses the global `console.log()` method
       */


      Interpreter.defaultOptions =
      /*#__PURE__*/
      function (global) {
        return {
          execute: true,
          deferEvents: true,
          clock: {
            setTimeout: function (fn, ms) {
              return global.setTimeout.call(null, fn, ms);
            },
            clearTimeout: function (id) {
              return global.clearTimeout.call(null, id);
            }
          },
          logger: global.console.log.bind(console),
          devTools: false
        };
      }(typeof window === 'undefined' ? global : window);

      Interpreter.interpret = interpret;
      return Interpreter;
    }();
    /**
     * Creates a new Interpreter instance for the given machine with the provided options, if any.
     *
     * @param machine The machine to interpret
     * @param options Interpreter options
     */


    function interpret(machine, options) {
      var interpreter = new Interpreter(machine, options);
      return interpreter;
    }

    var actions = {
      raise: raise$1,
      send: send$1,
      sendParent: sendParent,
      sendUpdate: sendUpdate,
      log: log$1,
      cancel: cancel$1,
      start: start$1,
      stop: stop$1,
      assign: assign$2,
      after: after$1,
      done: done,
      respond: respond,
      forwardTo: forwardTo,
      escalate: escalate
    };

    /*! xstate-component-tree@1.0.0 !*/
    const loader = async ({ item, key, fn, context, event }) => {
        item[key] = await fn(context, event);
    };

    class ComponentTree {
        constructor(interpreter, callback, options = {}) {
            // Storing off args
            this.interpreter = interpreter;
            this.callback = callback;
            this.options = options;

            // identifier!
            this._id = interpreter.id;

            // path -> meta lookup
            this._paths = new Map();

            // Get goin
            this._prep();
            this._watch();
        }

        teardown() {
            this._paths.clear();

            this._unsubscribe();
        }

        // Walk the machine and build up maps of paths to meta info as
        // well as prepping any load functions for usage later
        _prep() {
            const { _paths } = this;
            const { idMap : ids } = this.interpreter.machine;

            // xstate maps ids to state nodes, but the value object only
            // has paths, so need to create our own path-only map here
            for(const id in ids) {
                const { path, meta = false } = ids[id];

                const key = path.join(".");

                if(!meta) {
                    continue;
                }

                const { component, props, load } = meta;

                _paths.set(key, {
                    __proto__ : null,

                    component,
                    props,
                    load,
                });
            }
        }

        // Watch the machine for changes
        _watch() {
            const { interpreter } = this;
        
            const { unsubscribe } = interpreter.subscribe(this._state.bind(this));

            this._unsubscribe = unsubscribe;

            // In case the machine is already started, run a first pass on it
            if(interpreter.initialized) {
                this._state(interpreter.state);
            }
        }

        // Walk a machine via BFS, collecting meta information to build a tree
        // eslint-disable-next-line max-statements
        async _walk({ value, context, event }) {
            const { _paths } = this;
            
            const loads = [];
            const tree = {
                __proto__ : null,
                children  : [],
                id        : this._id,
            };

            // Set up queue for a breadth-first traversal of all active states
            let queue;

            if(typeof value === "string") {
                queue = [[ tree, value, false ]];
            } else {
                queue = Object.entries(value).map(([ child, grandchildren ]) =>
                    [ tree, child, grandchildren ]
                );
            }

            while(queue.length) {
                const [ parent, path, values ] = queue.shift();

                // Since it can be assigned if we add a new child
                let pointer = parent;

                if(_paths.has(path)) {
                    const { component, props, load } = _paths.get(path);
                    const item = {
                        __proto__ : null,
                        children  : [],
                        component : component || false,
                        props     : props || false,
                    };

                    // Run load function and assign the response to the component prop
                    if(load) {
                        loads.push(loader({
                            item,
                            key : "component",
                            fn  : load,
                            context,
                            event,
                        }));
                    }

                    // Props as a function means they're dynamic, so run it to get the value
                    if(typeof props === "function") {
                        loads.push(loader({
                            item,
                            key : "props",
                            fn  : props,
                            context,
                            event,
                        }));
                    }

                    parent.children.push(item);

                    pointer = item;
                }

                if(!values) {
                    continue;
                }

                if(typeof values === "string") {
                    queue.push([ pointer, `${path}.${values}`, false ]);

                    continue;
                }

                queue.push(...Object.entries(values).map(([ child, grandchildren ]) =>
                    [ pointer, `${path}.${child}`, grandchildren ]
                ));
            }

            // await all the load functions
            await Promise.all(loads);

            return tree;
        }
        
        // eslint-disable-next-line max-statements
        async _state(state) {
            const { changed, value, context, event } = state;

            // Need to specifically check for false because this value is undefined
            // when a machine first boots up
            if(changed === false) {
                return;
            }

            const tree = await this._walk({ value, context, event });
            
            this.callback(tree);
        }
    }

    const treeBuilder = (interpreter, fn) => {
        const machines = new Map();
        const trees = new Map();

        const root = interpreter.id;

        const respond = () => {
            fn([ ...trees.values() ]);
        };

        machines.set(root, new ComponentTree(interpreter, (tree) => {
            trees.set(root, tree);

            respond();
        }));

        interpreter.subscribe(({ changed, children }) => {
            if(changed === false) {
                return;
            }

            // BFS Walk child statecharts, attach subscribers for each of them
            const queue = Object.entries(children);
            
            // Track active ids
            const active = new Set();

            while(queue.length) {
                const [ id, machine ] = queue.shift();

                active.add(id);

                if(machine.initialized && machine.state) {
                    machines.set(id, new ComponentTree(machine, (tree) => {
                        trees.set(id, tree);

                        respond();
                    }));

                    queue.push(...Object.entries(machine.state.children));
                }
            }

            // Remove any no-longer active invoked statecharts from being tracked
            machines.forEach((cancel, id) => {
                if(active.has(id) || id === root) {
                    return;
                }

                machines.get(id).teardown();
                machines.delete(id);
                trees.delete(id);

                respond();
            });
        });

        return () => {
            machines.forEach((machine) => machine.teardown());
            machines.clear();
            trees.clear();
        };
    };

    treeBuilder.ComponentTree = ComponentTree;
    //# sourceMappingURL=treebuilder.mjs.map

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const quadrants = ["FRONT_RIGHT", "FRONT_LEFT", "BACK_LEFT", "BACK_RIGHT"]; // NOTE: The Deck editor orders strings as FR - FL - BL - BR

    const weapon = writable("barehands");

    const equip = armament => weapon.set(armament);

    const equipped = () => get_store_value(weapon);

    /**
     * Generate an empty deck slot object
     */

    const empty$1 = () => Object.assign(Object.create(null), {
      // Metadata for each cell to tell if it's empty, as well as
      // offer convenient pointers to its neighbors
      _meta: {
        empty: true,
        begins: false,
        ends: false
      }
    });
    /**
     * A factory function to generate a combo of length `length`
     * that comes complete with a default structure. This is used to generate
     * the primary strings (`combo(3)`) and alternate strings (`combo(1)`)
     * @param {Number} length
     */


    const combo = length => {
      const results = [];
      quadrants.forEach(() => {
        let attacks = Array.from(Array(length), empty$1);
        attacks = attacks.map(empty$1);
        attacks.forEach((attack, i) => {
          const next = attacks[i + 1] || false;
          const previous = attacks[i - 1] || false;
          const {
            _meta
          } = attack;
          _meta.next = next;
          _meta.previous = previous;
        });
        results.push(attacks);
      });
      return results;
    }; // Sets an attack at a location


    const insert$1 = (section, slot, attack) => {
      section.update(data => {
        const attacks = data[slot.row];
        Object.assign(attacks[slot.column], attack);
        return data;
      });
      return;
    }; // Remove an attack at a location


    const remove = (section, slot, subsequent = false) => {
      section.update(data => {
        let attacks = data[slot.row]; // !subsequent means we're not deleting all the stuff that comes after the target,

        if (!subsequent) {
          const attack = attacks[slot.column]; // Overwrite the meta object EXCEPT for linked list references.

          const _meta = Object.assign(attack._meta, empty$1()._meta); // Create a new object that's empty but contains metadata


          attacks[slot.column] = Object.assign(Object.create(null), {
            _meta
          });
          return data;
        }

        data[slot.row] = attacks.map((attack, index) => {
          if (index < slot.column) {
            return attack;
          } // Overwrite the meta object EXCEPT for linked list references.


          const _meta = Object.assign(attack._meta, empty$1()._meta); // Create a new object that's empty but contains metadata


          return Object.assign(Object.create(null), {
            _meta
          });
        });
        return data;
      });
    };

    /**
     * A function that takes a combo and runs through its attacks and
     * sets its _meta properties based contextually on the attacks that come before/after it.
     *
     * @param {Array} chain - An array of attacks to be walked and modified in-place
     */

    const configure = (quadrant, attacks) => {
      const armament = equipped();
      attacks.forEach(attack => {
        const {
          _meta
        } = attack;
        const {
          previous = false
        } = _meta;
        const {
          stance = false
        } = attack;
        const atkstance = stance[armament]; // This attack isn't empty if it has a name.

        _meta.empty = !attack.name; // If there's no previous move

        if (!previous) {
          // The current cell's beginning is defaulted to the quadrant it belongs to
          _meta.begins = quadrant; // The ending is either the quadrant, or if we have attack data, the ending for the attack.

          _meta.ends = _meta.empty ? quadrant : atkstance[_meta.begins];
          return;
        }
        /**
         * This attack begins where the previous one left off. But if there
         * is no previous attack, it's defaulted to the quadrant in the combo
         * this attack belongs to.
         */


        _meta.begins = previous._meta.empty ? quadrant : previous._meta.ends;
        _meta.ends = _meta.empty ? quadrant : atkstance[_meta.begins];
        return;
      });
      return;
    }; // Data structures representing the entire state of primary
    // strings and alternates in our deck.


    const primaries = writable(combo(3));
    const alternates = writable(combo(1)); // Derive a deck object that keeps the most up to date deck attack / stance flow information

    const deck = derived([primaries, alternates], ([_p, _a], set) => {
      // Use side effects to configure both the primary section attacks and the
      // Alternate attacks. This is run every time primaries or alternates is updated.
      // NOTE: This can probably be greatly optimized, but right now 8 arrays of < 4 elements each is... trivial.
      const map = quadrants.map((quadrant, current) => {
        const p = _p[current];
        const a = _a[current];
        configure(quadrant, p);
        configure(quadrant, a);
        return {
          quadrant,
          primary: p,
          alternate: a
        };
      });
      set(map);
    });
    const equipped$1 = derived([primaries, alternates], ([_p, _a], set) => {
      const attacks = [..._p, ..._a];
      const reduced = attacks.reduce((collector, current) => [...collector, ...current], []);
      const names = reduced.map(({
        name = ""
      }) => name);
      set(names);
    });
    const selected = writable(false); // Glowing Stance icon

    const followup = derived([selected, weapon], ([_selected, _weapon], set) => {
      const {
        _meta = false
      } = _selected;

      if (!_selected || !_meta) {
        return;
      }

      if (_meta.empty) {
        set(false);
        return;
      }

      const {
        stance
      } = _selected;
      const {
        begins
      } = _meta;
      set(stance[_weapon][begins]);
    }, false);

    const reset = () => {
      primaries.set(combo(3));
      alternates.set(combo(1));
    };

    const matches = (service, lookup) => {
      const selector = lookup.split(".");
      let pointer = service.state.value;
      return selector.every(key => {
        if (typeof pointer === "string") {
          return key === pointer;
        }

        if (!pointer[key]) {
          return false;
        }

        pointer = pointer[key];
        return true;
      });
    };

    const statechart = (machine, options) => {
      // Create a statechart service that interprets
      // a passed in machine.
      const service = interpret(machine, options);
      const matching = matches.bind(null, service);
      const store = writable({
        __proto__: null,
        value: {},
        context: {},
        event: false,
        matches: matching
      });

      const update = ({
        value,
        event,
        context
      }) => {
        store.update(data => {
          data.value = value;
          data.event = event;
          data.context = context;
          return data;
        });
      };

      return {
        service,
        subscribe: store.subscribe,
        matches: matching,

        start() {
          service.onTransition(update);
          service.start();
          return service;
        },

        stop() {
          service.stop();
        },

        send(...args) {
          service.send(...args);
        }

      };
    };

    var barehands = [
    	{
    		name: "360 Tornado Kick",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 12,
    				guard: -1
    			}
    		},
    		modifiers: [
    			"jump"
    		]
    	},
    	{
    		name: "Ankle Stamp",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "low",
    		type: "thrust",
    		frames: {
    			startup: 11,
    			advantage: {
    				hit: 3,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Axe Kick",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 11,
    				guard: 7
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Back Fist",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 11,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Back Hop Wrist",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 10,
    			advantage: {
    				hit: 4,
    				guard: 0
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Back Tripped Kick",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 4,
    				guard: -1
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Back Turn Wrist",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 10,
    			advantage: {
    				hit: 3,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Back Ura",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Backfall Strike",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 2
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Bending Palm",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 9,
    				guard: 8
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Blink Punch",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 10,
    			advantage: {
    				hit: 4,
    				guard: 0
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Body Blow",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 8,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"strafe"
    		]
    	},
    	{
    		name: "Bounce Knee",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 9,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"jump"
    		]
    	},
    	{
    		name: "Calbot",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 4,
    				guard: 1
    			}
    		},
    		modifiers: [
    			"strafe"
    		]
    	},
    	{
    		name: "Charged Haymaker",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 22,
    			advantage: {
    				hit: 10,
    				guard: 5
    			}
    		},
    		modifiers: [
    			"charge"
    		]
    	},
    	{
    		name: "Chin Palm",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Cleaver Blow",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 10,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Collar Chop",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 24,
    			advantage: {
    				hit: 15,
    				guard: 15
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Cross Punch",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 6
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Crouching Elbow",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Crushing Palm",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 9,
    				guard: 7
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Curled Up Uppercut",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 7,
    				guard: 6
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Direct Punch",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 10,
    			advantage: {
    				hit: 3,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Donkey Slap",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Double Fist Stretch",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 7,
    				guard: 1
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Double Palm",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: false
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 7,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Double Spike Kick",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 7,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Double Wata",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: false
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Drunk Crane",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: false
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Drunk Stomp",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 6
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Drunken Paw",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 21,
    			advantage: {
    				hit: 13,
    				guard: 5
    			}
    		},
    		modifiers: [
    			"strafe"
    		]
    	},
    	{
    		name: "Drunken Smash",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 13,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Dwit Chagi",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 8,
    				guard: 7
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Elbow Stumble",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 7,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Eye Poke",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: false
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 8,
    				guard: 7
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Face Backfist",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 11,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Falcon Punch",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 22,
    			advantage: {
    				hit: 13,
    				guard: 6
    			}
    		},
    		modifiers: [
    			"jump"
    		]
    	},
    	{
    		name: "Fast Back Fist",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 10,
    			advantage: {
    				hit: 4,
    				guard: 0
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Fast Cross",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Fast Elbow",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 10,
    			advantage: {
    				hit: 3,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Fast Punch",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Fencing Punch",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 6,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Foot Slap",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 5,
    				guard: 0
    			}
    		},
    		modifiers: [
    			"jump"
    		]
    	},
    	{
    		name: "Front Kick",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 12,
    				guard: 12
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Front Sweep",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 6,
    				guard: 2
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Furious Uppercut",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 22,
    			advantage: {
    				hit: 12,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"charge"
    		]
    	},
    	{
    		name: "Grab Punch",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 21,
    			advantage: {
    				hit: 11,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Gut Punch",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Guts Punch",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 12,
    				guard: 6
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Hadrunken",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: false
    		},
    		hits: "both",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 21,
    			advantage: {
    				hit: 10,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"charge"
    		]
    	},
    	{
    		name: "Hammer Kick",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 12,
    				guard: 12
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Handstand Kick",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 7,
    				guard: -1
    			}
    		},
    		modifiers: [
    			"double",
    			"duck"
    		]
    	},
    	{
    		name: "Heel to Knee",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "low",
    		type: "thrust",
    		frames: {
    			startup: 11,
    			advantage: {
    				hit: 4,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Hook",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		side: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Horse Kick",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 23,
    			advantage: {
    				hit: 13,
    				guard: 8
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Illusion Twist Kick",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 12,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"jump"
    		]
    	},
    	{
    		name: "Inside Kick",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Jab Punch",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 10,
    			advantage: {
    				hit: 4,
    				guard: 0
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Jackhammer Punch",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 10,
    				guard: 5
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Jar Bash",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 6,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Jump Out Elbow",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 21,
    			advantage: {
    				hit: 13,
    				guard: 13
    			}
    		},
    		modifiers: [
    			"break",
    			"jump"
    		]
    	},
    	{
    		name: "Jumped Light Kick",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 11,
    			advantage: {
    				hit: 3,
    				guard: 0
    			}
    		},
    		modifiers: [
    			"jump"
    		]
    	},
    	{
    		name: "Jumped Spin kick",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 23,
    			advantage: {
    				hit: 12,
    				guard: 6
    			}
    		},
    		modifiers: [
    			"jump"
    		]
    	},
    	{
    		name: "Jumping Risekick",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 10,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Knee Strike",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 12,
    				guard: 12
    			}
    		},
    		modifiers: [
    			"break",
    			"jump"
    		]
    	},
    	{
    		name: "Knife Hand Strike",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 10,
    			advantage: {
    				hit: 3,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Leg Breaker",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 10,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Light Sidekick",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Liver Knee",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 8,
    				guard: 6
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Low Backfist",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Low Kick",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 6,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Low Spin Heel",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 9,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Mawashi",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 10,
    			advantage: {
    				hit: 3,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Meia Lua",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 9,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Mill Punch",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: false
    		},
    		side: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "One Inch Punch",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 24,
    			advantage: {
    				hit: 15,
    				guard: 15
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Outward Kick",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Parry & Strike",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		side: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 7,
    				guard: 2
    			}
    		},
    		modifiers: [
    			"parry"
    		]
    	},
    	{
    		name: "Plexus Elbow",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 12,
    				guard: 12
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Power Mawashi",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 19,
    			advantage: {
    				hit: 11,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Pulmonary Palm",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: false
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 9,
    				guard: 8
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Pushed Back Kick",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 19,
    			advantage: {
    				hit: 11,
    				guard: 11
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Pushed Elbow",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_LEFT"
    			}
    		},
    		side: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 7,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Rabbit Punch",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Reaching Maegeri",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 7,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Reaching Mawashi",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 9,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Rising Kick",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 7,
    				guard: 6
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Roll Back Fist",
    		style: "windfall",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 8,
    				guard: 2
    			}
    		},
    		modifiers: [
    			"strafe"
    		]
    	},
    	{
    		name: "Roll Punch",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 9,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Roll Uppercut",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 19,
    			advantage: {
    				hit: 11,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Run-up Strike",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_LEFT",
    				FRONT_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 21,
    			advantage: {
    				hit: 12,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Scissor Kick",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 8,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Side Kick",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 10,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Slap Kick",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 9,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"jump"
    		]
    	},
    	{
    		name: "Soto-uke",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Spin Back Fist",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 7,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Spin Elbow",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 11,
    			advantage: {
    				hit: 5,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Spinning Flute Swing",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 12,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Spinning High Kick",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 22,
    			advantage: {
    				hit: 14,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Spinning Wide Hook",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 23,
    			advantage: {
    				hit: 14,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Spiral Back Punch",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 10,
    				guard: 6
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Spiral Palm",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: false
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 24,
    			advantage: {
    				hit: 15,
    				guard: 15
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Straight Punch",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 8,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Stretch Out Hook",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Surging Palm",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 12,
    				guard: 5
    			}
    		},
    		modifiers: [
    			"strafe"
    		]
    	},
    	{
    		name: "Switch Kick",
    		style: "faejin",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "thrust",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 7,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Temple Knock",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Tetsuzanko",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 10,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"strafe"
    		]
    	},
    	{
    		name: "Tripped Kick",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT",
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 5,
    				guard: 2
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Twist Back Kick",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 8,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Twist Parry Strike",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 9,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"parry"
    		]
    	},
    	{
    		name: "Underknee kick",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 6,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Upper Backfist",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 6,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Upper Elbow",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 23,
    			advantage: {
    				hit: 14,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Uraken",
    		style: "faejin",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_LEFT",
    				BACK_LEFT: "BACK_RIGHT"
    			},
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Uramawashi",
    		style: "windfall",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			},
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT",
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 7,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Wallop Blow",
    		style: "kahlt",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "BACK_RIGHT",
    				BACK_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 7,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Whirlwind Double Punch",
    		style: "stagger",
    		stance: {
    			barehands: {
    				BACK_RIGHT: "FRONT_RIGHT",
    				BACK_LEFT: "FRONT_LEFT"
    			},
    			sword: false
    		},
    		hits: "same",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 7,
    				guard: 1
    			}
    		},
    		modifiers: [
    			"duck",
    			"double"
    		]
    	},
    	{
    		name: "Winged Back Kick",
    		style: "forsaken",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 6
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Wobble Low Kick",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			},
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT",
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 5,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Wrist Jab",
    		style: "stagger",
    		stance: {
    			barehands: {
    				FRONT_RIGHT: "FRONT_RIGHT",
    				FRONT_LEFT: "FRONT_LEFT"
    			},
    			sword: false
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 11,
    			advantage: {
    				hit: 5,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	}
    ];

    var sword = [
    	{
    		name: "Arc Slash",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 9,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Body Slicing",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 23,
    			advantage: {
    				hit: 13,
    				guard: 14
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Buchinmo",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 21,
    			advantage: {
    				hit: 10,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"charge"
    		]
    	},
    	{
    		name: "Neck Slash",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Shifting Thrust",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 7,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Corkscrew Thrust",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 11,
    			advantage: {
    				hit: 3,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Dash Slash",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 11,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Digging Parry Elbow",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 9,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"parry"
    		]
    	},
    	{
    		name: "Double Thrust",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 6,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Drop Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 12,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Ducking Spike",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 4,
    				guard: -1
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Duster Blow",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Forward Lean Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 22,
    			advantage: {
    				hit: 14,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Front Stab",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 6,
    				guard: 5
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Gatotsu",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 11,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Gokai Slash",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Ground Swell Slash",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 8,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Head Splitter",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 9,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Hook Slash",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Inward Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 11,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Keen Crouch",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 8,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Kitsueno Cut",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 2
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Leg Stroke",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Light Swing Slash",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 11,
    			advantage: {
    				hit: 4,
    				guard: 0
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Light Thrust",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 6
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Limbo Thrust",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 6,
    				guard: 2
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Mill Slash",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 6,
    				guard: 2
    			}
    		},
    		modifiers: [
    			"duck"
    		]
    	},
    	{
    		name: "Neck Slash",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 6,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Needle Point",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Nose Stab",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 11,
    			advantage: {
    				hit: 4,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Obvious Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "both",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 22,
    			advantage: {
    				hit: 14,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "One Handed Slash",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "DIFF",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 6,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Overhead Slash",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 11,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Painstaking Slash",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 8,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Parry Pommel Bash",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 11,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"parry"
    		]
    	},
    	{
    		name: "Parry Reverse Low Slash",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 10,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"parry"
    		]
    	},
    	{
    		name: "Parry Shove",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 19,
    			advantage: {
    				hit: 10,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"parry"
    		]
    	},
    	{
    		name: "Parry Slash",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 24,
    			advantage: {
    				hit: 13,
    				guard: 6
    			}
    		},
    		modifiers: [
    			"parry"
    		]
    	},
    	{
    		name: "Poke Thrust",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 11,
    			advantage: {
    				hit: 3,
    				guard: 2
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Pommel Bash",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 10,
    				guard: 10
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Puropera Cut",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 21,
    			advantage: {
    				hit: 13,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Ram Thrust",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 7,
    				guard: 6
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Reverse Feet Thrust",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "thrust",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 12,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Reverse Hips Slash",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Reverse One Handed Slash",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 7,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Reverse Rising Slash",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Reverse Rising Thrust",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 10,
    				guard: 6
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Reverse Sharp Slash",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 22,
    			advantage: {
    				hit: 13,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Reverse Twist Slash",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 6
    			}
    		},
    		modifiers: [
    			"stop"
    		]
    	},
    	{
    		name: "Rising Double Hand",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 9,
    				guard: 9
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Rising Slash",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Rising Spin Slash",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 12,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Seven Star Thrust",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 22,
    			advantage: {
    				hit: 14,
    				guard: 5
    			}
    		},
    		modifiers: [
    			"strafe"
    		]
    	},
    	{
    		name: "Shapu Furiko",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "thrust",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 9,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Shifting Thrust",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 5,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Sickle Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 9,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Side Thrust",
    		style: "kahlt",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "different",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 8,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Side Wind Thrust",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "thrust",
    		frames: {
    			startup: 21,
    			advantage: {
    				hit: 13,
    				guard: 5
    			}
    		},
    		modifiers: [
    			"strafe"
    		]
    	},
    	{
    		name: "Slip Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 7,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Spiral Slash",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 11,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Spoon Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 9,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Stumble Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 21,
    			advantage: {
    				hit: 13,
    				guard: 6
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Swirl Slash",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 21,
    			advantage: {
    				hit: 13,
    				guard: 13
    			}
    		},
    		modifiers: [
    			"break"
    		]
    	},
    	{
    		name: "Tei-nami",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "thrust",
    		frames: {
    			startup: 12,
    			advantage: {
    				hit: 6,
    				guard: 4
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Tendon Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 16,
    			advantage: {
    				hit: 8,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Thigh Slash",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "same",
    		height: "low",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 6,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Thunder Slash",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "BACK_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 23,
    			advantage: {
    				hit: 14,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Toreador Slash",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 7,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"strafe"
    		]
    	},
    	{
    		name: "Twist Hips Slash",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "FRONT_LEFT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 20,
    			advantage: {
    				hit: 13,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Typhoon Slash",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 7,
    				guard: -1
    			}
    		},
    		modifiers: [
    			"double"
    		]
    	},
    	{
    		name: "Up Slash",
    		style: "faejin",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_RIGHT: "BACK_LEFT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 9,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Vertical Slash",
    		style: "forsaken",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "FRONT_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 17,
    			advantage: {
    				hit: 10,
    				guard: 5
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Whirl Slash",
    		style: "windfall",
    		stance: {
    			barehands: false,
    			sword: {
    				FRONT_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 18,
    			advantage: {
    				hit: 10,
    				guard: 3
    			}
    		},
    		modifiers: [
    			"jump"
    		]
    	},
    	{
    		name: "Wide Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 14,
    			advantage: {
    				hit: 8,
    				guard: 3
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Woosh Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_LEFT: "BACK_RIGHT"
    			}
    		},
    		hits: "diff",
    		height: "high",
    		type: "horizontal",
    		frames: {
    			startup: 13,
    			advantage: {
    				hit: 7,
    				guard: 1
    			}
    		},
    		modifiers: [
    		]
    	},
    	{
    		name: "Wrist Roll Slash",
    		style: "stagger",
    		stance: {
    			barehands: false,
    			sword: {
    				BACK_RIGHT: "FRONT_RIGHT"
    			}
    		},
    		hits: "same",
    		height: "mid",
    		type: "vertical",
    		frames: {
    			startup: 15,
    			advantage: {
    				hit: 9,
    				guard: 4
    			}
    		},
    		modifiers: [
    		]
    	}
    ];

    const all = [...barehands, ...sword];

    const cache = new Map();
    /**
     * Given some arbitrary quadrant data, runs through the move pool
     * and determines which moves will take you from your passed in position
     * to each of the known stance quadrants.
     *
     * @param {Object} source - The quadrant you want to move from e.g. "FRONT_LEFT"
     *
     * @returns {Object} A Map of move options that can originate from the source
     */

    const followups = (source, options = false) => {
      const attacks = all;
      const armament = equipped();

      if (!source) {
        return false;
      } // Should we exclude any quadrants?


      const {
        exclude = []
      } = options;
      const alternate = exclude.length; // Thus far, the only reason I have an options object is because
      // I need to exclude stuff for alts, so this works.

      const key = `${armament}-${source}-${alternate ? "alt" : "pri"}`; // Return an existing pool if we've already done this work

      if (cache.has(key)) {
        return cache.get(key);
      }

      const pool = []; // For each quadrant, find out the moves
      // That will take you from the source quadrant to
      // the target quadrant (e.g. FRONT_RIGHT to BACK_LEFT)

      quadrants.forEach(quadrant => {
        // If the current quadrant is blacklisted, don't bother.
        if (exclude.includes(quadrant)) {
          return;
        }

        let data = attacks.filter(attack => {
          const stance = attack.stance[armament];
          const keys = Object.keys(stance);
          /**
           * The stance object has to have a key that matches our `source`.
           * Additionally, the VALUE of that key (attack.stance[key] e.g. FRONT_RIGHT) needs
           * to match the quadrant we're currently iterating over.
          */

          return keys.includes(source) && stance[source] === quadrant;
        }); // Sort by startup

        data.sort((a, b) => a.frames.startup - b.frames.startup); // Giveth me an object with metadata and attacks, brethren

        pool.push({
          // It cometh from source -- Used to let attacks determine what side they hit
          origin: source,
          // It endeth up, in quadrant
          stance: quadrant,
          attacks: data
        });
      }); // Set this key for the cache so we can save off this stuff for later.

      cache.set(key, pool);
      return pool;
    };

    /**
     *
     * @param {Object} target - A deck slot where `attack` will be placed.
     * @param {*} attack - An attack object that will be slotted into `target`
     */

    const compatible = (target, attack) => {
      const armament = equipped();
      const {
        next,
        previous
      } = target._meta;
      const {
        _meta: after
      } = next;
      const {
        _meta: before
      } = previous;
      const stance = attack.stance[armament];
      const endings = Object.values(stance);
      const beginnings = Object.keys(stance);
      const predicates = [// VALID: the move you're trying to slot ends where the next move begins
      // OR there's no move in the next slot.
      !next || after.empty || endings.includes(after.begins), // VALID: The move you're trying to slot already begins in the right stance where the previous move ends
      // OR there's no previous move.
      !previous || before.empty || beginnings.includes(before.ends)]; // If any predicate fails here, this configuration is incompatible

      return predicates.every(Boolean);
    };

    // import { Howl } from "howler";

    const action = (event, sound) => node => {
      const handler = () => {}; // sound.play();


      node.addEventListener(event, handler);
      return () => node.removeEventListener(event, handler);
    };

    const click = action("click");
    const hover = action("mouseenter");

    /* src\components\icons\empty-icon.svelte generated by Svelte v3.18.2 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-ymmyl2-style";
    	style.textContent = ".svg.svelte-ymmyl2{margin:0 1rem;height:25%;width:25%}.path.svelte-ymmyl2{stroke-width:20;stroke:white}";
    	append(document.head, style);
    }

    function create_fragment(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "class", "path svelte-ymmyl2");
    			attr(path, "d", "M 0 50 L 100 50 M 50 0 L 50 100");
    			attr(svg, "class", "svg svelte-ymmyl2");
    			attr(svg, "viewBox", "0 0 100 100");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    class Empty_icon extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-ymmyl2-style")) add_css();
    		init(this, options, null, create_fragment, safe_not_equal, {});
    	}
    }

    /* src\components\icons\style-icon.svelte generated by Svelte v3.18.2 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1xsbv0e-style";
    	style.textContent = ".style.svelte-1xsbv0e{width:1rem;height:1rem}";
    	append(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "style svelte-1xsbv0e");
    			attr(div, "style", /*art*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*art*/ 1) {
    				attr(div, "style", /*art*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {

    	let { style = "unknown" } = $$props;

    	$$self.$set = $$props => {
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    	};

    	let art;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*style*/ 2) {
    			 $$invalidate(0, art = `background-image: url("assets/styles/${style}.svg")`);
    		}
    	};

    	return [art, style];
    }

    class Style_icon extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1xsbv0e-style")) add_css$1();
    		init(this, options, instance, create_fragment$1, safe_not_equal, { style: 1 });
    	}
    }

    /* src\components\attack-tile.svelte generated by Svelte v3.18.2 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-16hj5wc-style";
    	style.textContent = "@keyframes svelte-16hj5wc-oscillate{0%{outline:0.15rem solid var(--color-gold)}50%{outline:0.15rem solid transparent}100%{outline:0.15rem solid var(--color-gold)}}.flex.svelte-16hj5wc.svelte-16hj5wc{display:flex;justify-content:center;align-items:center}.container.svelte-16hj5wc.svelte-16hj5wc{position:relative;height:var(--deck-overview-attack-tile-height);width:var(--deck-overview-attack-tile-width);background-color:rgba(0, 0, 0, 0.55);color:#FFF;background-size:90%;background-position:center;background-repeat:no-repeat;cursor:pointer;user-select:none}.container.svelte-16hj5wc.svelte-16hj5wc:hover,.container[data-current-target=\"true\"].svelte-16hj5wc.svelte-16hj5wc{animation-name:svelte-16hj5wc-oscillate;animation-duration:1.5s;animation-iteration-count:infinite}.container.svelte-16hj5wc .delete.svelte-16hj5wc{display:none}.container.svelte-16hj5wc:hover .delete.svelte-16hj5wc{display:block;position:absolute;top:0;right:0;z-index:3}.container[data-equipped=\"true\"].svelte-16hj5wc.svelte-16hj5wc{opacity:0.25}.style.svelte-16hj5wc.svelte-16hj5wc{display:flex;flex-flow:row nowrap;width:100%;height:1rem;padding:0.4rem 0.2rem;position:absolute;top:0;font-size:0.6rem;justify-content:space-between;align-items:center}.meta.svelte-16hj5wc.svelte-16hj5wc{display:flex;flex-flow:row nowrap;width:100%;padding:0.2rem;position:absolute;bottom:0;font-size:0.6rem;justify-content:flex-end;align-items:center;justify-content:space-between}.meta-trait+.meta-trait.svelte-16hj5wc.svelte-16hj5wc{padding:0 0.2rem}.meta-trait.svelte-16hj5wc.svelte-16hj5wc{height:1rem;width:1rem;display:flex;align-items:center;justify-content:center}.delete.svelte-16hj5wc.svelte-16hj5wc{text-align:center;width:1rem;height:1rem;font-weight:bold;color:white}.delete.svelte-16hj5wc.svelte-16hj5wc::after{position:absolute;z-index:-1;content:\"\";width:0px;height:0px;border-top:2rem solid var(--color-mork-red);border-left:2rem solid transparent;top:0;right:0}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    // (14:4) {:else}
    function create_else_block(ctx) {
    	let t0;
    	let div0;
    	let t1;
    	let span0;
    	let t2;
    	let t3;
    	let span1;
    	let t4_value = /*attack*/ ctx[0].frames.startup + "";
    	let t4;
    	let t5;
    	let t6;
    	let div1;
    	let span2;
    	let t7;
    	let t8_value = /*frames*/ ctx[5].advantage.hit + "";
    	let t8;
    	let t9;
    	let t10_value = /*frames*/ ctx[5].advantage.guard + "";
    	let t10;
    	let t11;
    	let current;
    	let if_block = /*deletable*/ ctx[3] && create_if_block_2(ctx);

    	const styleicon = new Style_icon({
    			props: { style: /*attack*/ ctx[0].style }
    		});

    	let each_value = /*modifiers*/ ctx[6];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			create_component(styleicon.$$.fragment);
    			t1 = space();
    			span0 = element("span");
    			t2 = text(/*hit*/ ctx[4]);
    			t3 = space();
    			span1 = element("span");
    			t4 = text(t4_value);
    			t5 = text("F");
    			t6 = space();
    			div1 = element("div");
    			span2 = element("span");
    			t7 = text("+");
    			t8 = text(t8_value);
    			t9 = text(" / +");
    			t10 = text(t10_value);
    			t11 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(span1, "class", "end");
    			attr(div0, "class", "style svelte-16hj5wc");
    			attr(div1, "class", "meta svelte-16hj5wc");
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div0, anchor);
    			mount_component(styleicon, div0, null);
    			append(div0, t1);
    			append(div0, span0);
    			append(span0, t2);
    			append(div0, t3);
    			append(div0, span1);
    			append(span1, t4);
    			append(span1, t5);
    			insert(target, t6, anchor);
    			insert(target, div1, anchor);
    			append(div1, span2);
    			append(span2, t7);
    			append(span2, t8);
    			append(span2, t9);
    			append(span2, t10);
    			append(div1, t11);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*deletable*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			const styleicon_changes = {};
    			if (dirty & /*attack*/ 1) styleicon_changes.style = /*attack*/ ctx[0].style;
    			styleicon.$set(styleicon_changes);
    			if (!current || dirty & /*hit*/ 16) set_data(t2, /*hit*/ ctx[4]);
    			if ((!current || dirty & /*attack*/ 1) && t4_value !== (t4_value = /*attack*/ ctx[0].frames.startup + "")) set_data(t4, t4_value);
    			if ((!current || dirty & /*frames*/ 32) && t8_value !== (t8_value = /*frames*/ ctx[5].advantage.hit + "")) set_data(t8, t8_value);
    			if ((!current || dirty & /*frames*/ 32) && t10_value !== (t10_value = /*frames*/ ctx[5].advantage.guard + "")) set_data(t10, t10_value);

    			if (dirty & /*modifiers, stylize*/ 1088) {
    				each_value = /*modifiers*/ ctx[6];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(styleicon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(styleicon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div0);
    			destroy_component(styleicon);
    			if (detaching) detach(t6);
    			if (detaching) detach(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (12:4) {#if _meta.empty}
    function create_if_block(ctx) {
    	let current;
    	const emptyicon = new Empty_icon({});

    	return {
    		c() {
    			create_component(emptyicon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(emptyicon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(emptyicon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(emptyicon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(emptyicon, detaching);
    		}
    	};
    }

    // (15:8) {#if deletable}
    function create_if_block_2(ctx) {
    	let div;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "X";
    			attr(div, "class", "delete svelte-16hj5wc");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			dispose = listen(div, "click", stop_propagation(/*click_handler*/ ctx[21]));
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			dispose();
    		}
    	};
    }

    // (29:16) {:else}
    function create_else_block_1(ctx) {
    	let div;
    	let div_style_value;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "meta-trait svelte-16hj5wc");
    			attr(div, "style", div_style_value = /*stylize*/ ctx[10](/*modifier*/ ctx[24]));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*modifiers*/ 64 && div_style_value !== (div_style_value = /*stylize*/ ctx[10](/*modifier*/ ctx[24]))) {
    				attr(div, "style", div_style_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (27:16) {#if modifier === "double"}
    function create_if_block_1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "2X";
    			attr(div, "class", "meta-trait svelte-16hj5wc");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (26:12) {#each modifiers as modifier}
    function create_each_block(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*modifier*/ ctx[24] === "double") return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let click_action;
    	let hover_action;
    	let current;
    	let dispose;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*_meta*/ ctx[7].empty) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			div = element("div");
    			if_block.c();
    			attr(div, "class", "flex container svelte-16hj5wc");
    			attr(div, "data-current-target", /*target*/ ctx[1]);
    			attr(div, "data-equipped", /*equipped*/ ctx[2]);
    			attr(div, "data-hit", /*hit*/ ctx[4]);
    			attr(div, "style", /*style*/ ctx[8]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;

    			dispose = [
    				listen(div, "click", function () {
    					if (is_function(/*equipped*/ ctx[2]
    					? click_handler_1
    					: /*click_handler_2*/ ctx[22])) (/*equipped*/ ctx[2]
    					? click_handler_1
    					: /*click_handler_2*/ ctx[22]).apply(this, arguments);
    				}),
    				listen(div, "mouseenter", /*mouseenter_handler*/ ctx[23]),
    				action_destroyer(click_action = click.call(null, div)),
    				action_destroyer(hover_action = hover.call(null, div))
    			];
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}

    			if (!current || dirty & /*target*/ 2) {
    				attr(div, "data-current-target", /*target*/ ctx[1]);
    			}

    			if (!current || dirty & /*equipped*/ 4) {
    				attr(div, "data-equipped", /*equipped*/ ctx[2]);
    			}

    			if (!current || dirty & /*hit*/ 16) {
    				attr(div, "data-hit", /*hit*/ ctx[4]);
    			}

    			if (!current || dirty & /*style*/ 256) {
    				attr(div, "style", /*style*/ ctx[8]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if_blocks[current_block_type_index].d();
    			run_all(dispose);
    		}
    	};
    }

    const click_handler_1 = () => {
    	
    };

    function instance$1($$self, $$props, $$invalidate) {
    	const fallback = (value, fallback) => value ? value : fallback;
    	const bubble = createEventDispatcher();
    	const opposite = side => side === "LEFT" ? "RIGHT" : "LEFT";
    	let { attack = false } = $$props;
    	let { target = false } = $$props;
    	let { equipped = false } = $$props;
    	let { deletable = false } = $$props;
    	let { origin } = $$props;
    	let hit;
    	const stylize = modifier => `background-image: url("assets/modifiers/${modifier}.svg");`;
    	const click_handler = () => bubble("deletion");
    	const click_handler_2 = () => bubble("selection", attack);
    	const mouseenter_handler = () => bubble("hover", attack);

    	$$self.$set = $$props => {
    		if ("attack" in $$props) $$invalidate(0, attack = $$props.attack);
    		if ("target" in $$props) $$invalidate(1, target = $$props.target);
    		if ("equipped" in $$props) $$invalidate(2, equipped = $$props.equipped);
    		if ("deletable" in $$props) $$invalidate(3, deletable = $$props.deletable);
    		if ("origin" in $$props) $$invalidate(11, origin = $$props.origin);
    	};

    	let name;
    	let height;
    	let type;
    	let stance;
    	let frames;
    	let modifiers;
    	let _meta;
    	let art;
    	let style;
    	let fb;
    	let lr;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*attack*/ 1) {
    			 $$invalidate(12, name = fallback(attack.name, ""));
    		}

    		if ($$self.$$.dirty & /*attack*/ 1) {
    			 height = fallback(attack.height, "");
    		}

    		if ($$self.$$.dirty & /*attack*/ 1) {
    			 type = fallback(attack.type, "");
    		}

    		if ($$self.$$.dirty & /*attack*/ 1) {
    			 stance = fallback(attack.stance, {});
    		}

    		if ($$self.$$.dirty & /*attack*/ 1) {
    			 $$invalidate(5, frames = fallback(attack.frames, {}));
    		}

    		if ($$self.$$.dirty & /*attack*/ 1) {
    			 $$invalidate(6, modifiers = fallback(attack.modifiers, []));
    		}

    		if ($$self.$$.dirty & /*attack*/ 1) {
    			 $$invalidate(7, _meta = fallback(attack._meta, {}));
    		}

    		if ($$self.$$.dirty & /*name*/ 4096) {
    			 $$invalidate(16, art = name.split(" ").join("-").toLowerCase());
    		}

    		if ($$self.$$.dirty & /*art*/ 65536) {
    			 $$invalidate(8, style = art
    			? `background-image: url("assets/images/${art}.png")`
    			: ``);
    		}

    		if ($$self.$$.dirty & /*origin*/ 2048) {
    			 $$invalidate(18, [fb, lr] = origin ? origin.split("_") : [false, false], lr);
    		}

    		if ($$self.$$.dirty & /*attack*/ 1) {
    			 console.log(attack);
    		}

    		if ($$self.$$.dirty & /*attack, lr*/ 262145) {
    			 {
    				$$invalidate(4, hit = attack.hits === "same" ? lr : opposite(lr));

    				if (attack.hits === "both") {
    					$$invalidate(4, hit = "BOTH");
    				}
    			}
    		}
    	};

    	return [
    		attack,
    		target,
    		equipped,
    		deletable,
    		hit,
    		frames,
    		modifiers,
    		_meta,
    		style,
    		bubble,
    		stylize,
    		origin,
    		name,
    		height,
    		type,
    		stance,
    		art,
    		fb,
    		lr,
    		fallback,
    		opposite,
    		click_handler,
    		click_handler_2,
    		mouseenter_handler
    	];
    }

    class Attack_tile extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-16hj5wc-style")) add_css$2();

    		init(this, options, instance$1, create_fragment$2, safe_not_equal, {
    			attack: 0,
    			target: 1,
    			equipped: 2,
    			deletable: 3,
    			origin: 11
    		});
    	}
    }

    /* src\components\icons\stance-icon.svelte generated by Svelte v3.18.2 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-2nk5qq-style";
    	style.textContent = ".svg.svelte-2nk5qq{width:var(--stance-icon-dimension, 2rem);height:var(--stance-icon-dimension, 2rem);margin:0 1rem}.svg[data-empty=\"true\"].svelte-2nk5qq{opacity:0.3}.square.svelte-2nk5qq{stroke:black;stroke-width:0.2rem}.marker.svelte-2nk5qq{fill:#EEE}.group.svelte-2nk5qq{fill:var(--color-gray)}.group[data-glow=\"true\"].svelte-2nk5qq{fill:var(--color-gold)}";
    	append(document.head, style);
    }

    // (4:8) {#if !empty}
    function create_if_block$1(ctx) {
    	let path_1;

    	return {
    		c() {
    			path_1 = svg_element("path");
    			attr(path_1, "class", "marker svelte-2nk5qq");
    			attr(path_1, "d", /*path*/ ctx[1]);
    			attr(path_1, "stroke", "black");
    			attr(path_1, "stroke-width", "4");
    		},
    		m(target, anchor) {
    			insert(target, path_1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*path*/ 2) {
    				attr(path_1, "d", /*path*/ ctx[1]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(path_1);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let svg;
    	let g;
    	let polygon;
    	let if_block = !/*empty*/ ctx[0] && create_if_block$1(ctx);

    	return {
    		c() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			polygon = svg_element("polygon");
    			if (if_block) if_block.c();
    			attr(polygon, "class", "square svelte-2nk5qq");
    			attr(polygon, "points", "0 50, 50 0, 100 50, 50 100");
    			attr(g, "class", "group svelte-2nk5qq");
    			attr(g, "data-glow", /*glow*/ ctx[2]);
    			attr(svg, "class", "svg svelte-2nk5qq");
    			attr(svg, "viewBox", "0 0 100 100");
    			attr(svg, "data-empty", /*empty*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, g);
    			append(g, polygon);
    			if (if_block) if_block.m(g, null);
    		},
    		p(ctx, [dirty]) {
    			if (!/*empty*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(g, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*glow*/ 4) {
    				attr(g, "data-glow", /*glow*/ ctx[2]);
    			}

    			if (dirty & /*empty*/ 1) {
    				attr(svg, "data-empty", /*empty*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $followup;
    	component_subscribe($$self, followup, $$value => $$invalidate(5, $followup = $$value));
    	let { quadrant = false } = $$props;
    	let { empty = false } = $$props;
    	let { first = false } = $$props;

    	const stances = {
    		FRONT_LEFT: "40 25 L 10 10 L 25 40 Z",
    		FRONT_RIGHT: "60 25 L 90 10 75 40 Z",
    		BACK_LEFT: "40 75 L 10 90 L 25 60 Z",
    		BACK_RIGHT: "60 75 L 90 90 75 60 Z"
    	};

    	$$self.$set = $$props => {
    		if ("quadrant" in $$props) $$invalidate(3, quadrant = $$props.quadrant);
    		if ("empty" in $$props) $$invalidate(0, empty = $$props.empty);
    		if ("first" in $$props) $$invalidate(4, first = $$props.first);
    	};

    	let path;
    	let glow;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*quadrant*/ 8) {
    			 $$invalidate(1, path = `M 50 50 L ${stances[quadrant]}`);
    		}

    		if ($$self.$$.dirty & /*first, $followup, quadrant*/ 56) {
    			 $$invalidate(2, glow = first && $followup === quadrant);
    		}
    	};

    	return [empty, path, glow, quadrant, first];
    }

    class Stance_icon extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-2nk5qq-style")) add_css$3();
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, { quadrant: 3, empty: 0, first: 4 });
    	}
    }

    /* src\components\attack-string.svelte generated by Svelte v3.18.2 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-1wkxgzm-style";
    	style.textContent = ".string.svelte-1wkxgzm{display:flex;justify-content:center;align-items:center;margin:1rem 0}";
    	append(document.head, style);
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (3:4) {#each attacks as attack, index}
    function create_each_block$1(ctx) {
    	let t;
    	let current;

    	function selection_handler(...args) {
    		return /*selection_handler*/ ctx[8](/*index*/ ctx[13], /*attack*/ ctx[11], ...args);
    	}

    	function deletion_handler(...args) {
    		return /*deletion_handler*/ ctx[9](/*index*/ ctx[13], ...args);
    	}

    	const attack = new Attack_tile({
    			props: {
    				attack: /*attack*/ ctx[11],
    				deletable: true,
    				target: /*target*/ ctx[2] === /*index*/ ctx[13],
    				origin: /*originify*/ ctx[5](/*attack*/ ctx[11])
    			}
    		});

    	attack.$on("selection", selection_handler);
    	attack.$on("deletion", deletion_handler);
    	attack.$on("hover", /*hover_handler*/ ctx[10]);

    	const stance = new Stance_icon({
    			props: {
    				empty: /*attack*/ ctx[11]._meta.empty,
    				quadrant: /*empty*/ ctx[6](/*attack*/ ctx[11])
    				? /*quadrant*/ ctx[1]
    				: /*attack*/ ctx[11].stance[/*$weapon*/ ctx[3]][/*beginning*/ ctx[7](/*attack*/ ctx[11])]
    			}
    		});

    	return {
    		c() {
    			create_component(attack.$$.fragment);
    			t = space();
    			create_component(stance.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(attack, target, anchor);
    			insert(target, t, anchor);
    			mount_component(stance, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const attack_changes = {};
    			if (dirty & /*attacks*/ 1) attack_changes.attack = /*attack*/ ctx[11];
    			if (dirty & /*target*/ 4) attack_changes.target = /*target*/ ctx[2] === /*index*/ ctx[13];
    			if (dirty & /*attacks*/ 1) attack_changes.origin = /*originify*/ ctx[5](/*attack*/ ctx[11]);
    			attack.$set(attack_changes);
    			const stance_changes = {};
    			if (dirty & /*attacks*/ 1) stance_changes.empty = /*attack*/ ctx[11]._meta.empty;

    			if (dirty & /*attacks, quadrant, $weapon*/ 11) stance_changes.quadrant = /*empty*/ ctx[6](/*attack*/ ctx[11])
    			? /*quadrant*/ ctx[1]
    			: /*attack*/ ctx[11].stance[/*$weapon*/ ctx[3]][/*beginning*/ ctx[7](/*attack*/ ctx[11])];

    			stance.$set(stance_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(attack.$$.fragment, local);
    			transition_in(stance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(attack.$$.fragment, local);
    			transition_out(stance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(attack, detaching);
    			if (detaching) detach(t);
    			destroy_component(stance, detaching);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let div;
    	let t;
    	let current;

    	const stance = new Stance_icon({
    			props: {
    				quadrant: /*quadrant*/ ctx[1],
    				first: true
    			}
    		});

    	let each_value = /*attacks*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div = element("div");
    			create_component(stance.$$.fragment);
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "string svelte-1wkxgzm");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(stance, div, null);
    			append(div, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const stance_changes = {};
    			if (dirty & /*quadrant*/ 2) stance_changes.quadrant = /*quadrant*/ ctx[1];
    			stance.$set(stance_changes);

    			if (dirty & /*attacks, empty, quadrant, $weapon, beginning, target, originify, bubble*/ 255) {
    				each_value = /*attacks*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(stance.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(stance.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(stance);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $weapon;
    	component_subscribe($$self, weapon, $$value => $$invalidate(3, $weapon = $$value));
    	const bubble = createEventDispatcher();
    	let { attacks = [] } = $$props;
    	let { quadrant = "FRONT_RIGHT" } = $$props;
    	let { target } = $$props;

    	// Given a cell (a tile that can hold an attack),
    	// calculate what quadrant it belongs to.
    	const originify = attack => {
    		// Is it empty? is anything before it?
    		const { _meta } = attack;

    		const { previous } = _meta;

    		// If there's nothing before the slot we chose, we take the quadrant we were passed
    		if (!previous) {
    			return quadrant;
    		}

    		// If there is a previous, we care about generating followups from that
    		// previous attack's ending stance.
    		return previous._meta.ends;
    	};

    	const empty = attack => attack._meta.empty;
    	const beginning = attack => attack._meta.begins;

    	const selection_handler = (index, attack, { detail: atk }) => {
    		bubble("selection", {
    			column: index,
    			attack,
    			quadrant: originify(atk)
    		});
    	};

    	const deletion_handler = index => bubble("deletion", { column: index });
    	const hover_handler = ({ detail: atk }) => bubble("hover", atk);

    	$$self.$set = $$props => {
    		if ("attacks" in $$props) $$invalidate(0, attacks = $$props.attacks);
    		if ("quadrant" in $$props) $$invalidate(1, quadrant = $$props.quadrant);
    		if ("target" in $$props) $$invalidate(2, target = $$props.target);
    	};

    	return [
    		attacks,
    		quadrant,
    		target,
    		$weapon,
    		bubble,
    		originify,
    		empty,
    		beginning,
    		selection_handler,
    		deletion_handler,
    		hover_handler
    	];
    }

    class Attack_string extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1wkxgzm-style")) add_css$4();
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, { attacks: 0, quadrant: 1, target: 2 });
    	}
    }

    /* src\pages\deck-overview.svelte generated by Svelte v3.18.2 */

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-645bad-style";
    	style.textContent = ".overview.svelte-645bad{height:100%;width:100%}.deck.svelte-645bad{grid-area:deck;display:var(--deck-overview-deck-display, flex);flex-flow:column;justify-content:center;height:100%}.group.svelte-645bad{display:flex;flex-flow:row wrap}.combo.svelte-645bad{flex:1\r\n    }.combo[data-primary].svelte-645bad{flex:2}.combo[data-alternate].svelte-645bad{align-self:flex-end}";
    	append(document.head, style);
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i].quadrant;
    	child_ctx[10] = list[i].primary;
    	child_ctx[11] = list[i].alternate;
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (3:4) {#each rows as { quadrant, primary, alternate }
    function create_each_block$2(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let current;

    	function selection_handler(...args) {
    		return /*selection_handler*/ ctx[3](/*quadrant*/ ctx[9], /*primary*/ ctx[10], /*row*/ ctx[13], ...args);
    	}

    	function deletion_handler(...args) {
    		return /*deletion_handler*/ ctx[4](/*row*/ ctx[13], ...args);
    	}

    	const string0 = new Attack_string({
    			props: {
    				quadrant: /*quadrant*/ ctx[9],
    				attacks: /*primary*/ ctx[10]
    			}
    		});

    	string0.$on("selection", selection_handler);
    	string0.$on("deletion", deletion_handler);
    	string0.$on("hover", /*hover_handler*/ ctx[5]);

    	function selection_handler_1(...args) {
    		return /*selection_handler_1*/ ctx[6](/*quadrant*/ ctx[9], /*alternate*/ ctx[11], /*row*/ ctx[13], ...args);
    	}

    	function deletion_handler_1(...args) {
    		return /*deletion_handler_1*/ ctx[7](/*row*/ ctx[13], ...args);
    	}

    	const string1 = new Attack_string({
    			props: {
    				quadrant: /*quadrant*/ ctx[9],
    				attacks: /*alternate*/ ctx[11]
    			}
    		});

    	string1.$on("selection", selection_handler_1);
    	string1.$on("deletion", deletion_handler_1);
    	string1.$on("hover", /*hover_handler_1*/ ctx[8]);

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(string0.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(string1.$$.fragment);
    			t1 = space();
    			attr(div0, "class", "combo svelte-645bad");
    			attr(div0, "data-primary", "");
    			attr(div1, "class", "combo svelte-645bad");
    			attr(div1, "data-alternate", "");
    			attr(div2, "class", "group svelte-645bad");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			mount_component(string0, div0, null);
    			append(div2, t0);
    			append(div2, div1);
    			mount_component(string1, div1, null);
    			append(div2, t1);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const string0_changes = {};
    			if (dirty & /*rows*/ 1) string0_changes.quadrant = /*quadrant*/ ctx[9];
    			if (dirty & /*rows*/ 1) string0_changes.attacks = /*primary*/ ctx[10];
    			string0.$set(string0_changes);
    			const string1_changes = {};
    			if (dirty & /*rows*/ 1) string1_changes.quadrant = /*quadrant*/ ctx[9];
    			if (dirty & /*rows*/ 1) string1_changes.attacks = /*alternate*/ ctx[11];
    			string1.$set(string1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(string0.$$.fragment, local);
    			transition_in(string1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(string0.$$.fragment, local);
    			transition_out(string1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			destroy_component(string0);
    			destroy_component(string1);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div1;
    	let div0;
    	let current;
    	let each_value = /*rows*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div0, "class", "deck svelte-645bad");
    			attr(div1, "class", "overview svelte-645bad");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*rows, state, set*/ 3) {
    				each_value = /*rows*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $deck;
    	component_subscribe($$self, deck, $$value => $$invalidate(2, $deck = $$value));
    	const set = attack => selected.set(attack);

    	const selection_handler = (quadrant, primary, row, { detail }) => state.send("SELECTING", {
    		string: quadrant,
    		quadrant: detail.quadrant,
    		attack: detail.attack,
    		combo: primary,
    		slot: {
    			row,
    			column: detail.column,
    			alternate: false
    		}
    	});

    	const deletion_handler = (row, { detail }) => {
    		state.send("DELETING", {
    			slot: {
    				row,
    				column: detail.column,
    				alternate: false
    			}
    		});
    	};

    	const hover_handler = ({ detail }) => set(detail);

    	const selection_handler_1 = (quadrant, alternate, row, { detail }) => state.send("SELECTING", {
    		string: quadrant,
    		quadrant: detail.quadrant,
    		attack: detail.attack,
    		combo: alternate,
    		slot: {
    			row,
    			column: detail.column,
    			alternate: true
    		}
    	});

    	const deletion_handler_1 = (row, { detail }) => {
    		state.send("DELETING", {
    			slot: {
    				row,
    				column: detail.column,
    				alternate: true
    			}
    		});
    	};

    	const hover_handler_1 = ({ detail }) => set(detail);
    	let rows;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$deck*/ 4) {
    			 $$invalidate(0, rows = $deck);
    		}
    	};

    	return [
    		rows,
    		set,
    		$deck,
    		selection_handler,
    		deletion_handler,
    		hover_handler,
    		selection_handler_1,
    		deletion_handler_1,
    		hover_handler_1
    	];
    }

    class Deck_overview extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-645bad-style")) add_css$5();
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, {});
    	}
    }

    const action$1 = event => node => {
      const handler = () => state.send(event);

      node.addEventListener("click", handler);
      node.addEventListener("touchstart", handler);
      return () => {
        node.removeEventListener("click", handler);
        node.removeEventListener("touchstart", handler);
      };
    };

    /* src\components\attack-info.svelte generated by Svelte v3.18.2 */

    function add_css$6() {
    	var style = element("style");
    	style.id = "svelte-1vpvmy2-style";
    	style.textContent = ".metadata.svelte-1vpvmy2{grid-area:metadata;display:var(--attack-selection-attack-info-display, flex);justify-content:center;align-items:center;color:#CCC;width:var(--attack-info-container-width, 20rem)}.metadata-card.svelte-1vpvmy2{display:flex;justify-content:center;align-items:center;flex-flow:column nowrap;width:100%}.name.svelte-1vpvmy2{color:var(--color-gold);width:100%;font-size:1.2rem}.attack.svelte-1vpvmy2{width:100%;height:15rem;background-position:center;background-position:center;background-repeat:no-repeat}.stats.svelte-1vpvmy2{width:100%;color:#FFF}.stat.svelte-1vpvmy2{display:flex;justify-content:space-between;align-items:center;width:100%;height:2rem;width:100%;padding:0.5rem}";
    	append(document.head, style);
    }

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i].stat;
    	child_ctx[19] = list[i].data;
    	return child_ctx;
    }

    // (7:8) {#each stats as { stat, data }}
    function create_each_block$3(ctx) {
    	let div;
    	let span0;
    	let t0_value = /*stat*/ ctx[18] + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*data*/ ctx[19] + "";
    	let t2;
    	let t3;

    	return {
    		c() {
    			div = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			attr(div, "class", "stat svelte-1vpvmy2");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, span0);
    			append(span0, t0);
    			append(div, t1);
    			append(div, span1);
    			append(span1, t2);
    			append(div, t3);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*stats*/ 4 && t0_value !== (t0_value = /*stat*/ ctx[18] + "")) set_data(t0, t0_value);
    			if (dirty & /*stats*/ 4 && t2_value !== (t2_value = /*data*/ ctx[19] + "")) set_data(t2, t2_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let div3;
    	let div2;
    	let h1;
    	let t0_value = /*scream*/ ctx[3](/*attack*/ ctx[0].name) + "";
    	let t0;
    	let t1;
    	let div0;
    	let t2;
    	let div1;
    	let each_value = /*stats*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div3 = element("div");
    			div2 = element("div");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			div0 = element("div");
    			t2 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(h1, "class", "name svelte-1vpvmy2");
    			attr(div0, "class", "attack svelte-1vpvmy2");
    			attr(div0, "style", /*style*/ ctx[1]);
    			attr(div1, "class", "stats svelte-1vpvmy2");
    			attr(div2, "class", "metadata-card svelte-1vpvmy2");
    			attr(div3, "class", "metadata svelte-1vpvmy2");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div2);
    			append(div2, h1);
    			append(h1, t0);
    			append(div2, t1);
    			append(div2, div0);
    			append(div2, t2);
    			append(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*attack*/ 1 && t0_value !== (t0_value = /*scream*/ ctx[3](/*attack*/ ctx[0].name) + "")) set_data(t0, t0_value);

    			if (dirty & /*style*/ 2) {
    				attr(div0, "style", /*style*/ ctx[1]);
    			}

    			if (dirty & /*stats*/ 4) {
    				each_value = /*stats*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div3);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { attack = false } = $$props;
    	let { quadrant = "FRONT_RIGHT" } = $$props;
    	const scream = (data = false) => data.toUpperCase ? data.toUpperCase() : data;
    	const opposite = side => side === "LEFT" ? "RIGHT" : "LEFT";

    	$$self.$set = $$props => {
    		if ("attack" in $$props) $$invalidate(0, attack = $$props.attack);
    		if ("quadrant" in $$props) $$invalidate(4, quadrant = $$props.quadrant);
    	};

    	let name;
    	let height;
    	let type;
    	let stance;
    	let hits;
    	let fstyle;
    	let frames;
    	let modifiers;
    	let _meta;
    	let look;
    	let face;
    	let art;
    	let style;
    	let stats;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*attack*/ 1) {
    			 $$invalidate(5, { name = "", height = "mid", type = "thrust", stance = false, hits = "same", style: fstyle = "forsaken", frames = { advantage: false }, modifiers = [], _meta = { empty: true, begins: "" } } = attack, name, ($$invalidate(6, height), $$invalidate(0, attack)), ($$invalidate(7, type), $$invalidate(0, attack)), ($$invalidate(9, hits), $$invalidate(0, attack)), ($$invalidate(11, frames), $$invalidate(0, attack)));
    		}

    		if ($$self.$$.dirty & /*quadrant*/ 16) {
    			 $$invalidate(15, [look, face] = quadrant.split("_"), face);
    		}

    		if ($$self.$$.dirty & /*name*/ 32) {
    			 $$invalidate(16, art = name.split(" ").join("-").toLowerCase());
    		}

    		if ($$self.$$.dirty & /*art*/ 65536) {
    			 $$invalidate(1, style = art
    			? `background-image: url("assets/images/${art}.png")`
    			: ``);
    		}

    		if ($$self.$$.dirty & /*name, height, type, hits, face, frames*/ 35552) {
    			 $$invalidate(2, stats = [
    				{ stat: "NAME", data: scream(name) },
    				{
    					stat: "HITS",
    					data: `${scream(height)} - ${scream(type)}`
    				},
    				{ stat: "Type", data: scream(type) },
    				{
    					stat: "SIDE",
    					data: hits === "same" ? scream(face) : scream(opposite(face))
    				},
    				{ stat: "STARTUP", data: frames.startup },
    				{
    					stat: "HIT ADV",
    					data: frames.advantage.hit
    				},
    				{
    					stat: "GUARD ADV",
    					data: frames.advantage.guard
    				}
    			]);
    		}
    	};

    	return [attack, style, stats, scream, quadrant];
    }

    class Attack_info extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1vpvmy2-style")) add_css$6();
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, { attack: 0, quadrant: 4 });
    	}
    }

    /* src\pages\attack-selection.svelte generated by Svelte v3.18.2 */

    function add_css$7() {
    	var style = element("style");
    	style.id = "svelte-1dkd1xc-style";
    	style.textContent = ".container.svelte-1dkd1xc{position:relative;display:var(--attack-selection-container-display, grid);grid-template:\"structure metadata\" 1fr \r\n            / 2fr 1fr;overflow:hidden;height:100%;width:100%}.metadata.svelte-1dkd1xc{display:flex;justify-content:center;align-items:center}.heading.svelte-1dkd1xc{display:flex;justify-content:center;align-items:center;padding:1rem 0;margin-bottom:0.25rem;font-size:1.5rem;background:#222;color:white;touch-action:none}.attacks.svelte-1dkd1xc{display:grid;grid-gap:0.2rem;padding:0 0.2rem;grid-template-columns:var(--attack-selection-grid-template-columns, repeat(5, var(--attack-selection-attack-tile-width)));flex-flow:row wrap;font-size:0.8rem;flex:1}.selection.svelte-1dkd1xc{background:rgba(0,0,0, 0.3);height:65vh;width:var(--attack-selection-attack-pool-width, initial);overflow-y:scroll;padding:0 0 0.5rem 0}.structure.svelte-1dkd1xc{display:flex;justify-content:center;align-items:flex-start;grid-area:structure;overflow:hidden}.back.svelte-1dkd1xc{color:var(--color-mork-cream);background-color:var(--color-mork-red);padding:1rem;margin:2rem 1rem;outline:0;border:0;cursor:pointer;font-weight:bold}.back.svelte-1dkd1xc:hover{background-color:var(--color-mork-cream);color:var(--color-mork-red);outline:0.2rem solid var(--color-mork-red)}";
    	append(document.head, style);
    }

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i].component;
    	child_ctx[3] = list[i].children;
    	child_ctx[17] = list[i].props;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i].origin;
    	child_ctx[21] = list[i].stance;
    	child_ctx[22] = list[i].attacks;
    	return child_ctx;
    }

    // (40:24) {#each attacks as attack (attack.name)}
    function create_each_block_2(key_1, ctx) {
    	let first;
    	let current;

    	function selection_handler_1(...args) {
    		return /*selection_handler_1*/ ctx[14](/*attack*/ ctx[25], ...args);
    	}

    	function hover_handler(...args) {
    		return /*hover_handler*/ ctx[15](/*quadrant*/ ctx[21], ...args);
    	}

    	const attack = new Attack_tile({
    			props: {
    				attack: /*attack*/ ctx[25],
    				origin: /*origin*/ ctx[20],
    				equipped: /*$equipped*/ ctx[7].includes(/*attack*/ ctx[25].name),
    				facing: /*quadrant*/ ctx[21].split("_")[1]
    			}
    		});

    	attack.$on("selection", selection_handler_1);
    	attack.$on("hover", hover_handler);

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(attack.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(attack, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const attack_changes = {};
    			if (dirty & /*pool*/ 1) attack_changes.attack = /*attack*/ ctx[25];
    			if (dirty & /*pool*/ 1) attack_changes.origin = /*origin*/ ctx[20];
    			if (dirty & /*$equipped, pool*/ 129) attack_changes.equipped = /*$equipped*/ ctx[7].includes(/*attack*/ ctx[25].name);
    			if (dirty & /*pool*/ 1) attack_changes.facing = /*quadrant*/ ctx[21].split("_")[1];
    			attack.$set(attack_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(attack.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(attack.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(attack, detaching);
    		}
    	};
    }

    // (35:16) {#each pool as { origin, stance : quadrant, attacks }
    function create_each_block_1(key_1, ctx) {
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t2;
    	let current;

    	const stance = new Stance_icon({
    			props: { quadrant: /*quadrant*/ ctx[21] }
    		});

    	let each_value_2 = /*attacks*/ ctx[22];
    	const get_key = ctx => /*attack*/ ctx[25].name;

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_2(key, child_ctx));
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			div0 = element("div");
    			t0 = text("Ends in ");
    			create_component(stance.$$.fragment);
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			attr(div0, "class", "heading svelte-1dkd1xc");
    			attr(div1, "class", "attacks svelte-1dkd1xc");
    			this.first = div0;
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			append(div0, t0);
    			mount_component(stance, div0, null);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append(div1, t2);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const stance_changes = {};
    			if (dirty & /*pool*/ 1) stance_changes.quadrant = /*quadrant*/ ctx[21];
    			stance.$set(stance_changes);
    			const each_value_2 = /*attacks*/ ctx[22];
    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_2, each_1_lookup, div1, outro_and_destroy_block, create_each_block_2, t2, get_each_context_2);
    			check_outros();
    		},
    		i(local) {
    			if (current) return;
    			transition_in(stance.$$.fragment, local);

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(stance.$$.fragment, local);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div0);
    			destroy_component(stance);
    			if (detaching) detach(t1);
    			if (detaching) detach(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    // (60:12) {#if selected}
    function create_if_block$2(ctx) {
    	let current;
    	const info_spread_levels = [/*selected*/ ctx[4]];
    	let info_props = {};

    	for (let i = 0; i < info_spread_levels.length; i += 1) {
    		info_props = assign(info_props, info_spread_levels[i]);
    	}

    	const info = new Attack_info({ props: info_props });

    	return {
    		c() {
    			create_component(info.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(info, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const info_changes = (dirty & /*selected*/ 16)
    			? get_spread_update(info_spread_levels, [get_spread_object(/*selected*/ ctx[4])])
    			: {};

    			info.$set(info_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(info.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(info.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(info, detaching);
    		}
    	};
    }

    // (67:0) {#each children as { component, children, props }
    function create_each_block$4(ctx) {
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ children: /*children*/ ctx[3] }, /*props*/ ctx[17]];
    	var switch_value = /*component*/ ctx[16];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*children*/ 8)
    			? get_spread_update(switch_instance_spread_levels, [switch_instance_spread_levels[0], get_spread_object(/*props*/ ctx[17])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[16])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	let div5;
    	let div2;
    	let button;
    	let t1;
    	let div1;
    	let t2;
    	let div0;
    	let each_blocks_1 = [];
    	let each0_lookup = new Map();
    	let t3;
    	let div4;
    	let div3;
    	let t4;
    	let each1_anchor;
    	let current;
    	let dispose;

    	const string_1 = new Attack_string({
    			props: {
    				quadrant: /*string*/ ctx[1],
    				attacks: /*active*/ ctx[6],
    				target: /*slot*/ ctx[2].column,
    				"}": true
    			}
    		});

    	string_1.$on("selection", /*selection_handler*/ ctx[12]);
    	string_1.$on("deletion", /*deletion_handler*/ ctx[13]);
    	let each_value_1 = /*pool*/ ctx[0];
    	const get_key = ctx => /*quadrant*/ ctx[21];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let if_block = /*selected*/ ctx[4] && create_if_block$2(ctx);
    	let each_value = /*children*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div5 = element("div");
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Back to Overview";
    			t1 = space();
    			div1 = element("div");
    			create_component(string_1.$$.fragment);
    			t2 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();
    			div4 = element("div");
    			div3 = element("div");
    			if (if_block) if_block.c();
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			attr(button, "class", "back svelte-1dkd1xc");
    			attr(div0, "class", "selection svelte-1dkd1xc");
    			attr(div1, "class", "interactables");
    			attr(div2, "class", "structure svelte-1dkd1xc");
    			attr(div3, "class", "metadata-card");
    			attr(div4, "class", "metadata svelte-1dkd1xc");
    			attr(div5, "class", "container svelte-1dkd1xc");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div2);
    			append(div2, button);
    			append(div2, t1);
    			append(div2, div1);
    			mount_component(string_1, div1, null);
    			append(div1, t2);
    			append(div1, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append(div5, t3);
    			append(div5, div4);
    			append(div4, div3);
    			if (if_block) if_block.m(div3, null);
    			insert(target, t4, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each1_anchor, anchor);
    			current = true;
    			dispose = listen(button, "click", /*click_handler*/ ctx[11]);
    		},
    		p(ctx, [dirty]) {
    			const string_1_changes = {};
    			if (dirty & /*string*/ 2) string_1_changes.quadrant = /*string*/ ctx[1];
    			if (dirty & /*active*/ 64) string_1_changes.attacks = /*active*/ ctx[6];
    			if (dirty & /*slot*/ 4) string_1_changes.target = /*slot*/ ctx[2].column;
    			string_1.$set(string_1_changes);
    			const each_value_1 = /*pool*/ ctx[0];
    			group_outros();
    			each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, div0, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
    			check_outros();

    			if (/*selected*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div3, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*children*/ 8) {
    				each_value = /*children*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each1_anchor.parentNode, each1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(string_1.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			transition_in(if_block);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(string_1.$$.fragment, local);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			transition_out(if_block);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div5);
    			destroy_component(string_1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			if (if_block) if_block.d();
    			if (detaching) detach(t4);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each1_anchor);
    			dispose();
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $alternates;
    	let $primaries;
    	let $equipped;
    	component_subscribe($$self, alternates, $$value => $$invalidate(8, $alternates = $$value));
    	component_subscribe($$self, primaries, $$value => $$invalidate(9, $primaries = $$value));
    	component_subscribe($$self, equipped$1, $$value => $$invalidate(7, $equipped = $$value));
    	const back = action$1("BACK");
    	let { pool = false } = $$props;
    	let { children = false } = $$props;
    	let { string = false } = $$props;
    	let { slot = false } = $$props;
    	let selected = false;
    	const click_handler = () => state.send("OVERVIEW");

    	const selection_handler = ({ detail }) => {
    		$$invalidate(4, selected = { attack: detail.attack, quadrant: string });
    		state.send("NEW_TARGET", detail);
    	};

    	const deletion_handler = ({ detail }) => {
    		state.send("DELETING", {
    			slot: {
    				row: slot.row,
    				column: detail.column,
    				alternate
    			}
    		});
    	};

    	const selection_handler_1 = attack => state.send("ATTACK_SELECTED", { attack });

    	const hover_handler = (quadrant, { detail: attack }) => {
    		$$invalidate(4, selected = { attack, quadrant });
    	};

    	$$self.$set = $$props => {
    		if ("pool" in $$props) $$invalidate(0, pool = $$props.pool);
    		if ("children" in $$props) $$invalidate(3, children = $$props.children);
    		if ("string" in $$props) $$invalidate(1, string = $$props.string);
    		if ("slot" in $$props) $$invalidate(2, slot = $$props.slot);
    	};

    	let alternate;
    	let active;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*slot*/ 4) {
    			 $$invalidate(5, alternate = slot.alternate);
    		}

    		if ($$self.$$.dirty & /*alternate, $alternates, slot, $primaries*/ 804) {
    			 $$invalidate(6, active = alternate ? $alternates[slot.row] : $primaries[slot.row]);
    		}
    	};

    	return [
    		pool,
    		string,
    		slot,
    		children,
    		selected,
    		alternate,
    		active,
    		$equipped,
    		$alternates,
    		$primaries,
    		back,
    		click_handler,
    		selection_handler,
    		deletion_handler,
    		selection_handler_1,
    		hover_handler
    	];
    }

    class Attack_selection extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1dkd1xc-style")) add_css$7();
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, { pool: 0, children: 3, string: 1, slot: 2 });
    	}
    }

    /* src\components\override.svelte generated by Svelte v3.18.2 */

    function add_css$8() {
    	var style = element("style");
    	style.id = "svelte-heccmv-style";
    	style.textContent = "p.svelte-heccmv{margin:0;font-size:1.5rem}.fullscreen.svelte-heccmv{position:fixed;display:flex;flex-flow:column nowrap;top:0;justify-content:center;align-items:center;height:100%;width:100%;font-weight:700;color:white;background:rgba(0, 0, 0, 0.5)}.button.svelte-heccmv{padding:1rem;border:0.1rem solid black}.button.svelte-heccmv:hover{color:white;background-color:black;border-color:white}.modal.svelte-heccmv{display:flex;justify-content:space-around;padding:2rem;flex-flow:column nowrap;width:50%;height:25%;background-color:var(--color-mork-deep-blue);border:0.5rem solid var(--color-mork-cream)}.actions.svelte-heccmv{display:flex;justify-content:center;align-items:center}.button.svelte-heccmv{width:5rem}";
    	append(document.head, style);
    }

    function create_fragment$8(ctx) {
    	let div2;
    	let div1;
    	let p0;
    	let t1;
    	let p1;
    	let t3;
    	let div0;
    	let button0;
    	let accept_action;
    	let t5;
    	let button1;
    	let reject_action;
    	let dispose;

    	return {
    		c() {
    			div2 = element("div");
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "You've slotted a move that is incompatible with the moves that come after it.";
    			t1 = space();
    			p1 = element("p");
    			p1.textContent = "Would you like to place this move anyway?";
    			t3 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Yes";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "No";
    			attr(p0, "class", "svelte-heccmv");
    			attr(p1, "class", "svelte-heccmv");
    			attr(button0, "class", "button svelte-heccmv");
    			attr(button1, "class", "button svelte-heccmv");
    			attr(div0, "class", "actions svelte-heccmv");
    			attr(div1, "class", "modal svelte-heccmv");
    			attr(div2, "class", "fullscreen svelte-heccmv");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div1);
    			append(div1, p0);
    			append(div1, t1);
    			append(div1, p1);
    			append(div1, t3);
    			append(div1, div0);
    			append(div0, button0);
    			append(div0, t5);
    			append(div0, button1);

    			dispose = [
    				action_destroyer(accept_action = /*accept*/ ctx[0].call(null, button0)),
    				action_destroyer(reject_action = /*reject*/ ctx[1].call(null, button1))
    			];
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div2);
    			run_all(dispose);
    		}
    	};
    }

    function instance$7($$self) {
    	const accept = action$1("ACCEPT");
    	const reject = action$1("REJECT");
    	return [accept, reject];
    }

    class Override extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-heccmv-style")) add_css$8();
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, {});
    	}
    }

    const {
      assign: assign$3
    } = actions;

    const yeet = (context, {
      slot
    }) => {
      // Remove everything at slot and forward.
      remove(slot.alternate ? alternates : primaries, slot, // Nuke everything after the target move, too
      false);
    }; // Lol fuck you eslint


    const machine = Machine;
    const statechart$1 = machine({
      id: "editor",
      type: "parallel",
      context: {
        string: [],
        quadrant: "",
        pool: [],
        slot: {
          row: 0,
          column: 0
        }
      },
      states: {
        editor: {
          initial: "overview",
          on: {
            OVERVIEW: ".overview",
            // TODO: Warn the user before resetting the deck, probably.
            EQUIP_SWORD: {
              target: "editor.overview",
              actions: [() => reset(), () => equip("sword")]
            },
            EQUIP_BAREHANDS: {
              target: "editor.overview",
              actions: [() => reset(), () => equip("barehands")]
            }
          },
          states: {
            overview: {
              on: {
                SELECTING: "selecting",
                DELETING: {
                  actions: [yeet]
                }
              },
              meta: {
                component: Deck_overview
              }
            },
            selecting: {
              initial: "idle",
              on: {
                OVERVIEW: "overview",
                DELETING: {
                  actions: [yeet]
                },
                NEW_TARGET: {
                  actions: [assign$3({
                    slot: ({
                      slot
                    }, {
                      column
                    }) => Object.assign(slot, {
                      column
                    }),
                    target: (context, {
                      attack
                    }) => attack,
                    pool: ({
                      slot
                    }, {
                      quadrant
                    }) => followups(quadrant, slot.alternate ? {
                      exclude: [quadrant]
                    } : {})
                  })]
                },
                ATTACK_SELECTED: [// Error: Invalid move selected for slot (stance mismatch or duplicate)
                // TODO: A state to handle slotting already equipped moves
                // that might be elsewhere in the deck. old move gotta go, new move gotta be slotted.
                {
                  target: ".override",
                  // If this attack isn't compatible in the place we're trying to slot it,
                  // we're gonna prompt the user to override the string.
                  cond: ({
                    target
                  }, {
                    attack
                  }) => !compatible(target, attack),
                  // Assign the attack into context because if the user chooses
                  // to overwrite the string we need to know what to put
                  // there instead.
                  actions: [assign$3({
                    attack: (context, {
                      attack
                    }) => attack
                  })]
                }, // TODO: Add logic to handle duplication
                // {
                // duplicate(target, attack)
                // }
                // Success: valid move for selected slot
                {
                  actions: [// We didn't trip any invalidators, so
                  // set the attack
                  ({
                    slot
                  }, {
                    attack
                  }) => insert$1(slot.alternate ? alternates : primaries, slot, attack)]
                }],
                BACK: "overview"
              },
              entry: [// Populate the pool + target in the context object when we enter.
              assign$3({
                pool: (context, {
                  quadrant,
                  slot
                }) => followups(quadrant, slot.alternate ? {
                  exclude: [quadrant]
                } : {}),
                slot: (context, {
                  slot
                }) => slot,
                target: (context, {
                  attack
                }) => attack,
                combo: (context, {
                  combo
                }) => combo,
                quadrant: (context, {
                  quadrant
                }) => quadrant,
                string: (context, {
                  string
                }) => string
              })],
              exit: [// Empty the pool in context when we leave, because nothing will be using it.
              assign$3({
                pool: []
              })],
              meta: {
                component: Attack_selection,
                props: context => context
              },
              states: {
                idle: {},
                override: {
                  on: {
                    // Accept the override, wipe the parts of the deck
                    // that are invalidated
                    ACCEPT: {
                      target: "idle",
                      actions: [({
                        slot,
                        attack
                      }) => {
                        // Remove everything at slot and forward.
                        remove(slot.alternate ? alternates : primaries, slot, // Nuke everything after the target move, too
                        true); // Insert the new move at slot.

                        insert$1(slot.alternate ? alternates : primaries, slot, attack);
                      }]
                    },
                    // Reject the override, keep the string you were
                    // previously working with.
                    REJECT: {
                      target: "idle"
                    }
                  },
                  meta: {
                    component: Override
                  }
                }
              }
            }
          }
        },
        // This is just a dummy set of states that the
        // overlay components (side-drawer) will listen for
        // to know when to show themselves.
        menu: {
          initial: "hidden",
          on: {
            SHOW_MENU: ".shown",
            HIDE_MENU: ".hidden"
          },
          states: {
            shown: {},
            hidden: {}
          }
        }
      }
    }); // This is a store that listens to transitions on the statechart,
    // it also exposes the service it creates so xstate-component-tree can work.

    const state = statechart(statechart$1);
    state.start();

    const tree = callback => treeBuilder(state.service, callback);

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var hashids_min = createCommonjsModule(function (module, exports) {
    !function(t,e){e(exports);}("undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:commonjsGlobal,(function(t){function e(t){return function(t){if(Array.isArray(t)){for(var e=0,n=new Array(t.length);e<t.length;e++)n[e]=t[e];return n}}(t)||function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}t.__esModule=!0,t.onlyChars=t.withoutChars=t.keepUnique=t.default=void 0;var n=function(){function t(t,n,l,u){if(void 0===t&&(t=""),void 0===n&&(n=0),void 0===l&&(l="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"),void 0===u&&(u="cfhistuCFHISTU"),this.minLength=n,"number"!=typeof n)throw new TypeError("Hashids: Provided 'minLength' has to be a number (is "+typeof n+")");if("string"!=typeof t)throw new TypeError("Hashids: Provided 'salt' has to be a string (is "+typeof t+")");if("string"!=typeof l)throw new TypeError("Hashids: Provided alphabet has to be a string (is "+typeof l+")");var p=Array.from(t),c=Array.from(l),g=Array.from(u);this.salt=p;var d=o(c);if(d.length<r)throw new Error("Hashids: alphabet must contain at least "+r+" unique characters, provided: "+d);this.alphabet=a(d,g);var b,m,w,I=h(g,d);(this.seps=f(I,p),0===this.seps.length||this.alphabet.length/this.seps.length>i)&&((b=Math.ceil(this.alphabet.length/i))>this.seps.length&&(m=b-this.seps.length,(w=this.seps).push.apply(w,e(this.alphabet.slice(0,m))),this.alphabet=this.alphabet.slice(m)));this.alphabet=f(this.alphabet,p);var x=Math.ceil(this.alphabet.length/s);this.alphabet.length<3?(this.guards=this.seps.slice(0,x),this.seps=this.seps.slice(x)):(this.guards=this.alphabet.slice(0,x),this.alphabet=this.alphabet.slice(x)),this.guardsRegExp=v(this.guards),this.sepsRegExp=v(this.seps),this.allowedCharsRegExp=y([].concat(e(this.alphabet),e(this.guards),e(this.seps)));}var n=t.prototype;return n.encode=function(t){for(var n=arguments.length,r=new Array(n>1?n-1:0),i=1;i<n;i++)r[i-1]=arguments[i];var s="";return (r=Array.isArray(t)?t:[].concat(e(null!=t?[t]:[]),e(r))).length?(r.every(l)||(r=r.map((function(t){return "bigint"==typeof t||"number"==typeof t?t:d(String(t))}))),r.every(u)?this._encode(r).join(""):s):s},n.decode=function(t){return t&&"string"==typeof t&&0!==t.length?this._decode(t):[]},n.encodeHex=function(t){switch(typeof t){case"bigint":t=t.toString(16);break;case"string":if(!/^[0-9a-fA-F]+$/.test(t))return "";break;default:throw new Error("Hashids: The provided value is neither a string, nor a BigInt (got: "+typeof t+")")}var e=b(t,12,(function(t){return parseInt("1"+t,16)}));return this.encode(e)},n.decodeHex=function(t){return this.decode(t).map((function(t){return t.toString(16).slice(1)})).join("")},n._encode=function(t){var n=this,r=this.alphabet,i=t.reduce((function(t,e,n){return t+("bigint"==typeof e?Number(e%BigInt(n+100)):e%(n+100))}),0),s=[r[i%r.length]],o=s.slice(),a=this.seps,h=this.guards;if(t.forEach((function(i,h){var l,u=o.concat(n.salt,r);r=f(r,u);var c=p(i,r);if((l=s).push.apply(l,e(c)),h+1<t.length){var g=c[0].codePointAt(0)+h,d="bigint"==typeof i?Number(i%BigInt(g)):i%g;s.push(a[d%a.length]);}})),s.length<this.minLength){var l=(i+s[0].codePointAt(0))%h.length;if(s.unshift(h[l]),s.length<this.minLength){var u=(i+s[2].codePointAt(0))%h.length;s.push(h[u]);}}for(var c=Math.floor(r.length/2);s.length<this.minLength;){var g,d;r=f(r,r),(g=s).unshift.apply(g,e(r.slice(c))),(d=s).push.apply(d,e(r.slice(0,c)));var b=s.length-this.minLength;if(b>0){var v=b/2;s=s.slice(v,v+this.minLength);}}return s},n.isValidId=function(t){return this.allowedCharsRegExp.test(t)},n._decode=function(t){if(!this.isValidId(t))throw new Error("The provided ID ("+t+") is invalid, as it contains characters that do not exist in the alphabet ("+this.guards.join("")+this.seps.join("")+this.alphabet.join("")+")");var n=t.split(this.guardsRegExp),r=n[3===n.length||2===n.length?1:0];if(0===r.length)return [];var i=r[Symbol.iterator]().next().value,s=r.slice(i.length).split(this.sepsRegExp),o=this.alphabet,a=[],h=s,l=Array.isArray(h),u=0;for(h=l?h:h[Symbol.iterator]();;){var p;if(l){if(u>=h.length)break;p=h[u++];}else{if((u=h.next()).done)break;p=u.value;}var g=p,d=f(o,[i].concat(e(this.salt),e(o)).slice(0,o.length));a.push(c(Array.from(g),d)),o=d;}return this._encode(a).join("")!==t?[]:a},t}();t.default=n;var r=16,i=3.5,s=12,o=function(t){return Array.from(new Set(t))};t.keepUnique=o;var a=function(t,e){return t.filter((function(t){return !e.includes(t)}))};t.withoutChars=a;var h=function(t,e){return t.filter((function(t){return e.includes(t)}))};t.onlyChars=h;var l=function(t){return "bigint"==typeof t||!Number.isNaN(Number(t))&&Math.floor(Number(t))===t},u=function(t){return "bigint"==typeof t||t>=0&&Number.isSafeInteger(t)};function f(t,e){if(0===e.length)return t;for(var n,r=t.slice(),i=r.length-1,s=0,o=0;i>0;i--,s++){o+=n=e[s%=e.length].codePointAt(0);var a=(n+s+o)%i,h=r[i],l=r[a];r[a]=h,r[i]=l;}return r}var p=function(t,e){var n=[];if("bigint"==typeof t){var r=BigInt(e.length);do{n.unshift(e[Number(t%r)]),t/=r;}while(t>BigInt(0))}else do{n.unshift(e[t%e.length]),t=Math.floor(t/e.length);}while(t>0);return n},c=function(t,e){return t.reduce((function(n,r){var i=e.indexOf(r);if(-1===i)throw new Error("The provided ID ("+t.join("")+") is invalid, as it contains characters that do not exist in the alphabet ("+e.join("")+")");if("bigint"==typeof n)return n*BigInt(e.length)+BigInt(i);var s=n*e.length+i;if(Number.isSafeInteger(s))return s;if("function"==typeof BigInt)return BigInt(n)*BigInt(e.length)+BigInt(i);throw new Error("Unable to decode the provided string, due to lack of support for BigInt numbers in the current environment")}),0)},g=/^\+?[0-9]+$/,d=function(t){return g.test(t)?parseInt(t,10):NaN},b=function(t,e,n){return Array.from({length:Math.ceil(t.length/e)},(function(r,i){return n(t.slice(i*e,(i+1)*e))}))},v=function(t){return new RegExp(t.map((function(t){return m(t)})).sort((function(t,e){return e.length-t.length})).join("|"))},y=function(t){return new RegExp("^["+t.map((function(t){return m(t)})).sort((function(t,e){return e.length-t.length})).join("")+"]+$")},m=function(t){return t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,"\\$&")};}));
    //# sourceMappingURL=hashids.min.js.map
    });

    var Hash = unwrapExports(hashids_min);

    // Clarifier: For decoding indexes back into attacks.

    const obfuscator = new Map(all.map((attack, index) => [attack.name, index]));
    const clarifier = new Map(all.map((attack, index) => [index, attack]));
    obfuscator.set("barehands", 1000);
    clarifier.set(1000, "barehands");
    obfuscator.set("sword", 2000);
    clarifier.set(2000, "sword"); // Return 404 for empty attacks (attacks without names);

    obfuscator.set(false, 404);
    window.obfuscator = obfuscator;
    window.clarifier = clarifier; // Setup an instance of hashing.

    const encoder = new Hash("SALT_SORCERER", 4, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890");
    /**
     *
     * @param {Array} deck - An Array of objects, each containing `quadrant`, `primary`, and `alternate`
     */

    const deconstruct = deck => {
      /**
       * A flattened representation of every attack in the deck.
       */
      const flattened = deck.reduce((collector, {
        primary,
        alternate
      }) => {
        // Grab every row and concatenate it together
        collector = collector.concat([...primary, ...alternate]);
        return collector;
      }, []);
      const primitives = flattened.map(attack => attack._meta.empty ? obfuscator.get(false) : obfuscator.get(attack.name));
      return [...primitives, obfuscator.get(equipped())];
    };

    const reconstruct = flattened => {
      const [FR1, FR2, FR3, FRA, FL1, FL2, FL3, FLA, BL1, BL2, BL3, BLA, BR1, BR2, BR3, BRA, WEAPON] = flattened.map((code, index) => {
        if (!clarifier.has(code)) {
          return {};
        }

        return clarifier.get(code);
      });
      const p = [[FR1, FR2, FR3], [FL1, FL2, FL3], [BL1, BL2, BL3], [BR1, BR2, BR3]];
      const a = [[FRA], [FLA], [BLA], [BRA]];
      const ip = p.map((atks, row) => atks.map((attack, column) => ({
        attack,
        slot: {
          row,
          column
        },
        target: primaries
      })));
      const ia = a.map((atks, row) => atks.map((attack, column) => ({
        attack,
        slot: {
          row,
          column
        },
        target: alternates
      })));
      equip(WEAPON);
      return {
        primaries: ip,
        alternates: ia
      };
    };
    /**
     *
     * @param {Array} attacks - A flat array of all attacks in the deck, and the weapon for the deck
     *  [FR1, FR2, FR3, FRALT, FL1, FL2, FL3, FLALT, BL1, BL2, BL3, BLALT, BR1, BR2, BR3, BRALT]
     *
     * @returns An encoded Hex-esque string that can be later decoded.
     */


    const encode = deck => {
      const encodable = deconstruct(deck);
      return encoder.encode(encodable);
    };
    /**
     *
     * @param {String} Hash - A Hash to convert to an array
     *
     * @return {Array} - An array of attack objects ready to hydrate the deck
     */


    const decode = hash => {
      const constructable = encoder.decode(hash);
      return reconstruct(constructable);
    };

    /**
     *
     * @param {Object} - Object containing `{ primaries: ..., alternates: ...}`
     * each key is an array of arrays containing `{ attack: ..., slot: ..., target: ... }`
     */

    const hydrate = data => {
      const {
        primaries: _p,
        alternates: _a
      } = data;
      primaries.update(data => {
        _p.forEach(row => {
          row.forEach(({
            attack,
            slot
          }) => {
            insert$1(primaries, slot, attack);
          });
        });

        return data;
      });
      alternates.update(data => {
        _a.forEach(row => {
          row.forEach(({
            attack,
            slot
          }) => {
            insert$1(alternates, slot, attack);
          });
        });

        return data;
      });
    };

    window._hydrate = hydrate;

    /* src\components\menu\hamburger.svelte generated by Svelte v3.18.2 */

    function add_css$9() {
    	var style = element("style");
    	style.id = "svelte-1qt5y8z-style";
    	style.textContent = ".container.svelte-1qt5y8z{width:3rem;height:3rem;position:relative;z-index:10}.svg.svelte-1qt5y8z{width:100%;height:100%;stroke:var(--color-mork-cream);fill:var(--color-mork-cream)}";
    	append(document.head, style);
    }

    // (7:8) {:else}
    function create_else_block$1(ctx) {
    	let path;

    	return {
    		c() {
    			path = svg_element("path");
    			attr(path, "d", "M10 10, L 90 90 M 90 10 L 10 90");
    			attr(path, "stroke-width", "5");
    		},
    		m(target, anchor) {
    			insert(target, path, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(path);
    		}
    	};
    }

    // (3:8) {#if !shown}
    function create_if_block$3(ctx) {
    	let rect0;
    	let rect1;
    	let rect2;

    	return {
    		c() {
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			rect2 = svg_element("rect");
    			attr(rect0, "class", "rect-x");
    			attr(rect0, "y", "30");
    			attr(rect0, "width", "100");
    			attr(rect0, "height", "20");
    			attr(rect1, "class", "rect-x");
    			attr(rect1, "y", "60");
    			attr(rect1, "width", "100");
    			attr(rect1, "height", "20");
    			attr(rect2, "class", "rect");
    			attr(rect2, "width", "100");
    			attr(rect2, "height", "20");
    		},
    		m(target, anchor) {
    			insert(target, rect0, anchor);
    			insert(target, rect1, anchor);
    			insert(target, rect2, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(rect0);
    			if (detaching) detach(rect1);
    			if (detaching) detach(rect2);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let div;
    	let svg;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (!/*shown*/ ctx[0]) return create_if_block$3;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			svg = svg_element("svg");
    			if_block.c();
    			attr(svg, "class", "svg svelte-1qt5y8z");
    			attr(svg, "viewBox", "0 0 100 80");
    			attr(svg, "width", "40");
    			attr(svg, "height", "40");
    			attr(div, "class", "container svelte-1qt5y8z");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, svg);
    			if_block.m(svg, null);
    			dispose = listen(div, "click", /*toggle*/ ctx[1]);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(svg, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if_block.d();
    			dispose();
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $state;
    	component_subscribe($$self, state, $$value => $$invalidate(2, $state = $$value));

    	const toggle = () => {
    		if (!shown) {
    			return state.send("SHOW_MENU");
    		}

    		return state.send("HIDE_MENU");
    	};

    	let shown;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$state*/ 4) {
    			 $$invalidate(0, shown = $state.matches("menu.shown"));
    		}
    	};

    	return [shown, toggle];
    }

    class Hamburger extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1qt5y8z-style")) add_css$9();
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, {});
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    var clipboard = createCommonjsModule(function (module, exports) {
    /*!
     * clipboard.js v2.0.4
     * https://zenorocha.github.io/clipboard.js
     * 
     * Licensed MIT © Zeno Rocha
     */
    (function webpackUniversalModuleDefinition(root, factory) {
    	module.exports = factory();
    })(commonjsGlobal, function() {
    return /******/ (function(modules) { // webpackBootstrap
    /******/ 	// The module cache
    /******/ 	var installedModules = {};
    /******/
    /******/ 	// The require function
    /******/ 	function __webpack_require__(moduleId) {
    /******/
    /******/ 		// Check if module is in cache
    /******/ 		if(installedModules[moduleId]) {
    /******/ 			return installedModules[moduleId].exports;
    /******/ 		}
    /******/ 		// Create a new module (and put it into the cache)
    /******/ 		var module = installedModules[moduleId] = {
    /******/ 			i: moduleId,
    /******/ 			l: false,
    /******/ 			exports: {}
    /******/ 		};
    /******/
    /******/ 		// Execute the module function
    /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    /******/
    /******/ 		// Flag the module as loaded
    /******/ 		module.l = true;
    /******/
    /******/ 		// Return the exports of the module
    /******/ 		return module.exports;
    /******/ 	}
    /******/
    /******/
    /******/ 	// expose the modules object (__webpack_modules__)
    /******/ 	__webpack_require__.m = modules;
    /******/
    /******/ 	// expose the module cache
    /******/ 	__webpack_require__.c = installedModules;
    /******/
    /******/ 	// define getter function for harmony exports
    /******/ 	__webpack_require__.d = function(exports, name, getter) {
    /******/ 		if(!__webpack_require__.o(exports, name)) {
    /******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
    /******/ 		}
    /******/ 	};
    /******/
    /******/ 	// define __esModule on exports
    /******/ 	__webpack_require__.r = function(exports) {
    /******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
    /******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    /******/ 		}
    /******/ 		Object.defineProperty(exports, '__esModule', { value: true });
    /******/ 	};
    /******/
    /******/ 	// create a fake namespace object
    /******/ 	// mode & 1: value is a module id, require it
    /******/ 	// mode & 2: merge all properties of value into the ns
    /******/ 	// mode & 4: return value when already ns object
    /******/ 	// mode & 8|1: behave like require
    /******/ 	__webpack_require__.t = function(value, mode) {
    /******/ 		if(mode & 1) value = __webpack_require__(value);
    /******/ 		if(mode & 8) return value;
    /******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
    /******/ 		var ns = Object.create(null);
    /******/ 		__webpack_require__.r(ns);
    /******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
    /******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
    /******/ 		return ns;
    /******/ 	};
    /******/
    /******/ 	// getDefaultExport function for compatibility with non-harmony modules
    /******/ 	__webpack_require__.n = function(module) {
    /******/ 		var getter = module && module.__esModule ?
    /******/ 			function getDefault() { return module['default']; } :
    /******/ 			function getModuleExports() { return module; };
    /******/ 		__webpack_require__.d(getter, 'a', getter);
    /******/ 		return getter;
    /******/ 	};
    /******/
    /******/ 	// Object.prototype.hasOwnProperty.call
    /******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
    /******/
    /******/ 	// __webpack_public_path__
    /******/ 	__webpack_require__.p = "";
    /******/
    /******/
    /******/ 	// Load entry module and return exports
    /******/ 	return __webpack_require__(__webpack_require__.s = 0);
    /******/ })
    /************************************************************************/
    /******/ ([
    /* 0 */
    /***/ (function(module, exports, __webpack_require__) {


    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _clipboardAction = __webpack_require__(1);

    var _clipboardAction2 = _interopRequireDefault(_clipboardAction);

    var _tinyEmitter = __webpack_require__(3);

    var _tinyEmitter2 = _interopRequireDefault(_tinyEmitter);

    var _goodListener = __webpack_require__(4);

    var _goodListener2 = _interopRequireDefault(_goodListener);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    /**
     * Base class which takes one or more elements, adds event listeners to them,
     * and instantiates a new `ClipboardAction` on each click.
     */
    var Clipboard = function (_Emitter) {
        _inherits(Clipboard, _Emitter);

        /**
         * @param {String|HTMLElement|HTMLCollection|NodeList} trigger
         * @param {Object} options
         */
        function Clipboard(trigger, options) {
            _classCallCheck(this, Clipboard);

            var _this = _possibleConstructorReturn(this, (Clipboard.__proto__ || Object.getPrototypeOf(Clipboard)).call(this));

            _this.resolveOptions(options);
            _this.listenClick(trigger);
            return _this;
        }

        /**
         * Defines if attributes would be resolved using internal setter functions
         * or custom functions that were passed in the constructor.
         * @param {Object} options
         */


        _createClass(Clipboard, [{
            key: 'resolveOptions',
            value: function resolveOptions() {
                var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

                this.action = typeof options.action === 'function' ? options.action : this.defaultAction;
                this.target = typeof options.target === 'function' ? options.target : this.defaultTarget;
                this.text = typeof options.text === 'function' ? options.text : this.defaultText;
                this.container = _typeof(options.container) === 'object' ? options.container : document.body;
            }

            /**
             * Adds a click event listener to the passed trigger.
             * @param {String|HTMLElement|HTMLCollection|NodeList} trigger
             */

        }, {
            key: 'listenClick',
            value: function listenClick(trigger) {
                var _this2 = this;

                this.listener = (0, _goodListener2.default)(trigger, 'click', function (e) {
                    return _this2.onClick(e);
                });
            }

            /**
             * Defines a new `ClipboardAction` on each click event.
             * @param {Event} e
             */

        }, {
            key: 'onClick',
            value: function onClick(e) {
                var trigger = e.delegateTarget || e.currentTarget;

                if (this.clipboardAction) {
                    this.clipboardAction = null;
                }

                this.clipboardAction = new _clipboardAction2.default({
                    action: this.action(trigger),
                    target: this.target(trigger),
                    text: this.text(trigger),
                    container: this.container,
                    trigger: trigger,
                    emitter: this
                });
            }

            /**
             * Default `action` lookup function.
             * @param {Element} trigger
             */

        }, {
            key: 'defaultAction',
            value: function defaultAction(trigger) {
                return getAttributeValue('action', trigger);
            }

            /**
             * Default `target` lookup function.
             * @param {Element} trigger
             */

        }, {
            key: 'defaultTarget',
            value: function defaultTarget(trigger) {
                var selector = getAttributeValue('target', trigger);

                if (selector) {
                    return document.querySelector(selector);
                }
            }

            /**
             * Returns the support of the given action, or all actions if no action is
             * given.
             * @param {String} [action]
             */

        }, {
            key: 'defaultText',


            /**
             * Default `text` lookup function.
             * @param {Element} trigger
             */
            value: function defaultText(trigger) {
                return getAttributeValue('text', trigger);
            }

            /**
             * Destroy lifecycle.
             */

        }, {
            key: 'destroy',
            value: function destroy() {
                this.listener.destroy();

                if (this.clipboardAction) {
                    this.clipboardAction.destroy();
                    this.clipboardAction = null;
                }
            }
        }], [{
            key: 'isSupported',
            value: function isSupported() {
                var action = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ['copy', 'cut'];

                var actions = typeof action === 'string' ? [action] : action;
                var support = !!document.queryCommandSupported;

                actions.forEach(function (action) {
                    support = support && !!document.queryCommandSupported(action);
                });

                return support;
            }
        }]);

        return Clipboard;
    }(_tinyEmitter2.default);

    /**
     * Helper function to retrieve attribute value.
     * @param {String} suffix
     * @param {Element} element
     */


    function getAttributeValue(suffix, element) {
        var attribute = 'data-clipboard-' + suffix;

        if (!element.hasAttribute(attribute)) {
            return;
        }

        return element.getAttribute(attribute);
    }

    module.exports = Clipboard;

    /***/ }),
    /* 1 */
    /***/ (function(module, exports, __webpack_require__) {


    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _select = __webpack_require__(2);

    var _select2 = _interopRequireDefault(_select);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    /**
     * Inner class which performs selection from either `text` or `target`
     * properties and then executes copy or cut operations.
     */
    var ClipboardAction = function () {
        /**
         * @param {Object} options
         */
        function ClipboardAction(options) {
            _classCallCheck(this, ClipboardAction);

            this.resolveOptions(options);
            this.initSelection();
        }

        /**
         * Defines base properties passed from constructor.
         * @param {Object} options
         */


        _createClass(ClipboardAction, [{
            key: 'resolveOptions',
            value: function resolveOptions() {
                var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

                this.action = options.action;
                this.container = options.container;
                this.emitter = options.emitter;
                this.target = options.target;
                this.text = options.text;
                this.trigger = options.trigger;

                this.selectedText = '';
            }

            /**
             * Decides which selection strategy is going to be applied based
             * on the existence of `text` and `target` properties.
             */

        }, {
            key: 'initSelection',
            value: function initSelection() {
                if (this.text) {
                    this.selectFake();
                } else if (this.target) {
                    this.selectTarget();
                }
            }

            /**
             * Creates a fake textarea element, sets its value from `text` property,
             * and makes a selection on it.
             */

        }, {
            key: 'selectFake',
            value: function selectFake() {
                var _this = this;

                var isRTL = document.documentElement.getAttribute('dir') == 'rtl';

                this.removeFake();

                this.fakeHandlerCallback = function () {
                    return _this.removeFake();
                };
                this.fakeHandler = this.container.addEventListener('click', this.fakeHandlerCallback) || true;

                this.fakeElem = document.createElement('textarea');
                // Prevent zooming on iOS
                this.fakeElem.style.fontSize = '12pt';
                // Reset box model
                this.fakeElem.style.border = '0';
                this.fakeElem.style.padding = '0';
                this.fakeElem.style.margin = '0';
                // Move element out of screen horizontally
                this.fakeElem.style.position = 'absolute';
                this.fakeElem.style[isRTL ? 'right' : 'left'] = '-9999px';
                // Move element to the same position vertically
                var yPosition = window.pageYOffset || document.documentElement.scrollTop;
                this.fakeElem.style.top = yPosition + 'px';

                this.fakeElem.setAttribute('readonly', '');
                this.fakeElem.value = this.text;

                this.container.appendChild(this.fakeElem);

                this.selectedText = (0, _select2.default)(this.fakeElem);
                this.copyText();
            }

            /**
             * Only removes the fake element after another click event, that way
             * a user can hit `Ctrl+C` to copy because selection still exists.
             */

        }, {
            key: 'removeFake',
            value: function removeFake() {
                if (this.fakeHandler) {
                    this.container.removeEventListener('click', this.fakeHandlerCallback);
                    this.fakeHandler = null;
                    this.fakeHandlerCallback = null;
                }

                if (this.fakeElem) {
                    this.container.removeChild(this.fakeElem);
                    this.fakeElem = null;
                }
            }

            /**
             * Selects the content from element passed on `target` property.
             */

        }, {
            key: 'selectTarget',
            value: function selectTarget() {
                this.selectedText = (0, _select2.default)(this.target);
                this.copyText();
            }

            /**
             * Executes the copy operation based on the current selection.
             */

        }, {
            key: 'copyText',
            value: function copyText() {
                var succeeded = void 0;

                try {
                    succeeded = document.execCommand(this.action);
                } catch (err) {
                    succeeded = false;
                }

                this.handleResult(succeeded);
            }

            /**
             * Fires an event based on the copy operation result.
             * @param {Boolean} succeeded
             */

        }, {
            key: 'handleResult',
            value: function handleResult(succeeded) {
                this.emitter.emit(succeeded ? 'success' : 'error', {
                    action: this.action,
                    text: this.selectedText,
                    trigger: this.trigger,
                    clearSelection: this.clearSelection.bind(this)
                });
            }

            /**
             * Moves focus away from `target` and back to the trigger, removes current selection.
             */

        }, {
            key: 'clearSelection',
            value: function clearSelection() {
                if (this.trigger) {
                    this.trigger.focus();
                }

                window.getSelection().removeAllRanges();
            }

            /**
             * Sets the `action` to be performed which can be either 'copy' or 'cut'.
             * @param {String} action
             */

        }, {
            key: 'destroy',


            /**
             * Destroy lifecycle.
             */
            value: function destroy() {
                this.removeFake();
            }
        }, {
            key: 'action',
            set: function set() {
                var action = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'copy';

                this._action = action;

                if (this._action !== 'copy' && this._action !== 'cut') {
                    throw new Error('Invalid "action" value, use either "copy" or "cut"');
                }
            }

            /**
             * Gets the `action` property.
             * @return {String}
             */
            ,
            get: function get() {
                return this._action;
            }

            /**
             * Sets the `target` property using an element
             * that will be have its content copied.
             * @param {Element} target
             */

        }, {
            key: 'target',
            set: function set(target) {
                if (target !== undefined) {
                    if (target && (typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' && target.nodeType === 1) {
                        if (this.action === 'copy' && target.hasAttribute('disabled')) {
                            throw new Error('Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute');
                        }

                        if (this.action === 'cut' && (target.hasAttribute('readonly') || target.hasAttribute('disabled'))) {
                            throw new Error('Invalid "target" attribute. You can\'t cut text from elements with "readonly" or "disabled" attributes');
                        }

                        this._target = target;
                    } else {
                        throw new Error('Invalid "target" value, use a valid Element');
                    }
                }
            }

            /**
             * Gets the `target` property.
             * @return {String|HTMLElement}
             */
            ,
            get: function get() {
                return this._target;
            }
        }]);

        return ClipboardAction;
    }();

    module.exports = ClipboardAction;

    /***/ }),
    /* 2 */
    /***/ (function(module, exports) {

    function select(element) {
        var selectedText;

        if (element.nodeName === 'SELECT') {
            element.focus();

            selectedText = element.value;
        }
        else if (element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
            var isReadOnly = element.hasAttribute('readonly');

            if (!isReadOnly) {
                element.setAttribute('readonly', '');
            }

            element.select();
            element.setSelectionRange(0, element.value.length);

            if (!isReadOnly) {
                element.removeAttribute('readonly');
            }

            selectedText = element.value;
        }
        else {
            if (element.hasAttribute('contenteditable')) {
                element.focus();
            }

            var selection = window.getSelection();
            var range = document.createRange();

            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);

            selectedText = selection.toString();
        }

        return selectedText;
    }

    module.exports = select;


    /***/ }),
    /* 3 */
    /***/ (function(module, exports) {

    function E () {
      // Keep this empty so it's easier to inherit from
      // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
    }

    E.prototype = {
      on: function (name, callback, ctx) {
        var e = this.e || (this.e = {});

        (e[name] || (e[name] = [])).push({
          fn: callback,
          ctx: ctx
        });

        return this;
      },

      once: function (name, callback, ctx) {
        var self = this;
        function listener () {
          self.off(name, listener);
          callback.apply(ctx, arguments);
        }
        listener._ = callback;
        return this.on(name, listener, ctx);
      },

      emit: function (name) {
        var data = [].slice.call(arguments, 1);
        var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
        var i = 0;
        var len = evtArr.length;

        for (i; i < len; i++) {
          evtArr[i].fn.apply(evtArr[i].ctx, data);
        }

        return this;
      },

      off: function (name, callback) {
        var e = this.e || (this.e = {});
        var evts = e[name];
        var liveEvents = [];

        if (evts && callback) {
          for (var i = 0, len = evts.length; i < len; i++) {
            if (evts[i].fn !== callback && evts[i].fn._ !== callback)
              liveEvents.push(evts[i]);
          }
        }

        // Remove event from queue to prevent memory leak
        // Suggested by https://github.com/lazd
        // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

        (liveEvents.length)
          ? e[name] = liveEvents
          : delete e[name];

        return this;
      }
    };

    module.exports = E;


    /***/ }),
    /* 4 */
    /***/ (function(module, exports, __webpack_require__) {

    var is = __webpack_require__(5);
    var delegate = __webpack_require__(6);

    /**
     * Validates all params and calls the right
     * listener function based on its target type.
     *
     * @param {String|HTMLElement|HTMLCollection|NodeList} target
     * @param {String} type
     * @param {Function} callback
     * @return {Object}
     */
    function listen(target, type, callback) {
        if (!target && !type && !callback) {
            throw new Error('Missing required arguments');
        }

        if (!is.string(type)) {
            throw new TypeError('Second argument must be a String');
        }

        if (!is.fn(callback)) {
            throw new TypeError('Third argument must be a Function');
        }

        if (is.node(target)) {
            return listenNode(target, type, callback);
        }
        else if (is.nodeList(target)) {
            return listenNodeList(target, type, callback);
        }
        else if (is.string(target)) {
            return listenSelector(target, type, callback);
        }
        else {
            throw new TypeError('First argument must be a String, HTMLElement, HTMLCollection, or NodeList');
        }
    }

    /**
     * Adds an event listener to a HTML element
     * and returns a remove listener function.
     *
     * @param {HTMLElement} node
     * @param {String} type
     * @param {Function} callback
     * @return {Object}
     */
    function listenNode(node, type, callback) {
        node.addEventListener(type, callback);

        return {
            destroy: function() {
                node.removeEventListener(type, callback);
            }
        }
    }

    /**
     * Add an event listener to a list of HTML elements
     * and returns a remove listener function.
     *
     * @param {NodeList|HTMLCollection} nodeList
     * @param {String} type
     * @param {Function} callback
     * @return {Object}
     */
    function listenNodeList(nodeList, type, callback) {
        Array.prototype.forEach.call(nodeList, function(node) {
            node.addEventListener(type, callback);
        });

        return {
            destroy: function() {
                Array.prototype.forEach.call(nodeList, function(node) {
                    node.removeEventListener(type, callback);
                });
            }
        }
    }

    /**
     * Add an event listener to a selector
     * and returns a remove listener function.
     *
     * @param {String} selector
     * @param {String} type
     * @param {Function} callback
     * @return {Object}
     */
    function listenSelector(selector, type, callback) {
        return delegate(document.body, selector, type, callback);
    }

    module.exports = listen;


    /***/ }),
    /* 5 */
    /***/ (function(module, exports) {

    /**
     * Check if argument is a HTML element.
     *
     * @param {Object} value
     * @return {Boolean}
     */
    exports.node = function(value) {
        return value !== undefined
            && value instanceof HTMLElement
            && value.nodeType === 1;
    };

    /**
     * Check if argument is a list of HTML elements.
     *
     * @param {Object} value
     * @return {Boolean}
     */
    exports.nodeList = function(value) {
        var type = Object.prototype.toString.call(value);

        return value !== undefined
            && (type === '[object NodeList]' || type === '[object HTMLCollection]')
            && ('length' in value)
            && (value.length === 0 || exports.node(value[0]));
    };

    /**
     * Check if argument is a string.
     *
     * @param {Object} value
     * @return {Boolean}
     */
    exports.string = function(value) {
        return typeof value === 'string'
            || value instanceof String;
    };

    /**
     * Check if argument is a function.
     *
     * @param {Object} value
     * @return {Boolean}
     */
    exports.fn = function(value) {
        var type = Object.prototype.toString.call(value);

        return type === '[object Function]';
    };


    /***/ }),
    /* 6 */
    /***/ (function(module, exports, __webpack_require__) {

    var closest = __webpack_require__(7);

    /**
     * Delegates event to a selector.
     *
     * @param {Element} element
     * @param {String} selector
     * @param {String} type
     * @param {Function} callback
     * @param {Boolean} useCapture
     * @return {Object}
     */
    function _delegate(element, selector, type, callback, useCapture) {
        var listenerFn = listener.apply(this, arguments);

        element.addEventListener(type, listenerFn, useCapture);

        return {
            destroy: function() {
                element.removeEventListener(type, listenerFn, useCapture);
            }
        }
    }

    /**
     * Delegates event to a selector.
     *
     * @param {Element|String|Array} [elements]
     * @param {String} selector
     * @param {String} type
     * @param {Function} callback
     * @param {Boolean} useCapture
     * @return {Object}
     */
    function delegate(elements, selector, type, callback, useCapture) {
        // Handle the regular Element usage
        if (typeof elements.addEventListener === 'function') {
            return _delegate.apply(null, arguments);
        }

        // Handle Element-less usage, it defaults to global delegation
        if (typeof type === 'function') {
            // Use `document` as the first parameter, then apply arguments
            // This is a short way to .unshift `arguments` without running into deoptimizations
            return _delegate.bind(null, document).apply(null, arguments);
        }

        // Handle Selector-based usage
        if (typeof elements === 'string') {
            elements = document.querySelectorAll(elements);
        }

        // Handle Array-like based usage
        return Array.prototype.map.call(elements, function (element) {
            return _delegate(element, selector, type, callback, useCapture);
        });
    }

    /**
     * Finds closest match and invokes callback.
     *
     * @param {Element} element
     * @param {String} selector
     * @param {String} type
     * @param {Function} callback
     * @return {Function}
     */
    function listener(element, selector, type, callback) {
        return function(e) {
            e.delegateTarget = closest(e.target, selector);

            if (e.delegateTarget) {
                callback.call(element, e);
            }
        }
    }

    module.exports = delegate;


    /***/ }),
    /* 7 */
    /***/ (function(module, exports) {

    var DOCUMENT_NODE_TYPE = 9;

    /**
     * A polyfill for Element.matches()
     */
    if (typeof Element !== 'undefined' && !Element.prototype.matches) {
        var proto = Element.prototype;

        proto.matches = proto.matchesSelector ||
                        proto.mozMatchesSelector ||
                        proto.msMatchesSelector ||
                        proto.oMatchesSelector ||
                        proto.webkitMatchesSelector;
    }

    /**
     * Finds the closest parent that matches a selector.
     *
     * @param {Element} element
     * @param {String} selector
     * @return {Function}
     */
    function closest (element, selector) {
        while (element && element.nodeType !== DOCUMENT_NODE_TYPE) {
            if (typeof element.matches === 'function' &&
                element.matches(selector)) {
              return element;
            }
            element = element.parentNode;
        }
    }

    module.exports = closest;


    /***/ })
    /******/ ]);
    });
    });

    var clipboard$1 = unwrapExports(clipboard);

    /* src\components\menu\side-drawer.svelte generated by Svelte v3.18.2 */

    function add_css$a() {
    	var style = element("style");
    	style.id = "svelte-vm8r8d-style";
    	style.textContent = ".title.svelte-vm8r8d{display:flex;justify-content:center;align-items:center;padding:1rem 1rem 1rem 4rem;color:var(--color-mork-cream);font-size:4rem}.container.svelte-vm8r8d{display:flex;flex-flow:column nowrap;position:absolute;z-index:5;left:0;top:0;height:100%;width:25%;padding:0 1rem 1rem 1rem;background:#21243d;border-right:0.5rem solid var(--color-mork-cream);color:var(--color-mork-cream)}.section.svelte-vm8r8d{padding:0.5rem 0;display:flex;flex-flow:column nowrap}.section-header.svelte-vm8r8d{padding:0.5rem 0;border-bottom:0.2rem solid var(--color-mork-cream)}.section-content.svelte-vm8r8d{display:flex;flex-flow:row wrap}.button.svelte-vm8r8d{outline:0;height:3rem;border:0;margin:0.25rem;font-weight:bold;flex:1;cursor:pointer;opacity:0.6}.button[data-active=\"true\"].svelte-vm8r8d{background-color:var(--color-mork-red);color:var(--color-mork-cream);opacity:1}.deck.svelte-vm8r8d{height:2rem;width:100%;font-size:0.6rem;font-weight:bold}";
    	append(document.head, style);
    }

    // (1:0) {#if show}
    function create_if_block$4(ctx) {
    	let div5;
    	let div0;
    	let t1;
    	let div2;
    	let h10;
    	let t3;
    	let div1;
    	let button0;
    	let t4;
    	let barehands_action;
    	let t5;
    	let button1;
    	let t6;
    	let sword_action;
    	let t7;
    	let div4;
    	let h11;
    	let t9;
    	let div3;
    	let input;
    	let div5_transition;
    	let current;
    	let dispose;

    	return {
    		c() {
    			div5 = element("div");
    			div0 = element("div");
    			div0.textContent = "Absolver.dev";
    			t1 = space();
    			div2 = element("div");
    			h10 = element("h1");
    			h10.textContent = "Build a deck for...";
    			t3 = space();
    			div1 = element("div");
    			button0 = element("button");
    			t4 = text("Barehands");
    			t5 = space();
    			button1 = element("button");
    			t6 = text("Sword");
    			t7 = space();
    			div4 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Share your deck";
    			t9 = space();
    			div3 = element("div");
    			input = element("input");
    			attr(div0, "class", "title svelte-vm8r8d");
    			attr(h10, "class", "section-header svelte-vm8r8d");
    			attr(button0, "class", "button barehands svelte-vm8r8d");
    			attr(button0, "data-active", /*hands*/ ctx[2]);
    			attr(button1, "class", "button sword svelte-vm8r8d");
    			attr(button1, "data-active", /*blade*/ ctx[3]);
    			attr(div1, "class", "section-content svelte-vm8r8d");
    			attr(div2, "class", "section svelte-vm8r8d");
    			attr(h11, "class", "section-header svelte-vm8r8d");
    			attr(input, "data-clipboard-dependent", "");
    			attr(input, "class", "deck svelte-vm8r8d");
    			attr(input, "type", "text");
    			attr(div3, "class", "section-content svelte-vm8r8d");
    			attr(div4, "class", "section share svelte-vm8r8d");
    			attr(div5, "class", "container svelte-vm8r8d");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div0);
    			append(div5, t1);
    			append(div5, div2);
    			append(div2, h10);
    			append(div2, t3);
    			append(div2, div1);
    			append(div1, button0);
    			append(button0, t4);
    			append(div1, t5);
    			append(div1, button1);
    			append(button1, t6);
    			append(div5, t7);
    			append(div5, div4);
    			append(div4, h11);
    			append(div4, t9);
    			append(div4, div3);
    			append(div3, input);
    			set_input_value(input, /*url*/ ctx[1]);
    			current = true;

    			dispose = [
    				action_destroyer(barehands_action = /*barehands*/ ctx[5].call(null, button0)),
    				action_destroyer(sword_action = /*sword*/ ctx[4].call(null, button1)),
    				listen(input, "input", /*input_input_handler*/ ctx[10])
    			];
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*hands*/ 4) {
    				attr(button0, "data-active", /*hands*/ ctx[2]);
    			}

    			if (!current || dirty & /*blade*/ 8) {
    				attr(button1, "data-active", /*blade*/ ctx[3]);
    			}

    			if (dirty & /*url*/ 2 && input.value !== /*url*/ ctx[1]) {
    				set_input_value(input, /*url*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div5_transition) div5_transition = create_bidirectional_transition(div5, fly, { x: -500 }, true);
    				div5_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			if (!div5_transition) div5_transition = create_bidirectional_transition(div5, fly, { x: -500 }, false);
    			div5_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div5);
    			if (detaching && div5_transition) div5_transition.end();
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$a(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[0] && create_if_block$4(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*show*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $state;
    	let $deck;
    	let $weapon;
    	component_subscribe($$self, state, $$value => $$invalidate(6, $state = $$value));
    	component_subscribe($$self, deck, $$value => $$invalidate(7, $deck = $$value));
    	component_subscribe($$self, weapon, $$value => $$invalidate(8, $weapon = $$value));
    	const clippy = new clipboard$1("[data-clipboard-dependent]");
    	const sword = action$1("EQUIP_SWORD");
    	const barehands = action$1("EQUIP_BAREHANDS");
    	clippy.on("success", () => copied = true);

    	function input_input_handler() {
    		url = this.value;
    		($$invalidate(1, url), $$invalidate(7, $deck));
    	}

    	let show;
    	let url;
    	let hands;
    	let blade;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$state*/ 64) {
    			 $$invalidate(0, show = $state.matches("menu.shown"));
    		}

    		if ($$self.$$.dirty & /*$deck*/ 128) {
    			 $$invalidate(1, url = `https://absolver.dev/?deck=${encode($deck)}`);
    		}

    		if ($$self.$$.dirty & /*$weapon*/ 256) {
    			 $$invalidate(2, hands = $weapon === "barehands");
    		}

    		if ($$self.$$.dirty & /*$weapon*/ 256) {
    			 $$invalidate(3, blade = $weapon === "sword");
    		}
    	};

    	return [
    		show,
    		url,
    		hands,
    		blade,
    		sword,
    		barehands,
    		$state,
    		$deck,
    		$weapon,
    		clippy,
    		input_input_handler
    	];
    }

    class Side_drawer extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-vm8r8d-style")) add_css$a();
    		init(this, options, instance$9, create_fragment$a, safe_not_equal, {});
    	}
    }

    /* src\pages\application.svelte generated by Svelte v3.18.2 */

    function add_css$b() {
    	var style = element("style");
    	style.id = "svelte-1eypssi-style";
    	style.textContent = ".variables.svelte-1eypssi{--color-mork-cream:#f7f4ea;--color-mork-dark-blue:#5F6A85;--color-mork-deep-blue:#21243d;--color-mork-red:#e98FA0;--color-gold:#FBF5DC;--color-gray:#545255;--color-gray-darker:#444;--color-gray-lighter:#677479;--color-equipped-icon-background:#e0c220;--attack-info-container-width:16rem;--deck-overview-attack-tile-height:6.5rem;--deck-overview-attack-tile-width:6.5rem;--attack-selection-attack-tile-width:6.5rem;--attack-selection-attack-tile-height:6.5rem}.application.svelte-1eypssi{display:flex;flex-flow:column nowrap;height:100%;font-family:roboto, sans-serif;background:rgb(59,66,84);background:linear-gradient(315deg, rgba(59,66,84,1) 25%, rgba(95,106,133,1) 75%);transition:background-position 250ms ease}.application[data-overview=\"false\"].svelte-1eypssi{background-position:100% 0}.menu.svelte-1eypssi{display:flex;justify-content:flex-start;align-items:center;padding:1.8rem 1rem 1rem 1rem}.weapon.svelte-1eypssi{font-size:2rem;margin-left:1rem;color:var(--color-mork-cream)}.content.svelte-1eypssi{padding:1.5rem 0;overflow:hidden;flex:1}@media only screen \r\n    and (min-device-width: 320px) \r\n    and (max-device-width: 568px)\r\n    and (-webkit-min-device-pixel-ratio: 2){.variables.svelte-1eypssi{--deck-overview-attack-tile-height:16rem;--deck-overview-attack-tile-width:16rem;--deck-overview-deck-display:block;--attack-selection-attack-tile-height:10rem;--attack-selection-attack-tile-width:10rem;--attack-selection-container-display:block;--attack-selection-attack-pool-width:100%;--attack-selection-grid-template-columns:repeat(3, 1fr);--attack-selection-attack-info-display:none}.application.svelte-1eypssi{background:none}.content.svelte-1eypssi{overflow:auto}}.footer.svelte-1eypssi{display:flex;height:3rem;padding:0 1rem;font-size:1.2rem;color:var(--color-mork-cream)\r\n    }a.svelte-1eypssi{color:var(--color-mork-deep-blue)\r\n    }";
    	append(document.head, style);
    }

    function create_fragment$b(ctx) {
    	let t0;
    	let div3;
    	let div0;
    	let t1;
    	let span0;
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let t5;
    	let div2;
    	let current;
    	let dispose;
    	const hamburger = new Hamburger({});
    	const sidedrawer = new Side_drawer({});
    	const switch_instance_spread_levels = [{ children: /*children*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			t0 = space();
    			div3 = element("div");
    			div0 = element("div");
    			create_component(hamburger.$$.fragment);
    			t1 = space();
    			span0 = element("span");
    			t2 = text(/*$weapon*/ ctx[4]);
    			t3 = space();
    			create_component(sidedrawer.$$.fragment);
    			t4 = space();
    			div1 = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t5 = space();
    			div2 = element("div");
    			div2.innerHTML = `<span class="text">Authored by <a href="https://twitter.com/morklympious" class="svelte-1eypssi">Morklympious</a></span>`;
    			attr(span0, "class", "weapon svelte-1eypssi");
    			attr(div0, "class", "menu svelte-1eypssi");
    			attr(div1, "class", "content svelte-1eypssi");
    			attr(div2, "class", "footer svelte-1eypssi");
    			attr(div3, "class", "application variables svelte-1eypssi");
    			attr(div3, "data-overview", /*overview*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, div3, anchor);
    			append(div3, div0);
    			mount_component(hamburger, div0, null);
    			append(div0, t1);
    			append(div0, span0);
    			append(span0, t2);
    			append(div0, t3);
    			mount_component(sidedrawer, div0, null);
    			append(div3, t4);
    			append(div3, div1);

    			if (switch_instance) {
    				mount_component(switch_instance, div1, null);
    			}

    			append(div3, t5);
    			append(div3, div2);
    			current = true;

    			dispose = [
    				listen(document.body, "keyup", /*keyup_handler*/ ctx[12]),
    				listen(div1, "click", /*conditionalhide*/ ctx[5])
    			];
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*$weapon*/ 16) set_data(t2, /*$weapon*/ ctx[4]);

    			const switch_instance_changes = (dirty & /*children, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*children*/ 2 && { children: /*children*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div1, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}

    			if (!current || dirty & /*overview*/ 8) {
    				attr(div3, "data-overview", /*overview*/ ctx[3]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(hamburger.$$.fragment, local);
    			transition_in(sidedrawer.$$.fragment, local);
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(hamburger.$$.fragment, local);
    			transition_out(sidedrawer.$$.fragment, local);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(div3);
    			destroy_component(hamburger);
    			destroy_component(sidedrawer);
    			if (switch_instance) destroy_component(switch_instance);
    			run_all(dispose);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let $state;
    	let $weapon;
    	component_subscribe($$self, state, $$value => $$invalidate(8, $state = $$value));
    	component_subscribe($$self, weapon, $$value => $$invalidate(4, $weapon = $$value));
    	let components = [];

    	// We only care about the first chart
    	tree(([structure]) => {
    		$$invalidate(6, components = structure.children);
    	});

    	// We hydrate the deck if a shared param exists, This is what allows you to share decks.
    	const params = new URLSearchParams(window.location.search);

    	const deck = params.has("deck") ? params.get("deck") : false;

    	if (deck) {
    		const decoded = decode(params.get("deck"));
    		hydrate(decoded);
    	}

    	const conditionalhide = () => $state.matches("menu.shown")
    	? state.send("HIDE_MENU")
    	: false;

    	const keyup_handler = ({ keyCode }) => {
    		console.log(keyCode);
    		keyCode === 27 ? state.send("BACK") : false;
    	};

    	let root;
    	let component;
    	let children;
    	let props;
    	let overview;
    	let selecting;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*components*/ 64) {
    			 $$invalidate(7, [root = false] = components, root);
    		}

    		if ($$self.$$.dirty & /*root*/ 128) {
    			 $$invalidate(0, { component, children, props } = root, component, (($$invalidate(1, children), $$invalidate(7, root)), $$invalidate(6, components)), (($$invalidate(2, props), $$invalidate(7, root)), $$invalidate(6, components)));
    		}

    		if ($$self.$$.dirty & /*$state*/ 256) {
    			 $$invalidate(3, overview = $state.matches("overview"));
    		}

    		if ($$self.$$.dirty & /*overview*/ 8) {
    			 selecting = !overview;
    		}
    	};

    	return [
    		component,
    		children,
    		props,
    		overview,
    		$weapon,
    		conditionalhide,
    		components,
    		root,
    		$state,
    		selecting,
    		params,
    		deck,
    		keyup_handler
    	];
    }

    class Application extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1eypssi-style")) add_css$b();
    		init(this, options, instance$a, create_fragment$b, safe_not_equal, {});
    	}
    }

    new Application({
      target: document.body
    });

}());