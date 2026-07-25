// test/dom-shim.js — a deliberately minimal fake browser environment,
// built as a standalone sandbox object for vm.createContext(). Goal: let
// all 26 game script files load and RUN (constructors, update loops,
// canvas drawing calls) inside plain Node so we can catch reference
// errors, typos, and broken cross-file wiring before shipping. It does not
// try to render actual pixels — every canvas 2D method is a harmless no-op
// (or returns a plausible dummy value), which is enough to exercise every
// code path that would otherwise throw.

function makeFakeCtx() {
  const noop = () => {};
  const ctx = {
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop,
    // arcTo: real browsers throw IndexSizeError for a negative radius —
    // roundRect() in utils.js calls this with a caller-supplied radius, and
    // a fake ctx that silently accepts anything would hide that class of bug.
    arcTo: (x1, y1, x2, y2, radius) => {
      if (typeof radius === 'number' && radius < 0) {
        throw new Error(`IndexSizeError: The radius provided (${radius}) is negative.`);
      }
    },
    ellipse: noop, rect: noop, fill: noop, stroke: noop, clip: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop,
    // drawImage: real browsers throw TypeError for a null/undefined image,
    // and InvalidStateError for a 0x0-dimension canvas/image source.
    drawImage: (image, ...rest) => {
      if (image === undefined || image === null) {
        throw new TypeError("Failed to execute 'drawImage': parameter 1 is not of type 'CanvasImageSource'.");
      }
      if (typeof image === 'object' && 'width' in image && 'height' in image) {
        if (image.width === 0 || image.height === 0) {
          throw new Error('InvalidStateError: source image width or height is 0.');
        }
      }
    },
    putImageData: noop,
    setTransform: noop, resetTransform: noop,
    // fillText/strokeText: real browsers coerce most things to string via
    // ToString(), but throw for a missing/undefined required argument used
    // as-if-absent — most realistic risk in this codebase is NaN slipping
    // into x/y, which browsers just silently skip (no throw), so no
    // special-casing needed here beyond making sure text is present.
    fillText: (text) => { if (text === undefined) throw new TypeError("Failed to execute 'fillText': 2 arguments required, but only 1 present."); },
    strokeText: (text) => { if (text === undefined) throw new TypeError("Failed to execute 'strokeText': 2 arguments required, but only 1 present."); },
    measureText: (text) => ({ width: (text !== undefined ? String(text).length : 0) * 7 }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  ['fillStyle', 'strokeStyle', 'lineWidth', 'font', 'textAlign', 'textBaseline',
    'globalAlpha', 'globalCompositeOperation', 'shadowColor', 'shadowBlur'].forEach((p) => {
    ctx[p] = '';
  });
  return ctx;
}

function makeFakeCanvas(width, height) {
  const listeners = {};
  return {
    width: width || 0,
    height: height || 0,
    style: {},
    tabIndex: 0,
    getContext: () => makeFakeCtx(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: width || 0, height: height || 0 }),
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    _listeners: listeners,
    focus: () => {},
  };
}

function makeFakeElement(tag) {
  const el = {
    tagName: tag,
    style: {},
    children: [],
    textContent: '',
    parentElement: null,
    appendChild(child) {
      child.parentElement = el;
      el.children.push(child);
      return child;
    },
  };
  return el;
}

// Builds a fresh sandbox object suitable for vm.createContext(). Every game
// script runs "inside" this object as if it were `window`.
function createSandbox() {
  const elementsById = {};
  const body = makeFakeElement('body');
  const rafCallbacks = [];

  const sandbox = {
    console,
    Math, Date, JSON, Set, Map, Array, Object, Number, String, Boolean,
    Uint8ClampedArray,
  };

  sandbox.document = {
    body,
    documentElement: makeFakeElement('html'),
    createElement(tag) {
      if (tag === 'canvas') return makeFakeCanvas(300, 150);
      return makeFakeElement(tag);
    },
    getElementById(id) {
      if (id === 'game') {
        if (!elementsById.game) elementsById.game = makeFakeCanvas(960, 600);
        return elementsById.game;
      }
      if (!elementsById[id]) {
        const el = makeFakeElement('div');
        body.appendChild(el);
        elementsById[id] = el;
      }
      return elementsById[id];
    },
  };

  sandbox.navigator = { userAgent: 'node-test-harness', maxTouchPoints: 0 };
  sandbox.matchMedia = () => ({ matches: false });
  sandbox.innerWidth = 1280;
  sandbox.innerHeight = 800;
  sandbox.requestAnimationFrame = (fn) => { rafCallbacks.push(fn); return rafCallbacks.length; };

  const windowListeners = {};
  sandbox.addEventListener = (type, fn) => {
    (windowListeners[type] = windowListeners[type] || []).push(fn);
  };
  sandbox.window = sandbox; // so `window.X` and bare `X` both work

  sandbox.__elementsById = elementsById;
  sandbox.__rafCallbacks = rafCallbacks;
  sandbox.__windowListeners = windowListeners;
  sandbox.__tick = function tick(n = 1) {
    for (let i = 0; i < n; i++) {
      const cbs = rafCallbacks.slice();
      rafCallbacks.length = 0;
      cbs.forEach((fn) => fn());
    }
  };

  return sandbox;
}

module.exports = { createSandbox, makeFakeCanvas, makeFakeCtx };
