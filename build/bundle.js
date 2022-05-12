var app = (function () {
    'use strict';

    function noop() { }
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
        if (text.wholeText !== data)
            text.data = data;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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

    /* src/ClockDisplay.svelte generated by Svelte v3.48.0 */

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

    	return {
    		c() {
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			attr(rect0, "class", "submarker svelte-gfk3a0");
    			attr(rect0, "width", "3");
    			attr(rect0, "height", "1");
    			attr(rect0, "y", "-.5");
    			attr(rect0, "x", "95");
    			attr(rect0, "transform", "rotate(" + (6 * (/*marker*/ ctx[3] + /*submarker*/ ctx[6]) + /*subsubmarker*/ ctx[9]) + ")");
    			attr(rect1, "class", "submarker svelte-gfk3a0");
    			attr(rect1, "width", "3");
    			attr(rect1, "height", "1");
    			attr(rect1, "y", "-.5");
    			attr(rect1, "x", "95");
    			attr(rect1, "transform", "rotate(" + (6 * (/*marker*/ ctx[3] + /*submarker*/ ctx[6]) - /*subsubmarker*/ ctx[9]) + ")");
    		},
    		m(target, anchor) {
    			insert(target, rect0, anchor);
    			insert(target, rect1, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(rect0);
    			if (detaching) detach(rect1);
    		}
    	};
    }

    // (31:4) {#each [1, 2, 3, 4] as submarker}
    function create_each_block_1$1(ctx) {
    	let rect;
    	let each_1_anchor;
    	let each_value_2 = [1, 2, 3, 4, 5];
    	let each_blocks = [];

    	for (let i = 0; i < 5; i += 1) {
    		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	return {
    		c() {
    			rect = svg_element("rect");

    			for (let i = 0; i < 5; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr(rect, "class", "submarker svelte-gfk3a0");
    			attr(rect, "width", "5");
    			attr(rect, "height", "1");
    			attr(rect, "y", "-.5");
    			attr(rect, "x", "93");
    			attr(rect, "transform", "rotate(" + 6 * (/*marker*/ ctx[3] + /*submarker*/ ctx[6]) + ")");
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);

    			for (let i = 0; i < 5; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*Array*/ 0) {
    				each_value_2 = [1, 2, 3, 4, 5];
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
    		d(detaching) {
    			if (detaching) detach(rect);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (23:2) {#each [...Array(12).keys()].map((i) => {return i * 5}) as marker}
    function create_each_block$1(ctx) {
    	let rect;
    	let rect_transform_value;
    	let each_1_anchor;
    	let each_value_1 = [1, 2, 3, 4];
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			rect = svg_element("rect");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr(rect, "class", "marker svelte-gfk3a0");
    			attr(rect, "width", "7");
    			attr(rect, "height", "1");
    			attr(rect, "y", "-.5");
    			attr(rect, "x", "91");
    			attr(rect, "transform", rect_transform_value = "rotate(" + 30 * /*marker*/ ctx[3] + ")");
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*Array*/ 0) {
    				each_value_1 = [1, 2, 3, 4];
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
    		d(detaching) {
    			if (detaching) detach(rect);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let svg;
    	let g;
    	let rect;
    	let circle0;
    	let circle1;
    	let g_transform_value;
    	let each_value = [...Array(12).keys()].map(func$1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			svg = svg_element("svg");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			g = svg_element("g");
    			rect = svg_element("rect");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			attr(rect, "width", 98 + 12);
    			attr(rect, "height", "1");
    			attr(rect, "y", "-.5");
    			attr(rect, "x", "-12");
    			attr(circle0, "class", "hand-outer-circle svelte-gfk3a0");
    			attr(circle0, "r", "2");
    			attr(circle1, "class", "hand-inner-circle svelte-gfk3a0");
    			attr(circle1, "r", "1");
    			attr(g, "class", "hand svelte-gfk3a0");
    			attr(g, "transform", g_transform_value = "rotate(" + (/*timer*/ ctx[0].pos - 90) + ")");
    			attr(svg, "viewBox", "-100 -100 200 200");
    			attr(svg, "class", "svelte-gfk3a0");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			append(svg, g);
    			append(g, rect);
    			append(g, circle0);
    			append(g, circle1);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*Array*/ 0) {
    				each_value = [...Array(12).keys()].map(func$1);
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
    				attr(g, "transform", g_transform_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    const func$1 = i => {
    	return i * 5;
    };

    function instance$2($$self, $$props, $$invalidate) {
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

    	$$self.$$set = $$props => {
    		if ('timers' in $$props) $$invalidate(1, timers = $$props.timers);
    	};

    	return [timer, timers];
    }

    class ClockDisplay extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { timers: 1 });
    	}
    }

    /* src/PlanetDisplay.svelte generated by Svelte v3.48.0 */

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

    	return {
    		c() {
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			attr(rect0, "class", "submarker svelte-1gd6rmx");
    			attr(rect0, "width", "3");
    			attr(rect0, "height", "1");
    			attr(rect0, "y", "-.5");
    			attr(rect0, "x", "95");
    			attr(rect0, "transform", "rotate(" + (6 * (/*marker*/ ctx[5] + /*submarker*/ ctx[8]) + /*subsubmarker*/ ctx[11]) + ")");
    			attr(rect1, "class", "submarker svelte-1gd6rmx");
    			attr(rect1, "width", "3");
    			attr(rect1, "height", "1");
    			attr(rect1, "y", "-.5");
    			attr(rect1, "x", "95");
    			attr(rect1, "transform", "rotate(" + (6 * (/*marker*/ ctx[5] + /*submarker*/ ctx[8]) - /*subsubmarker*/ ctx[11]) + ")");
    		},
    		m(target, anchor) {
    			insert(target, rect0, anchor);
    			insert(target, rect1, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(rect0);
    			if (detaching) detach(rect1);
    		}
    	};
    }

    // (33:4) {#each [1, 2, 3, 4] as submarker}
    function create_each_block_2(ctx) {
    	let rect;
    	let each_1_anchor;
    	let each_value_3 = [1, 2, 3, 4, 5];
    	let each_blocks = [];

    	for (let i = 0; i < 5; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	return {
    		c() {
    			rect = svg_element("rect");

    			for (let i = 0; i < 5; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr(rect, "class", "submarker svelte-1gd6rmx");
    			attr(rect, "width", "5");
    			attr(rect, "height", "1");
    			attr(rect, "y", "-.5");
    			attr(rect, "x", "93");
    			attr(rect, "transform", "rotate(" + 6 * (/*marker*/ ctx[5] + /*submarker*/ ctx[8]) + ")");
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);

    			for (let i = 0; i < 5; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*Array*/ 0) {
    				each_value_3 = [1, 2, 3, 4, 5];
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
    		d(detaching) {
    			if (detaching) detach(rect);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (25:2) {#each [...Array(12).keys()].map((i) => {return i * 5}) as marker}
    function create_each_block_1(ctx) {
    	let rect;
    	let rect_transform_value;
    	let each_1_anchor;
    	let each_value_2 = [1, 2, 3, 4];
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	return {
    		c() {
    			rect = svg_element("rect");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr(rect, "class", "marker svelte-1gd6rmx");
    			attr(rect, "width", "7");
    			attr(rect, "height", "1");
    			attr(rect, "y", "-.5");
    			attr(rect, "x", "91");
    			attr(rect, "transform", rect_transform_value = "rotate(" + 30 * /*marker*/ ctx[5] + ")");
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*Array*/ 0) {
    				each_value_2 = [1, 2, 3, 4];
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
    		d(detaching) {
    			if (detaching) detach(rect);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (67:8) {#if (timer.pos - 90) < 0}
    function create_if_block_3(ctx) {
    	let rect;

    	return {
    		c() {
    			rect = svg_element("rect");
    			attr(rect, "width", "100");
    			attr(rect, "height", "100");
    			attr(rect, "transform", "rotate(-180)");
    			attr(rect, "fill", "#000");
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(rect);
    		}
    	};
    }

    // (70:8) {#if (timer.pos - 90) > 0}
    function create_if_block_2(ctx) {
    	let rect;

    	return {
    		c() {
    			rect = svg_element("rect");
    			attr(rect, "width", "100");
    			attr(rect, "height", "100");
    			attr(rect, "transform", "rotate(-90)");
    			attr(rect, "fill", "#fff");
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(rect);
    		}
    	};
    }

    // (73:8) {#if (timer.pos - 90) > 90}
    function create_if_block_1(ctx) {
    	let rect;

    	return {
    		c() {
    			rect = svg_element("rect");
    			attr(rect, "width", "100");
    			attr(rect, "height", "100");
    			attr(rect, "fill", "#fff");
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(rect);
    		}
    	};
    }

    // (76:8) {#if (timer.pos - 90) > 180}
    function create_if_block$1(ctx) {
    	let rect;

    	return {
    		c() {
    			rect = svg_element("rect");
    			attr(rect, "width", "100");
    			attr(rect, "height", "100");
    			attr(rect, "transform", "rotate(90)");
    			attr(rect, "fill", "#fff");
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(rect);
    		}
    	};
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
    	let if_block0 = /*timer*/ ctx[2].pos - 90 < 0 && create_if_block_3();
    	let if_block1 = /*timer*/ ctx[2].pos - 90 > 0 && create_if_block_2();
    	let if_block2 = /*timer*/ ctx[2].pos - 90 > 90 && create_if_block_1();
    	let if_block3 = /*timer*/ ctx[2].pos - 90 > 180 && create_if_block$1();

    	return {
    		c() {
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
    			attr(circle0, "id", "theCircle");
    			attr(circle0, "r", circle0_r_value = /*timer*/ ctx[2].border);
    			attr(clipPath, "id", "lane-clip-path");
    			attr(rect, "width", "100");
    			attr(rect, "height", "100");
    			attr(rect, "transform", rect_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 180) + ")");
    			attr(rect, "fill", "#fff");
    			attr(mask, "id", mask_id_value = /*timer*/ ctx[2].mask);
    			attr(circle1, "class", "lane-outer svelte-1gd6rmx");
    			attr(circle1, "r", circle1_r_value = /*timer*/ ctx[2].border - 2);
    			attr(circle2, "class", "lane-inner svelte-1gd6rmx");
    			attr(circle2, "r", circle2_r_value = /*timer*/ ctx[2].border - 3);
    			attr(circle2, "rx", "-10");
    			attr(g0, "class", "lane");
    			attr(g0, "clip-path", "url(#lane-clip-path)");
    			attr(g0, "mask", g0_mask_value = "url(#" + /*timer*/ ctx[2].mask + ")");
    			attr(circle3, "class", "planet svelte-1gd6rmx");
    			attr(circle3, "r", "2.5");
    			attr(circle3, "cx", circle3_cx_value = /*timer*/ ctx[2].border - 2.5);
    			attr(circle3, "transform", circle3_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 90) + ")");
    			attr(circle4, "class", "hole svelte-1gd6rmx");
    			attr(circle4, "r", "1.5");
    			attr(circle4, "cx", circle4_cx_value = /*timer*/ ctx[2].border - 2.5);
    			attr(circle4, "transform", circle4_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 90) + ")");
    			attr(g1, "class", g1_class_value = "" + (null_to_empty(/*timer*/ ctx[2].lane) + " svelte-1gd6rmx"));
    		},
    		m(target, anchor) {
    			insert(target, g1, anchor);
    			append(g1, clipPath);
    			append(clipPath, circle0);
    			append(g1, mask);
    			append(mask, rect);
    			if (if_block0) if_block0.m(mask, null);
    			append(mask, if_block0_anchor);
    			if (if_block1) if_block1.m(mask, null);
    			append(mask, if_block1_anchor);
    			if (if_block2) if_block2.m(mask, null);
    			append(mask, if_block2_anchor);
    			if (if_block3) if_block3.m(mask, null);
    			append(g1, g0);
    			append(g0, circle1);
    			append(g0, circle2);
    			append(g1, circle3);
    			append(g1, circle4);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*timers*/ 1 && circle0_r_value !== (circle0_r_value = /*timer*/ ctx[2].border)) {
    				attr(circle0, "r", circle0_r_value);
    			}

    			if (dirty & /*timers*/ 1 && rect_transform_value !== (rect_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 180) + ")")) {
    				attr(rect, "transform", rect_transform_value);
    			}

    			if (/*timer*/ ctx[2].pos - 90 < 0) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_3();
    					if_block0.c();
    					if_block0.m(mask, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*timer*/ ctx[2].pos - 90 > 0) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_2();
    					if_block1.c();
    					if_block1.m(mask, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*timer*/ ctx[2].pos - 90 > 90) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_1();
    					if_block2.c();
    					if_block2.m(mask, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*timer*/ ctx[2].pos - 90 > 180) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block$1();
    					if_block3.c();
    					if_block3.m(mask, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*timers*/ 1 && mask_id_value !== (mask_id_value = /*timer*/ ctx[2].mask)) {
    				attr(mask, "id", mask_id_value);
    			}

    			if (dirty & /*timers*/ 1 && circle1_r_value !== (circle1_r_value = /*timer*/ ctx[2].border - 2)) {
    				attr(circle1, "r", circle1_r_value);
    			}

    			if (dirty & /*timers*/ 1 && circle2_r_value !== (circle2_r_value = /*timer*/ ctx[2].border - 3)) {
    				attr(circle2, "r", circle2_r_value);
    			}

    			if (dirty & /*timers*/ 1 && g0_mask_value !== (g0_mask_value = "url(#" + /*timer*/ ctx[2].mask + ")")) {
    				attr(g0, "mask", g0_mask_value);
    			}

    			if (dirty & /*timers*/ 1 && circle3_cx_value !== (circle3_cx_value = /*timer*/ ctx[2].border - 2.5)) {
    				attr(circle3, "cx", circle3_cx_value);
    			}

    			if (dirty & /*timers*/ 1 && circle3_transform_value !== (circle3_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 90) + ")")) {
    				attr(circle3, "transform", circle3_transform_value);
    			}

    			if (dirty & /*timers*/ 1 && circle4_cx_value !== (circle4_cx_value = /*timer*/ ctx[2].border - 2.5)) {
    				attr(circle4, "cx", circle4_cx_value);
    			}

    			if (dirty & /*timers*/ 1 && circle4_transform_value !== (circle4_transform_value = "rotate(" + (/*timer*/ ctx[2].pos - 90) + ")")) {
    				attr(circle4, "transform", circle4_transform_value);
    			}

    			if (dirty & /*timers*/ 1 && g1_class_value !== (g1_class_value = "" + (null_to_empty(/*timer*/ ctx[2].lane) + " svelte-1gd6rmx"))) {
    				attr(g1, "class", g1_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(g1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let svg;
    	let each0_anchor;
    	let each_value_1 = [...Array(12).keys()].map(func);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*timers*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			svg = svg_element("svg");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(svg, "viewBox", "-100 -100 200 200");
    			attr(svg, "class", "svelte-1gd6rmx");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(svg, null);
    			}

    			append(svg, each0_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*Array*/ 0) {
    				each_value_1 = [...Array(12).keys()].map(func);
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
    		d(detaching) {
    			if (detaching) detach(svg);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    const func = i => {
    	return i * 5;
    };

    function instance$1($$self, $$props, $$invalidate) {
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

    	$$self.$$set = $$props => {
    		if ('timers' in $$props) $$invalidate(0, timers = $$props.timers);
    	};

    	return [timers];
    }

    class PlanetDisplay extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { timers: 0 });
    	}
    }

    /* src/App.svelte generated by Svelte v3.48.0 */

    function create_else_block(ctx) {
    	let clockdisplay;
    	let current;
    	clockdisplay = new ClockDisplay({ props: { timers: /*timers*/ ctx[1] } });

    	return {
    		c() {
    			create_component(clockdisplay.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(clockdisplay, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(clockdisplay.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(clockdisplay.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(clockdisplay, detaching);
    		}
    	};
    }

    // (23:2) {#if numTimers > 1}
    function create_if_block(ctx) {
    	let planetdisplay;
    	let current;
    	planetdisplay = new PlanetDisplay({ props: { timers: /*timers*/ ctx[1] } });

    	return {
    		c() {
    			create_component(planetdisplay.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(planetdisplay, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(planetdisplay.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(planetdisplay.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(planetdisplay, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*numTimers*/ ctx[2] > 1) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text(/*name*/ ctx[0]);
    			t1 = space();
    			if_block.c();
    			attr(h1, "class", "svelte-1ch9f7k");
    			attr(main, "class", "svelte-1ch9f7k");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			append(main, h1);
    			append(h1, t0);
    			append(main, t1);
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data(t0, /*name*/ ctx[0]);
    			if_block.p(ctx, dirty);
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
    			if (detaching) detach(main);
    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { name } = $$props;

    	let timers = [
    		{
    			"lane": "lane1",
    			"mask": "lane-mask1",
    			"border": 90,
    			"duration": 30,
    			"pos": 360
    		}
    	];

    	let numTimers = timers.length;

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	return [name, timers, numTimers];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });
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
