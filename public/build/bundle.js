
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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

    /* src/ClockDisplay.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file$2 = "src/ClockDisplay.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (39:6) {#each [1, 2, 3, 4, 5] as subsubmarker}
    function create_each_block_2$1(ctx) {
    	let rect0;
    	let rect1;

    	const block = {
    		c: function create() {
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			attr_dev(rect0, "class", "submarker svelte-gfk3a0");
    			attr_dev(rect0, "width", "3");
    			attr_dev(rect0, "height", "1");
    			attr_dev(rect0, "y", "-.5");
    			attr_dev(rect0, "x", "95");
    			attr_dev(rect0, "transform", "rotate(" + (6 * (/*marker*/ ctx[3] + /*submarker*/ ctx[6]) + /*subsubmarker*/ ctx[9]) + ")");
    			add_location(rect0, file$2, 39, 8, 888);
    			attr_dev(rect1, "class", "submarker svelte-gfk3a0");
    			attr_dev(rect1, "width", "3");
    			attr_dev(rect1, "height", "1");
    			attr_dev(rect1, "y", "-.5");
    			attr_dev(rect1, "x", "95");
    			attr_dev(rect1, "transform", "rotate(" + (6 * (/*marker*/ ctx[3] + /*submarker*/ ctx[6]) - /*subsubmarker*/ ctx[9]) + ")");
    			add_location(rect1, file$2, 46, 8, 1079);
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
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(39:6) {#each [1, 2, 3, 4, 5] as subsubmarker}",
    		ctx
    	});

    	return block;
    }

    // (31:4) {#each [1, 2, 3, 4] as submarker}
    function create_each_block_1$1(ctx) {
    	let rect;
    	let each_1_anchor;
    	let each_value_2 = [1, 2, 3, 4, 5];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < 5; i += 1) {
    		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");

    			for (let i = 0; i < 5; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(rect, "class", "submarker svelte-gfk3a0");
    			attr_dev(rect, "width", "5");
    			attr_dev(rect, "height", "1");
    			attr_dev(rect, "y", "-.5");
    			attr_dev(rect, "x", "93");
    			attr_dev(rect, "transform", "rotate(" + 6 * (/*marker*/ ctx[3] + /*submarker*/ ctx[6]) + ")");
    			add_location(rect, file$2, 31, 6, 678);
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
    				each_value_2 = [1, 2, 3, 4, 5];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < 5; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2$1(child_ctx);
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
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(31:4) {#each [1, 2, 3, 4] as submarker}",
    		ctx
    	});

    	return block;
    }

    // (23:2) {#each [...Array(12).keys()].map((i) => {return i * 5}) as marker}
    function create_each_block$1(ctx) {
    	let rect;
    	let each_1_anchor;
    	let each_value_1 = [1, 2, 3, 4];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(rect, "class", "marker svelte-gfk3a0");
    			attr_dev(rect, "width", "7");
    			attr_dev(rect, "height", "1");
    			attr_dev(rect, "y", "-.5");
    			attr_dev(rect, "x", "91");
    			attr_dev(rect, "transform", "rotate(" + 30 * /*marker*/ ctx[3] + ")");
    			add_location(rect, file$2, 23, 4, 506);
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
    				each_value_1 = [1, 2, 3, 4];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < 4; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
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
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(23:2) {#each [...Array(12).keys()].map((i) => {return i * 5}) as marker}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let svg;
    	let g;
    	let rect;
    	let circle0;
    	let circle1;
    	let g_transform_value;
    	let each_value = [...Array(12).keys()].map(func$1);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			g = svg_element("g");
    			rect = svg_element("rect");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			attr_dev(rect, "width", 98 + 12);
    			attr_dev(rect, "height", "1");
    			attr_dev(rect, "y", "-.5");
    			attr_dev(rect, "x", "-12");
    			add_location(rect, file$2, 57, 4, 1358);
    			attr_dev(circle0, "class", "hand-outer-circle svelte-gfk3a0");
    			attr_dev(circle0, "r", "2");
    			add_location(circle0, file$2, 63, 4, 1444);
    			attr_dev(circle1, "class", "hand-inner-circle svelte-gfk3a0");
    			attr_dev(circle1, "r", "1");
    			add_location(circle1, file$2, 64, 4, 1489);
    			attr_dev(g, "class", "hand svelte-gfk3a0");
    			attr_dev(g, "transform", g_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 90) + ")");
    			add_location(g, file$2, 56, 2, 1300);
    			attr_dev(svg, "viewBox", "-100 -100 200 200");
    			attr_dev(svg, "class", "svelte-gfk3a0");
    			add_location(svg, file$2, 21, 0, 399);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			append_dev(svg, g);
    			append_dev(g, rect);
    			append_dev(g, circle0);
    			append_dev(g, circle1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Array*/ 0) {
    				each_value = [...Array(12).keys()].map(func$1);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg, g);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*timer*/ 1 && g_transform_value !== (g_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 90) + ")")) {
    				attr_dev(g, "transform", g_transform_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks, detaching);
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
    	validate_slots('ClockDisplay', slots, []);
    	let { timers = [] } = $$props;
    	let timer = timers[0];
    	console.log(timer.lane);

    	setInterval(
    		() => {
    			updatePosition();
    		},
    		10
    	);

    	function updatePosition() {
    		const step = 360 / (timer.duration * 100);
    		const newPos = timer.pos - step;

    		if (newPos <= 0) {
    			$$invalidate(0, timer.pos = 0, timer);
    		} else {
    			$$invalidate(0, timer.pos = newPos, timer);
    		}
    	}
    	const writable_props = ['timers'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<ClockDisplay> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('timers' in $$props) $$invalidate(1, timers = $$props.timers);
    	};

    	$$self.$capture_state = () => ({ onMount, timers, timer, updatePosition });

    	$$self.$inject_state = $$props => {
    		if ('timers' in $$props) $$invalidate(1, timers = $$props.timers);
    		if ('timer' in $$props) $$invalidate(0, timer = $$props.timer);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [timer, timers];
    }

    class ClockDisplay extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { timers: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ClockDisplay",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get timers() {
    		throw new Error("<ClockDisplay>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timers(value) {
    		throw new Error("<ClockDisplay>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/PlanetDisplay.svelte generated by Svelte v3.48.0 */
    const file$1 = "src/PlanetDisplay.svelte";

    function get_each_context(ctx, list, i) {
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

    // (41:6) {#each [1, 2, 3, 4, 5] as subsubmarker}
    function create_each_block_3(ctx) {
    	let rect0;
    	let rect1;

    	const block = {
    		c: function create() {
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			attr_dev(rect0, "class", "submarker svelte-1gd6rmx");
    			attr_dev(rect0, "width", "3");
    			attr_dev(rect0, "height", "1");
    			attr_dev(rect0, "y", "-.5");
    			attr_dev(rect0, "x", "95");
    			attr_dev(rect0, "transform", "rotate(" + (6 * (/*marker*/ ctx[5] + /*submarker*/ ctx[8]) + /*subsubmarker*/ ctx[11]) + ")");
    			add_location(rect0, file$1, 41, 8, 923);
    			attr_dev(rect1, "class", "submarker svelte-1gd6rmx");
    			attr_dev(rect1, "width", "3");
    			attr_dev(rect1, "height", "1");
    			attr_dev(rect1, "y", "-.5");
    			attr_dev(rect1, "x", "95");
    			attr_dev(rect1, "transform", "rotate(" + (6 * (/*marker*/ ctx[5] + /*submarker*/ ctx[8]) - /*subsubmarker*/ ctx[11]) + ")");
    			add_location(rect1, file$1, 48, 8, 1114);
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
    		source: "(41:6) {#each [1, 2, 3, 4, 5] as subsubmarker}",
    		ctx
    	});

    	return block;
    }

    // (33:4) {#each [1, 2, 3, 4] as submarker}
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
    			attr_dev(rect, "class", "submarker svelte-1gd6rmx");
    			attr_dev(rect, "width", "5");
    			attr_dev(rect, "height", "1");
    			attr_dev(rect, "y", "-.5");
    			attr_dev(rect, "x", "93");
    			attr_dev(rect, "transform", "rotate(" + 6 * (/*marker*/ ctx[5] + /*submarker*/ ctx[8]) + ")");
    			add_location(rect, file$1, 33, 6, 713);
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
    		source: "(33:4) {#each [1, 2, 3, 4] as submarker}",
    		ctx
    	});

    	return block;
    }

    // (25:2) {#each [...Array(12).keys()].map((i) => {return i * 5}) as marker}
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
    			attr_dev(rect, "class", "marker svelte-1gd6rmx");
    			attr_dev(rect, "width", "7");
    			attr_dev(rect, "height", "1");
    			attr_dev(rect, "y", "-.5");
    			attr_dev(rect, "x", "91");
    			attr_dev(rect, "transform", "rotate(" + 30 * /*marker*/ ctx[5] + ")");
    			add_location(rect, file$1, 25, 4, 541);
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
    		source: "(25:2) {#each [...Array(12).keys()].map((i) => {return i * 5}) as marker}",
    		ctx
    	});

    	return block;
    }

    // (67:8) {#if (timer.pos - 90) < 0}
    function create_if_block_3(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "width", "100");
    			attr_dev(rect, "height", "100");
    			attr_dev(rect, "transform", "rotate(-180)");
    			attr_dev(rect, "fill", "#000");
    			add_location(rect, file$1, 67, 10, 1662);
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
    		source: "(67:8) {#if (timer.pos - 90) < 0}",
    		ctx
    	});

    	return block;
    }

    // (70:8) {#if (timer.pos - 90) > 0}
    function create_if_block_2(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "width", "100");
    			attr_dev(rect, "height", "100");
    			attr_dev(rect, "transform", "rotate(-90)");
    			attr_dev(rect, "fill", "#fff");
    			add_location(rect, file$1, 70, 10, 1790);
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
    		source: "(70:8) {#if (timer.pos - 90) > 0}",
    		ctx
    	});

    	return block;
    }

    // (73:8) {#if (timer.pos - 90) > 90}
    function create_if_block_1(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "width", "100");
    			attr_dev(rect, "height", "100");
    			attr_dev(rect, "fill", "#fff");
    			add_location(rect, file$1, 73, 10, 1918);
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
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(73:8) {#if (timer.pos - 90) > 90}",
    		ctx
    	});

    	return block;
    }

    // (76:8) {#if (timer.pos - 90) > 180}
    function create_if_block$1(ctx) {
    	let rect;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "width", "100");
    			attr_dev(rect, "height", "100");
    			attr_dev(rect, "transform", "rotate(90)");
    			attr_dev(rect, "fill", "#fff");
    			add_location(rect, file$1, 76, 10, 2023);
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
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(76:8) {#if (timer.pos - 90) > 180}",
    		ctx
    	});

    	return block;
    }

    // (60:2) {#each timers as timer}
    function create_each_block(ctx) {
    	let g1;
    	let clipPath;
    	let circle0;
    	let circle0_r_value;
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
    	let circle2;
    	let circle2_r_value;
    	let g0_mask_value;
    	let circle3;
    	let circle3_cx_value;
    	let circle3_transform_value;
    	let circle4;
    	let circle4_cx_value;
    	let circle4_transform_value;
    	let g1_class_value;
    	let if_block0 = /*timer*/ ctx[2].pos - 90 < 0 && create_if_block_3(ctx);
    	let if_block1 = /*timer*/ ctx[2].pos - 90 > 0 && create_if_block_2(ctx);
    	let if_block2 = /*timer*/ ctx[2].pos - 90 > 90 && create_if_block_1(ctx);
    	let if_block3 = /*timer*/ ctx[2].pos - 90 > 180 && create_if_block$1(ctx);

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
    			attr_dev(circle0, "r", circle0_r_value = /*timer*/ ctx[2].border);
    			add_location(circle0, file$1, 62, 8, 1434);
    			attr_dev(clipPath, "id", "lane-clip-path");
    			add_location(clipPath, file$1, 61, 6, 1395);
    			attr_dev(rect, "width", "100");
    			attr_dev(rect, "height", "100");
    			attr_dev(rect, "transform", rect_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 180) + ")");
    			attr_dev(rect, "fill", "#fff");
    			add_location(rect, file$1, 65, 8, 1535);
    			attr_dev(mask, "id", mask_id_value = /*timer*/ ctx[2].mask);
    			add_location(mask, file$1, 64, 6, 1502);
    			attr_dev(circle1, "class", "lane-outer svelte-1gd6rmx");
    			attr_dev(circle1, "r", circle1_r_value = /*timer*/ ctx[2].border - 2);
    			add_location(circle1, file$1, 80, 8, 2208);
    			attr_dev(circle2, "class", "lane-inner svelte-1gd6rmx");
    			attr_dev(circle2, "r", circle2_r_value = /*timer*/ ctx[2].border - 3);
    			attr_dev(circle2, "rx", "-10");
    			add_location(circle2, file$1, 81, 8, 2268);
    			attr_dev(g0, "class", "lane");
    			attr_dev(g0, "clip-path", "url(#lane-clip-path)");
    			attr_dev(g0, "mask", g0_mask_value = "url(#" + /*timer*/ ctx[2].mask + ")");
    			add_location(g0, file$1, 79, 6, 2124);
    			attr_dev(circle3, "class", "planet svelte-1gd6rmx");
    			attr_dev(circle3, "r", "2.5");
    			attr_dev(circle3, "cx", circle3_cx_value = /*timer*/ ctx[2].border - 2.5);
    			attr_dev(circle3, "transform", circle3_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 90) + ")");
    			add_location(circle3, file$1, 83, 6, 2346);
    			attr_dev(circle4, "class", "hole svelte-1gd6rmx");
    			attr_dev(circle4, "r", "1.5");
    			attr_dev(circle4, "cx", circle4_cx_value = /*timer*/ ctx[2].border - 2.5);
    			attr_dev(circle4, "transform", circle4_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 90) + ")");
    			add_location(circle4, file$1, 84, 6, 2448);
    			attr_dev(g1, "class", g1_class_value = "" + (null_to_empty(/*timer*/ ctx[2].lane) + " svelte-1gd6rmx"));
    			add_location(g1, file$1, 60, 4, 1364);
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
    			append_dev(g0, circle2);
    			append_dev(g1, circle3);
    			append_dev(g1, circle4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*timers*/ 1 && circle0_r_value !== (circle0_r_value = /*timer*/ ctx[2].border)) {
    				attr_dev(circle0, "r", circle0_r_value);
    			}

    			if (dirty & /*timers*/ 1 && rect_transform_value !== (rect_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 180) + ")")) {
    				attr_dev(rect, "transform", rect_transform_value);
    			}

    			if (/*timer*/ ctx[2].pos - 90 < 0) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(mask, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*timer*/ ctx[2].pos - 90 > 0) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(mask, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*timer*/ ctx[2].pos - 90 > 90) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(mask, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*timer*/ ctx[2].pos - 90 > 180) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block$1(ctx);
    					if_block3.c();
    					if_block3.m(mask, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*timers*/ 1 && mask_id_value !== (mask_id_value = /*timer*/ ctx[2].mask)) {
    				attr_dev(mask, "id", mask_id_value);
    			}

    			if (dirty & /*timers*/ 1 && circle1_r_value !== (circle1_r_value = /*timer*/ ctx[2].border - 2)) {
    				attr_dev(circle1, "r", circle1_r_value);
    			}

    			if (dirty & /*timers*/ 1 && circle2_r_value !== (circle2_r_value = /*timer*/ ctx[2].border - 3)) {
    				attr_dev(circle2, "r", circle2_r_value);
    			}

    			if (dirty & /*timers*/ 1 && g0_mask_value !== (g0_mask_value = "url(#" + /*timer*/ ctx[2].mask + ")")) {
    				attr_dev(g0, "mask", g0_mask_value);
    			}

    			if (dirty & /*timers*/ 1 && circle3_cx_value !== (circle3_cx_value = /*timer*/ ctx[2].border - 2.5)) {
    				attr_dev(circle3, "cx", circle3_cx_value);
    			}

    			if (dirty & /*timers*/ 1 && circle3_transform_value !== (circle3_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 90) + ")")) {
    				attr_dev(circle3, "transform", circle3_transform_value);
    			}

    			if (dirty & /*timers*/ 1 && circle4_cx_value !== (circle4_cx_value = /*timer*/ ctx[2].border - 2.5)) {
    				attr_dev(circle4, "cx", circle4_cx_value);
    			}

    			if (dirty & /*timers*/ 1 && circle4_transform_value !== (circle4_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 90) + ")")) {
    				attr_dev(circle4, "transform", circle4_transform_value);
    			}

    			if (dirty & /*timers*/ 1 && g1_class_value !== (g1_class_value = "" + (null_to_empty(/*timer*/ ctx[2].lane) + " svelte-1gd6rmx"))) {
    				attr_dev(g1, "class", g1_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(60:2) {#each timers as timer}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let svg;
    	let each0_anchor;
    	let each_value_1 = [...Array(12).keys()].map(func);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*timers*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(svg, "viewBox", "-100 -100 200 200");
    			attr_dev(svg, "class", "svelte-1gd6rmx");
    			add_location(svg, file$1, 23, 0, 434);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(svg, null);
    			}

    			append_dev(svg, each0_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Array*/ 0) {
    				each_value_1 = [...Array(12).keys()].map(func);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(svg, each0_anchor);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*timers*/ 1) {
    				each_value = /*timers*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg, null);
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
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
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
    	return i * 5;
    };

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PlanetDisplay', slots, []);
    	let { timers = [] } = $$props;

    	setInterval(
    		() => {
    			updatePositions();
    		},
    		10
    	);

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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PlanetDisplay> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('timers' in $$props) $$invalidate(0, timers = $$props.timers);
    	};

    	$$self.$capture_state = () => ({ onMount, timers, updatePositions });

    	$$self.$inject_state = $$props => {
    		if ('timers' in $$props) $$invalidate(0, timers = $$props.timers);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [timers];
    }

    class PlanetDisplay extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { timers: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PlanetDisplay",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get timers() {
    		throw new Error("<PlanetDisplay>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timers(value) {
    		throw new Error("<PlanetDisplay>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.48.0 */
    const file = "src/App.svelte";

    // (36:2) {:else}
    function create_else_block(ctx) {
    	let clockdisplay;
    	let current;

    	clockdisplay = new ClockDisplay({
    			props: { timers: /*timers*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(clockdisplay.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(clockdisplay, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const clockdisplay_changes = {};
    			if (dirty & /*timers*/ 2) clockdisplay_changes.timers = /*timers*/ ctx[1];
    			clockdisplay.$set(clockdisplay_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(clockdisplay.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(clockdisplay.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(clockdisplay, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(36:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (34:2) {#if timers.length > 1}
    function create_if_block(ctx) {
    	let planetdisplay;
    	let current;

    	planetdisplay = new PlanetDisplay({
    			props: { timers: /*timers*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(planetdisplay.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(planetdisplay, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const planetdisplay_changes = {};
    			if (dirty & /*timers*/ 2) planetdisplay_changes.timers = /*timers*/ ctx[1];
    			planetdisplay.$set(planetdisplay_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(planetdisplay.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(planetdisplay.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(planetdisplay, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(34:2) {#if timers.length > 1}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let current_block_type_index;
    	let if_block;
    	let t2;
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*timers*/ ctx[1].length > 1) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text(/*name*/ ctx[0]);
    			t1 = space();
    			if_block.c();
    			t2 = space();
    			button = element("button");
    			button.textContent = "Demo toggle";
    			attr_dev(h1, "class", "svelte-wzont4");
    			add_location(h1, file, 32, 1, 1126);
    			attr_dev(button, "class", "svelte-wzont4");
    			add_location(button, file, 39, 2, 1246);
    			attr_dev(main, "class", "svelte-wzont4");
    			add_location(main, file, 31, 0, 1118);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(main, t1);
    			if_blocks[current_block_type_index].m(main, null);
    			append_dev(main, t2);
    			append_dev(main, button);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggleTimer*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t0, /*name*/ ctx[0]);
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
    				if_block.m(main, t2);
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
    			if (detaching) detach_dev(main);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			dispose();
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;
    	let timers = [];

    	let timers_1 = [
    		{
    			"lane": "lane1",
    			"mask": "lane-mask1",
    			"border": 90,
    			"duration": 30,
    			"pos": 360
    		}
    	];

    	let timers_2 = [
    		{
    			"lane": "lane1",
    			"mask": "lane-mask1",
    			"border": 90,
    			"duration": 70,
    			"pos": 360
    		},
    		{
    			"lane": "lane2",
    			"mask": "lane-mask2",
    			"border": 84,
    			"duration": 60,
    			"pos": 360
    		},
    		{
    			"lane": "lane3",
    			"mask": "lane-mask3",
    			"border": 78,
    			"duration": 50,
    			"pos": 360
    		},
    		{
    			"lane": "lane4",
    			"mask": "lane-mask4",
    			"border": 72,
    			"duration": 40,
    			"pos": 360
    		},
    		{
    			"lane": "lane5",
    			"mask": "lane-mask5",
    			"border": 66,
    			"duration": 30,
    			"pos": 360
    		},
    		{
    			"lane": "lane6",
    			"mask": "lane-mask6",
    			"border": 60,
    			"duration": 20,
    			"pos": 360
    		},
    		{
    			"lane": "lane7",
    			"mask": "lane-mask7",
    			"border": 54,
    			"duration": 10,
    			"pos": 360
    		}
    	];

    	let numTimers = timers.length;
    	timers = timers_1;

    	function toggleTimer() {
    		if (timers === timers_1) {
    			$$invalidate(1, timers = timers_2);
    		} else if (timers === timers_2) {
    			$$invalidate(1, timers = timers_1);
    		}
    	}
    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		name,
    		ClockDisplay,
    		PlanetDisplay,
    		timers,
    		timers_1,
    		timers_2,
    		numTimers,
    		toggleTimer
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('timers' in $$props) $$invalidate(1, timers = $$props.timers);
    		if ('timers_1' in $$props) timers_1 = $$props.timers_1;
    		if ('timers_2' in $$props) timers_2 = $$props.timers_2;
    		if ('numTimers' in $$props) numTimers = $$props.numTimers;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, timers, toggleTimer];
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
    			console.warn("<App> was created without expected prop 'name'");
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
