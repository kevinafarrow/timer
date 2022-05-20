
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
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
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
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
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { stylesheet } = info;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                info.rules = {};
            });
            managed_styles.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                started = true;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicInOut(t) {
        return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
    }

    function blur(node, { delay = 0, duration = 400, easing = cubicInOut, amount = 5, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const f = style.filter === 'none' ? '' : style.filter;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `opacity: ${target_opacity - (od * u)}; filter: ${f} blur(${u * amount}px);`
        };
    }
    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/Planet.svelte generated by Svelte v3.48.0 */
    const file$4 = "src/Planet.svelte";

    // (7:0) {#if (timer.pos !== 0)}
    function create_if_block$1(ctx) {
    	let g1;
    	let clipPath;
    	let circle0;
    	let circle0_r_value;
    	let clipPath_id_value;
    	let mask;
    	let rect;
    	let rect_transform_value;
    	let if_block0_anchor;
    	let if_block1_anchor;
    	let if_block2_anchor;
    	let mask_id_value;
    	let g0;
    	let circle1;
    	let circle1_r_value;
    	let g0_clip_path_value;
    	let g0_mask_value;
    	let circle2;
    	let circle2_r_value;
    	let circle3;
    	let circle3_cx_value;
    	let circle3_transform_value;
    	let circle4;
    	let circle4_cx_value;
    	let circle4_transform_value;
    	let g1_class_value;
    	let g1_intro;
    	let g1_outro;
    	let current;
    	let if_block0 = /*timer*/ ctx[0].pos - 90 < 0 && create_if_block_4(ctx);
    	let if_block1 = /*timer*/ ctx[0].pos - 90 > 0 && create_if_block_3(ctx);
    	let if_block2 = /*timer*/ ctx[0].pos - 90 > 90 && create_if_block_2(ctx);
    	let if_block3 = /*timer*/ ctx[0].pos - 90 > 180 && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			g1 = svg_element("g");
    			clipPath = svg_element("clipPath");
    			circle0 = svg_element("circle");
    			mask = svg_element("mask");
    			rect = svg_element("rect");
    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			if (if_block3) if_block3.c();
    			g0 = svg_element("g");
    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");
    			circle3 = svg_element("circle");
    			circle4 = svg_element("circle");
    			attr_dev(circle0, "id", "theCircle");
    			attr_dev(circle0, "r", circle0_r_value = /*timer*/ ctx[0].border);
    			add_location(circle0, file$4, 9, 6, 253);
    			attr_dev(clipPath, "id", clipPath_id_value = /*timer*/ ctx[0].clip);
    			add_location(clipPath, file$4, 8, 4, 218);
    			attr_dev(rect, "width", "100");
    			attr_dev(rect, "height", "100");
    			attr_dev(rect, "transform", rect_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 180) + ")");
    			attr_dev(rect, "fill", "#fff");
    			add_location(rect, file$4, 12, 6, 348);
    			attr_dev(mask, "id", mask_id_value = /*timer*/ ctx[0].mask);
    			add_location(mask, file$4, 11, 4, 317);
    			attr_dev(circle1, "class", "lane-outer svelte-19568h8");
    			attr_dev(circle1, "r", circle1_r_value = /*timer*/ ctx[0].border - 2);
    			add_location(circle1, file$4, 27, 6, 989);
    			attr_dev(g0, "class", "lane");
    			attr_dev(g0, "clip-path", g0_clip_path_value = "url(#" + /*timer*/ ctx[0].clip + ")");
    			attr_dev(g0, "mask", g0_mask_value = "url(#" + /*timer*/ ctx[0].mask + ")");
    			add_location(g0, file$4, 26, 4, 909);
    			attr_dev(circle2, "class", "lane-inner svelte-19568h8");
    			attr_dev(circle2, "r", circle2_r_value = /*timer*/ ctx[0].border - 3);
    			attr_dev(circle2, "rx", "-10");
    			add_location(circle2, file$4, 29, 4, 1054);
    			attr_dev(circle3, "class", "planet svelte-19568h8");
    			attr_dev(circle3, "r", "2.5");
    			attr_dev(circle3, "cx", circle3_cx_value = /*timer*/ ctx[0].border - 2.5);
    			attr_dev(circle3, "transform", circle3_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 90) + ")");
    			add_location(circle3, file$4, 30, 4, 1119);
    			attr_dev(circle4, "class", "hole svelte-19568h8");
    			attr_dev(circle4, "r", "1.5");
    			attr_dev(circle4, "cx", circle4_cx_value = /*timer*/ ctx[0].border - 2.5);
    			attr_dev(circle4, "transform", circle4_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 90) + ")");
    			add_location(circle4, file$4, 31, 4, 1219);
    			attr_dev(g1, "class", g1_class_value = "" + (null_to_empty(/*timer*/ ctx[0].lane) + " svelte-19568h8"));
    			add_location(g1, file$4, 7, 2, 117);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g1, anchor);
    			append_dev(g1, clipPath);
    			append_dev(clipPath, circle0);
    			append_dev(g1, mask);
    			append_dev(mask, rect);
    			if (if_block0) if_block0.m(mask, null);
    			append_dev(mask, if_block0_anchor);
    			if (if_block1) if_block1.m(mask, null);
    			append_dev(mask, if_block1_anchor);
    			if (if_block2) if_block2.m(mask, null);
    			append_dev(mask, if_block2_anchor);
    			if (if_block3) if_block3.m(mask, null);
    			append_dev(g1, g0);
    			append_dev(g0, circle1);
    			append_dev(g1, circle2);
    			append_dev(g1, circle3);
    			append_dev(g1, circle4);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*timer*/ 1 && circle0_r_value !== (circle0_r_value = /*timer*/ ctx[0].border)) {
    				attr_dev(circle0, "r", circle0_r_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && clipPath_id_value !== (clipPath_id_value = /*timer*/ ctx[0].clip)) {
    				attr_dev(clipPath, "id", clipPath_id_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && rect_transform_value !== (rect_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 180) + ")")) {
    				attr_dev(rect, "transform", rect_transform_value);
    			}

    			if (/*timer*/ ctx[0].pos - 90 < 0) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(mask, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*timer*/ ctx[0].pos - 90 > 0) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(mask, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*timer*/ ctx[0].pos - 90 > 90) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_2(ctx);
    					if_block2.c();
    					if_block2.m(mask, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*timer*/ ctx[0].pos - 90 > 180) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_1$1(ctx);
    					if_block3.c();
    					if_block3.m(mask, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (!current || dirty & /*timer*/ 1 && mask_id_value !== (mask_id_value = /*timer*/ ctx[0].mask)) {
    				attr_dev(mask, "id", mask_id_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && circle1_r_value !== (circle1_r_value = /*timer*/ ctx[0].border - 2)) {
    				attr_dev(circle1, "r", circle1_r_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && g0_clip_path_value !== (g0_clip_path_value = "url(#" + /*timer*/ ctx[0].clip + ")")) {
    				attr_dev(g0, "clip-path", g0_clip_path_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && g0_mask_value !== (g0_mask_value = "url(#" + /*timer*/ ctx[0].mask + ")")) {
    				attr_dev(g0, "mask", g0_mask_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && circle2_r_value !== (circle2_r_value = /*timer*/ ctx[0].border - 3)) {
    				attr_dev(circle2, "r", circle2_r_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && circle3_cx_value !== (circle3_cx_value = /*timer*/ ctx[0].border - 2.5)) {
    				attr_dev(circle3, "cx", circle3_cx_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && circle3_transform_value !== (circle3_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 90) + ")")) {
    				attr_dev(circle3, "transform", circle3_transform_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && circle4_cx_value !== (circle4_cx_value = /*timer*/ ctx[0].border - 2.5)) {
    				attr_dev(circle4, "cx", circle4_cx_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && circle4_transform_value !== (circle4_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 90) + ")")) {
    				attr_dev(circle4, "transform", circle4_transform_value);
    			}

    			if (!current || dirty & /*timer*/ 1 && g1_class_value !== (g1_class_value = "" + (null_to_empty(/*timer*/ ctx[0].lane) + " svelte-19568h8"))) {
    				attr_dev(g1, "class", g1_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (g1_outro) g1_outro.end(1);
    				g1_intro = create_in_transition(g1, blur, { duration: 1000 });
    				g1_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (g1_intro) g1_intro.invalidate();
    			g1_outro = create_out_transition(g1, fade, { delay: 200, duration: 1000 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (detaching && g1_outro) g1_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(7:0) {#if (timer.pos !== 0)}",
    		ctx
    	});

    	return block;
    }

    // (14:6) {#if (timer.pos - 90) < 0}
    function create_if_block_4(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "width", "102");
    			attr_dev(rect, "height", "102");
    			attr_dev(rect, "transform", "rotate(-180)");
    			attr_dev(rect, "fill", "#000");
    			add_location(rect, file$4, 14, 8, 471);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(14:6) {#if (timer.pos - 90) < 0}",
    		ctx
    	});

    	return block;
    }

    // (17:6) {#if (timer.pos - 90) > 0}
    function create_if_block_3(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "width", "102");
    			attr_dev(rect, "height", "102");
    			attr_dev(rect, "transform", "rotate(-90)");
    			attr_dev(rect, "fill", "#fff");
    			add_location(rect, file$4, 17, 8, 593);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(17:6) {#if (timer.pos - 90) > 0}",
    		ctx
    	});

    	return block;
    }

    // (20:6) {#if (timer.pos - 90) > 90}
    function create_if_block_2(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "width", "102");
    			attr_dev(rect, "height", "102");
    			attr_dev(rect, "fill", "#fff");
    			add_location(rect, file$4, 20, 8, 715);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(20:6) {#if (timer.pos - 90) > 90}",
    		ctx
    	});

    	return block;
    }

    // (23:6) {#if (timer.pos - 90) > 180}
    function create_if_block_1$1(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "width", "102");
    			attr_dev(rect, "height", "102");
    			attr_dev(rect, "transform", "rotate(90)");
    			attr_dev(rect, "fill", "#fff");
    			add_location(rect, file$4, 23, 8, 814);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(23:6) {#if (timer.pos - 90) > 180}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*timer*/ ctx[0].pos !== 0 && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*timer*/ ctx[0].pos !== 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*timer*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Planet', slots, []);
    	let { timer } = $$props;
    	const writable_props = ['timer'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Planet> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('timer' in $$props) $$invalidate(0, timer = $$props.timer);
    	};

    	$$self.$capture_state = () => ({ fade, blur, timer });

    	$$self.$inject_state = $$props => {
    		if ('timer' in $$props) $$invalidate(0, timer = $$props.timer);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [timer];
    }

    class Planet extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { timer: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Planet",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*timer*/ ctx[0] === undefined && !('timer' in props)) {
    			console.warn("<Planet> was created without expected prop 'timer'");
    		}
    	}

    	get timer() {
    		throw new Error("<Planet>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timer(value) {
    		throw new Error("<Planet>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Hand.svelte generated by Svelte v3.48.0 */

    const file$3 = "src/Hand.svelte";

    function create_fragment$3(ctx) {
    	let g;
    	let rect;
    	let circle0;
    	let circle1;
    	let g_transform_value;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			rect = svg_element("rect");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			attr_dev(rect, "width", 98 + 12);
    			attr_dev(rect, "height", "1");
    			attr_dev(rect, "y", "-.5");
    			attr_dev(rect, "x", "-12");
    			add_location(rect, file$3, 5, 2, 96);
    			attr_dev(circle0, "class", "hand-outer-circle svelte-6lnd1r");
    			attr_dev(circle0, "r", "2");
    			add_location(circle0, file$3, 11, 2, 170);
    			attr_dev(circle1, "class", "hand-inner-circle svelte-6lnd1r");
    			attr_dev(circle1, "r", "1");
    			add_location(circle1, file$3, 12, 2, 213);
    			attr_dev(g, "class", "hand svelte-6lnd1r");
    			attr_dev(g, "transform", g_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 90) + ")");
    			add_location(g, file$3, 4, 0, 40);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, rect);
    			append_dev(g, circle0);
    			append_dev(g, circle1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*timer*/ 1 && g_transform_value !== (g_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 90) + ")")) {
    				attr_dev(g, "transform", g_transform_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Hand', slots, []);
    	let { timer } = $$props;
    	const writable_props = ['timer'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Hand> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('timer' in $$props) $$invalidate(0, timer = $$props.timer);
    	};

    	$$self.$capture_state = () => ({ timer });

    	$$self.$inject_state = $$props => {
    		if ('timer' in $$props) $$invalidate(0, timer = $$props.timer);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [timer];
    }

    class Hand extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { timer: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hand",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*timer*/ ctx[0] === undefined && !('timer' in props)) {
    			console.warn("<Hand> was created without expected prop 'timer'");
    		}
    	}

    	get timer() {
    		throw new Error("<Hand>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timer(value) {
    		throw new Error("<Hand>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Clock.svelte generated by Svelte v3.48.0 */
    const file$2 = "src/Clock.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (51:6) {#each [1, 2, 3, 4, 5] as subsubmarker}
    function create_each_block_3(ctx) {
    	let rect0;
    	let rect1;

    	const block = {
    		c: function create() {
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			attr_dev(rect0, "class", "submarker svelte-be4ftk");
    			attr_dev(rect0, "width", "3");
    			attr_dev(rect0, "height", "1");
    			attr_dev(rect0, "y", "-.5");
    			attr_dev(rect0, "x", "95");
    			attr_dev(rect0, "transform", "rotate(" + (6 * (/*marker*/ ctx[5] + /*submarker*/ ctx[8]) + /*subsubmarker*/ ctx[11]) + ")");
    			add_location(rect0, file$2, 51, 8, 1147);
    			attr_dev(rect1, "class", "submarker svelte-be4ftk");
    			attr_dev(rect1, "width", "3");
    			attr_dev(rect1, "height", "1");
    			attr_dev(rect1, "y", "-.5");
    			attr_dev(rect1, "x", "95");
    			attr_dev(rect1, "transform", "rotate(" + (6 * (/*marker*/ ctx[5] + /*submarker*/ ctx[8]) - /*subsubmarker*/ ctx[11]) + ")");
    			add_location(rect1, file$2, 58, 8, 1338);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect0, anchor);
    			insert_dev(target, rect1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect0);
    			if (detaching) detach_dev(rect1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(51:6) {#each [1, 2, 3, 4, 5] as subsubmarker}",
    		ctx
    	});

    	return block;
    }

    // (43:4) {#each [1, 2, 3, 4] as submarker}
    function create_each_block_2(ctx) {
    	let rect;
    	let each_1_anchor;
    	let each_value_3 = [1, 2, 3, 4, 5];
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < 5; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");

    			for (let i = 0; i < 5; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(rect, "class", "submarker svelte-be4ftk");
    			attr_dev(rect, "width", "5");
    			attr_dev(rect, "height", "1");
    			attr_dev(rect, "y", "-.5");
    			attr_dev(rect, "x", "93");
    			attr_dev(rect, "transform", "rotate(" + 6 * (/*marker*/ ctx[5] + /*submarker*/ ctx[8]) + ")");
    			add_location(rect, file$2, 43, 6, 937);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);

    			for (let i = 0; i < 5; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*Array*/ 0) {
    				each_value_3 = [1, 2, 3, 4, 5];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < 5; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < 5; i += 1) {
    					each_blocks[i].d(1);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(43:4) {#each [1, 2, 3, 4] as submarker}",
    		ctx
    	});

    	return block;
    }

    // (35:2) {#each [...Array(12).keys()].map((i) => {return i * 5}) as marker}
    function create_each_block_1(ctx) {
    	let rect;
    	let each_1_anchor;
    	let each_value_2 = [1, 2, 3, 4];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(rect, "class", "marker svelte-be4ftk");
    			attr_dev(rect, "width", "7");
    			attr_dev(rect, "height", "1");
    			attr_dev(rect, "y", "-.5");
    			attr_dev(rect, "x", "91");
    			attr_dev(rect, "transform", "rotate(" + 30 * /*marker*/ ctx[5] + ")");
    			add_location(rect, file$2, 35, 4, 765);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*Array*/ 0) {
    				each_value_2 = [1, 2, 3, 4];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < 4; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < 4; i += 1) {
    					each_blocks[i].d(1);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(35:2) {#each [...Array(12).keys()].map((i) => {return i * 5}) as marker}",
    		ctx
    	});

    	return block;
    }

    // (77:2) {:else}
    function create_else_block(ctx) {
    	let hand;
    	let current;

    	hand = new Hand({
    			props: { timer: { "pos": 0 } },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(hand.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(hand, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hand.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hand.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hand, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(77:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (73:30) 
    function create_if_block_1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*timers*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*timers*/ 1) {
    				each_value = /*timers*/ ctx[0];
    				validate_each_argument(each_value);
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
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(73:30) ",
    		ctx
    	});

    	return block;
    }

    // (70:2) {#if timers.length === 1}
    function create_if_block(ctx) {
    	let hand;
    	let p;
    	let t_value = /*timers*/ ctx[0].length + "";
    	let t;
    	let current;

    	hand = new Hand({
    			props: { timer: /*timers*/ ctx[0][0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(hand.$$.fragment);
    			p = svg_element("p");
    			t = text(t_value);
    			add_location(p, file$2, 71, 4, 1620);
    		},
    		m: function mount(target, anchor) {
    			mount_component(hand, target, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const hand_changes = {};
    			if (dirty & /*timers*/ 1) hand_changes.timer = /*timers*/ ctx[0][0];
    			hand.$set(hand_changes);
    			if ((!current || dirty & /*timers*/ 1) && t_value !== (t_value = /*timers*/ ctx[0].length + "")) set_data_dev(t, t_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hand.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hand.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hand, detaching);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(70:2) {#if timers.length === 1}",
    		ctx
    	});

    	return block;
    }

    // (74:4) {#each timers as timer}
    function create_each_block$1(ctx) {
    	let planet;
    	let current;

    	planet = new Planet({
    			props: { timer: /*timer*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(planet.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(planet, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const planet_changes = {};
    			if (dirty & /*timers*/ 1) planet_changes.timer = /*timer*/ ctx[2];
    			planet.$set(planet_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(planet.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(planet.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(planet, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(74:4) {#each timers as timer}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let svg;
    	let each_1_anchor;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let each_value_1 = [...Array(12).keys()].map(func$1);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const if_block_creators = [create_if_block, create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*timers*/ ctx[0].length === 1) return 0;
    		if (/*timers*/ ctx[0].length > 1) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			if_block.c();
    			attr_dev(svg, "viewBox", "-100 -100 200 200");
    			attr_dev(svg, "class", "svelte-be4ftk");
    			add_location(svg, file$2, 33, 0, 658);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			append_dev(svg, each_1_anchor);
    			if_blocks[current_block_type_index].m(svg, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Array*/ 0) {
    				each_value_1 = [...Array(12).keys()].map(func$1);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

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
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(svg, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks, detaching);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func$1 = i => {
    	return i * 5;
    };

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Clock', slots, []);
    	let { timers = [] } = $$props;

    	onMount(() => {
    		const interval = setInterval(
    			() => {
    				updatePositions();
    			},
    			10
    		);

    		return () => {
    			clearInterval(interval);
    		};
    	});

    	onDestroy(() => {
    		$$invalidate(0, timers = []);
    	});

    	function updatePositions() {
    		for (var i = 0; i < timers.length; i++) {
    			const step = 360 / (timers[i].duration * 100);
    			const newPos = timers[i].pos - step;

    			if (newPos <= 0) {
    				$$invalidate(0, timers[i].pos = 0, timers);
    			} else {
    				$$invalidate(0, timers[i].pos = newPos, timers);
    			}
    		}
    	}
    	const writable_props = ['timers'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Clock> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('timers' in $$props) $$invalidate(0, timers = $$props.timers);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		Planet,
    		Hand,
    		timers,
    		updatePositions
    	});

    	$$self.$inject_state = $$props => {
    		if ('timers' in $$props) $$invalidate(0, timers = $$props.timers);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [timers];
    }

    class Clock extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { timers: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Clock",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get timers() {
    		throw new Error("<Clock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timers(value) {
    		throw new Error("<Clock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
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
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const count = writable(6000);

    /* src/NumberPad.svelte generated by Svelte v3.48.0 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/NumberPad.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (36:2) {#each [...Array(9).keys()].map((i) => {return i + 1}) as number}
    function create_each_block(ctx) {
    	let button;
    	let t_value = /*number*/ ctx[13] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[7](/*number*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "svelte-1bevqz9");
    			add_location(button, file$1, 36, 3, 1107);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(36:2) {#each [...Array(9).keys()].map((i) => {return i + 1}) as number}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let h10;
    	let t0;
    	let t1;
    	let h11;
    	let t2;
    	let t3;
    	let h12;
    	let t4;
    	let t5;
    	let t6;
    	let button0;
    	let t8;
    	let button1;
    	let t10;
    	let button2;
    	let mounted;
    	let dispose;
    	let each_value = [...Array(9).keys()].map(func);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			h10 = element("h1");
    			t0 = text(/*displayHours*/ ctx[3]);
    			t1 = space();
    			h11 = element("h1");
    			t2 = text(/*displayMinutes*/ ctx[2]);
    			t3 = space();
    			h12 = element("h1");
    			t4 = text(/*displaySeconds*/ ctx[1]);
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			button0 = element("button");
    			button0.textContent = "clear";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "0";
    			t10 = space();
    			button2 = element("button");
    			button2.textContent = "submit";
    			attr_dev(h10, "class", "svelte-1bevqz9");
    			add_location(h10, file$1, 32, 2, 956);
    			attr_dev(h11, "class", "svelte-1bevqz9");
    			add_location(h11, file$1, 33, 2, 982);
    			attr_dev(h12, "class", "svelte-1bevqz9");
    			add_location(h12, file$1, 34, 2, 1010);
    			attr_dev(button0, "class", "svelte-1bevqz9");
    			add_location(button0, file$1, 39, 1, 1177);
    			attr_dev(button1, "class", "svelte-1bevqz9");
    			add_location(button1, file$1, 40, 1, 1218);
    			attr_dev(button2, "class", "svelte-1bevqz9");
    			add_location(button2, file$1, 41, 1, 1265);
    			attr_dev(div, "class", "keypad svelte-1bevqz9");
    			add_location(div, file$1, 31, 0, 933);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h10);
    			append_dev(h10, t0);
    			append_dev(div, t1);
    			append_dev(div, h11);
    			append_dev(h11, t2);
    			append_dev(div, t3);
    			append_dev(div, h12);
    			append_dev(h12, t4);
    			append_dev(div, t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t6);
    			append_dev(div, button0);
    			append_dev(div, t8);
    			append_dev(div, button1);
    			append_dev(div, t10);
    			append_dev(div, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*clear*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[8], false, false, false),
    					listen_dev(
    						button2,
    						"click",
    						function () {
    							if (is_function(/*createTimer*/ ctx[4](/*timerTime*/ ctx[0]))) /*createTimer*/ ctx[4](/*timerTime*/ ctx[0]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*displayHours*/ 8) set_data_dev(t0, /*displayHours*/ ctx[3]);
    			if (dirty & /*displayMinutes*/ 4) set_data_dev(t2, /*displayMinutes*/ ctx[2]);
    			if (dirty & /*displaySeconds*/ 2) set_data_dev(t4, /*displaySeconds*/ ctx[1]);

    			if (dirty & /*select, Array*/ 32) {
    				each_value = [...Array(9).keys()].map(func);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t6);
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = i => {
    	return i + 1;
    };

    function instance$1($$self, $$props, $$invalidate) {
    	let timerHours;
    	let timerMinutes;
    	let timerSeconds;
    	let displayHours;
    	let displayMinutes;
    	let displaySeconds;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NumberPad', slots, []);
    	let timerTime = '000000';
    	const dispatch = createEventDispatcher();

    	function createTimer() {
    		const newTimerDuration = parseInt(timerHours * 60 * 60) + parseInt(timerMinutes * 60) + parseInt(timerSeconds);
    		console.log('Timer duration: ' + newTimerDuration);
    		dispatch('newTimer', { time: newTimerDuration });
    		clear();
    	}

    	function select(n) {
    		console.log('you pressed: ' + n);
    		$$invalidate(0, timerTime = timerTime.substring(1) + n);
    		console.log('timerTime is now: ' + timerTime);
    	}

    	function clear() {
    		$$invalidate(0, timerTime = '000000');
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<NumberPad> was created with unknown prop '${key}'`);
    	});

    	const click_handler = number => select(number);
    	const click_handler_1 = () => select(0);

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		timerTime,
    		dispatch,
    		createTimer,
    		select,
    		clear,
    		timerSeconds,
    		timerMinutes,
    		timerHours,
    		displaySeconds,
    		displayMinutes,
    		displayHours
    	});

    	$$self.$inject_state = $$props => {
    		if ('timerTime' in $$props) $$invalidate(0, timerTime = $$props.timerTime);
    		if ('timerSeconds' in $$props) timerSeconds = $$props.timerSeconds;
    		if ('timerMinutes' in $$props) timerMinutes = $$props.timerMinutes;
    		if ('timerHours' in $$props) timerHours = $$props.timerHours;
    		if ('displaySeconds' in $$props) $$invalidate(1, displaySeconds = $$props.displaySeconds);
    		if ('displayMinutes' in $$props) $$invalidate(2, displayMinutes = $$props.displayMinutes);
    		if ('displayHours' in $$props) $$invalidate(3, displayHours = $$props.displayHours);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*timerTime*/ 1) {
    			timerHours = timerTime.substring(0, 2);
    		}

    		if ($$self.$$.dirty & /*timerTime*/ 1) {
    			timerMinutes = timerTime.substring(2, 4);
    		}

    		if ($$self.$$.dirty & /*timerTime*/ 1) {
    			timerSeconds = timerTime.substring(4, 6);
    		}

    		if ($$self.$$.dirty & /*timerTime*/ 1) {
    			$$invalidate(3, displayHours = timerTime.substring(0, 2) + 'h');
    		}

    		if ($$self.$$.dirty & /*timerTime*/ 1) {
    			$$invalidate(2, displayMinutes = timerTime.substring(2, 4) + 'm');
    		}

    		if ($$self.$$.dirty & /*timerTime*/ 1) {
    			$$invalidate(1, displaySeconds = timerTime.substring(4, 6) + 's');
    		}
    	};

    	return [
    		timerTime,
    		displaySeconds,
    		displayMinutes,
    		displayHours,
    		createTimer,
    		select,
    		clear,
    		click_handler,
    		click_handler_1
    	];
    }

    class NumberPad extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NumberPad",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let clock;
    	let t2;
    	let p;
    	let t4;
    	let numberpad;
    	let t5;
    	let h2;
    	let t7;
    	let button0;
    	let t9;
    	let button1;
    	let current;
    	let mounted;
    	let dispose;

    	clock = new Clock({
    			props: { timers: /*timers*/ ctx[1] },
    			$$inline: true
    		});

    	numberpad = new NumberPad({ $$inline: true });
    	numberpad.$on("newTimer", /*handleTimerTime*/ ctx[5]);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text(/*name*/ ctx[0]);
    			t1 = space();
    			create_component(clock.$$.fragment);
    			t2 = space();
    			p = element("p");
    			p.textContent = `${/*timerTime*/ ctx[2]}`;
    			t4 = space();
    			create_component(numberpad.$$.fragment);
    			t5 = space();
    			h2 = element("h2");
    			h2.textContent = "Demos";
    			t7 = space();
    			button0 = element("button");
    			button0.textContent = "Prev";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "Next";
    			attr_dev(h1, "class", "svelte-182dsa2");
    			add_location(h1, file, 97, 1, 4637);
    			attr_dev(p, "class", "svelte-182dsa2");
    			add_location(p, file, 99, 2, 4674);
    			attr_dev(h2, "class", "svelte-182dsa2");
    			add_location(h2, file, 101, 2, 4740);
    			attr_dev(button0, "class", "svelte-182dsa2");
    			add_location(button0, file, 102, 2, 4757);
    			attr_dev(button1, "class", "svelte-182dsa2");
    			add_location(button1, file, 103, 2, 4805);
    			attr_dev(main, "class", "svelte-182dsa2");
    			add_location(main, file, 96, 0, 4629);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(main, t1);
    			mount_component(clock, main, null);
    			append_dev(main, t2);
    			append_dev(main, p);
    			append_dev(main, t4);
    			mount_component(numberpad, main, null);
    			append_dev(main, t5);
    			append_dev(main, h2);
    			append_dev(main, t7);
    			append_dev(main, button0);
    			append_dev(main, t9);
    			append_dev(main, button1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*previousDemo*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*nextDemo*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t0, /*name*/ ctx[0]);
    			const clock_changes = {};
    			if (dirty & /*timers*/ 2) clock_changes.timers = /*timers*/ ctx[1];
    			clock.$set(clock_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(clock.$$.fragment, local);
    			transition_in(numberpad.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(clock.$$.fragment, local);
    			transition_out(numberpad.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(clock);
    			destroy_component(numberpad);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function randTime() {
    	const time = Math.floor(Math.random() * 60);
    	return time;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;

    	let demos = [
    		[
    			{
    				"lane": "lane1",
    				"mask": "lane-mask1",
    				"border": 90,
    				"duration": 10,
    				"pos": 360
    			}
    		],
    		[
    			{
    				"lane": "lane1",
    				"mask": "lane-mask1",
    				"clip": "lane-clip-path1",
    				"border": 90,
    				"duration": 70,
    				"pos": 360
    			},
    			{
    				"lane": "lane2",
    				"mask": "lane-mask2",
    				"clip": "lane-clip-path2",
    				"border": 84,
    				"duration": 60,
    				"pos": 360
    			},
    			{
    				"lane": "lane3",
    				"mask": "lane-mask3",
    				"clip": "lane-clip-path3",
    				"border": 78,
    				"duration": 50,
    				"pos": 360
    			},
    			{
    				"lane": "lane4",
    				"mask": "lane-mask4",
    				"clip": "lane-clip-path4",
    				"border": 72,
    				"duration": 40,
    				"pos": 360
    			},
    			{
    				"lane": "lane5",
    				"mask": "lane-mask5",
    				"clip": "lane-clip-path5",
    				"border": 66,
    				"duration": 30,
    				"pos": 360
    			},
    			{
    				"lane": "lane6",
    				"mask": "lane-mask6",
    				"clip": "lane-clip-path6",
    				"border": 60,
    				"duration": 20,
    				"pos": 360
    			},
    			{
    				"lane": "lane7",
    				"mask": "lane-mask7",
    				"clip": "lane-clip-path7",
    				"border": 54,
    				"duration": 10,
    				"pos": 360
    			}
    		],
    		[
    			{
    				"lane": "lane1",
    				"mask": "lane-mask1",
    				"clip": "lane-clip-path1",
    				"border": 90,
    				"duration": 10,
    				"pos": 360
    			},
    			{
    				"lane": "lane2",
    				"mask": "lane-mask2",
    				"clip": "lane-clip-path2",
    				"border": 84,
    				"duration": 20,
    				"pos": 360
    			},
    			{
    				"lane": "lane3",
    				"mask": "lane-mask3",
    				"clip": "lane-clip-path3",
    				"border": 78,
    				"duration": 30,
    				"pos": 360
    			},
    			{
    				"lane": "lane4",
    				"mask": "lane-mask4",
    				"clip": "lane-clip-path4",
    				"border": 72,
    				"duration": 40,
    				"pos": 360
    			},
    			{
    				"lane": "lane5",
    				"mask": "lane-mask5",
    				"clip": "lane-clip-path5",
    				"border": 66,
    				"duration": 50,
    				"pos": 360
    			},
    			{
    				"lane": "lane6",
    				"mask": "lane-mask6",
    				"clip": "lane-clip-path6",
    				"border": 60,
    				"duration": 60,
    				"pos": 360
    			},
    			{
    				"lane": "lane7",
    				"mask": "lane-mask7",
    				"clip": "lane-clip-path7",
    				"border": 54,
    				"duration": 70,
    				"pos": 360
    			}
    		],
    		[
    			{
    				"lane": "lane1",
    				"mask": "lane-mask1",
    				"clip": "lane-clip-path1",
    				"border": 90,
    				"duration": randTime(),
    				"pos": 360
    			},
    			{
    				"lane": "lane2",
    				"mask": "lane-mask2",
    				"clip": "lane-clip-path2",
    				"border": 84,
    				"duration": randTime(),
    				"pos": 360
    			},
    			{
    				"lane": "lane3",
    				"mask": "lane-mask3",
    				"clip": "lane-clip-path3",
    				"border": 78,
    				"duration": randTime(),
    				"pos": 360
    			},
    			{
    				"lane": "lane4",
    				"mask": "lane-mask4",
    				"clip": "lane-clip-path4",
    				"border": 72,
    				"duration": randTime(),
    				"pos": 360
    			},
    			{
    				"lane": "lane5",
    				"mask": "lane-mask5",
    				"clip": "lane-clip-path5",
    				"border": 66,
    				"duration": randTime(),
    				"pos": 360
    			},
    			{
    				"lane": "lane6",
    				"mask": "lane-mask6",
    				"clip": "lane-clip-path6",
    				"border": 60,
    				"duration": randTime(),
    				"pos": 360
    			},
    			{
    				"lane": "lane7",
    				"mask": "lane-mask7",
    				"clip": "lane-clip-path7",
    				"border": 54,
    				"duration": randTime(),
    				"pos": 360
    			}
    		]
    	];

    	let selectedDemo = 0;

    	//let timers = demos[selectedDemo];
    	let timers = [];

    	let numTimers = timers.length;
    	let timerTime = '';
    	let addPosition = 1;

    	let lanes = [
    		{
    			"lane": "lane1",
    			"mask": "lane-mask1",
    			"clip": "lane-clip-path1",
    			"border": 90,
    			"duration": 0,
    			"pos": 360
    		},
    		{
    			"lane": "lane2",
    			"mask": "lane-mask2",
    			"clip": "lane-clip-path2",
    			"border": 84,
    			"duration": 0,
    			"pos": 360
    		},
    		{
    			"lane": "lane3",
    			"mask": "lane-mask3",
    			"clip": "lane-clip-path3",
    			"border": 78,
    			"duration": 0,
    			"pos": 360
    		},
    		{
    			"lane": "lane4",
    			"mask": "lane-mask4",
    			"clip": "lane-clip-path4",
    			"border": 72,
    			"duration": 0,
    			"pos": 360
    		},
    		{
    			"lane": "lane5",
    			"mask": "lane-mask5",
    			"clip": "lane-clip-path5",
    			"border": 66,
    			"duration": 0,
    			"pos": 360
    		},
    		{
    			"lane": "lane6",
    			"mask": "lane-mask6",
    			"clip": "lane-clip-path6",
    			"border": 60,
    			"duration": 0,
    			"pos": 360
    		},
    		{
    			"lane": "lane7",
    			"mask": "lane-mask7",
    			"clip": "lane-clip-path7",
    			"border": 54,
    			"duration": 0,
    			"pos": 360
    		}
    	];

    	function nextDemo() {
    		if (selectedDemo === demos.length - 1) {
    			$$invalidate(6, selectedDemo = 0);
    		} else {
    			$$invalidate(6, selectedDemo++, selectedDemo);
    		}
    	}

    	function previousDemo() {
    		if (selectedDemo === 0) {
    			$$invalidate(6, selectedDemo = demos.length - 1);
    		} else {
    			$$invalidate(6, selectedDemo--, selectedDemo);
    		}
    	}
    	let countValue;

    	count.subscribe(value => {
    		countValue = value;
    	});

    	function handleTimerTime(event) {
    		console.log(event);
    		const timer = lanes[addPosition];
    		timer.duration = event.detail.time;
    		timer.pos = 360;
    		timers.push(timer);
    		addPosition = (addPosition + 1) % lanes.length;
    	}

    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		name,
    		Clock,
    		count,
    		onMount,
    		NumberPad,
    		demos,
    		selectedDemo,
    		timers,
    		numTimers,
    		timerTime,
    		addPosition,
    		lanes,
    		nextDemo,
    		previousDemo,
    		randTime,
    		countValue,
    		handleTimerTime
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('demos' in $$props) $$invalidate(10, demos = $$props.demos);
    		if ('selectedDemo' in $$props) $$invalidate(6, selectedDemo = $$props.selectedDemo);
    		if ('timers' in $$props) $$invalidate(1, timers = $$props.timers);
    		if ('numTimers' in $$props) numTimers = $$props.numTimers;
    		if ('timerTime' in $$props) $$invalidate(2, timerTime = $$props.timerTime);
    		if ('addPosition' in $$props) addPosition = $$props.addPosition;
    		if ('lanes' in $$props) lanes = $$props.lanes;
    		if ('countValue' in $$props) countValue = $$props.countValue;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*selectedDemo*/ 64) {
    			$$invalidate(1, timers = JSON.parse(JSON.stringify(demos[selectedDemo])));
    		}

    		if ($$self.$$.dirty & /*timers*/ 2) {
    			numTimers = timers.length;
    		}
    	};

    	return [name, timers, timerTime, nextDemo, previousDemo, handleTimerTime, selectedDemo];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console_1.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'Simple Effing Timer'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
