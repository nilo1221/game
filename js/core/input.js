// core/input.js — keyboard state and mobile-device detection. Nothing here
// knows about the game itself; game.js reads `keys`/`justPressed` each frame.

function createInputState() {
  const keyboardKeys = {};
  const keyboardJust = {};
  const gamepadKeys = {};
  const gamepadJust = {};
  const touchKeys = {};
  const touchJust = {};
  const prevGamepad = {};
  const allKnown = new Set();
  const keys = {};
  const justPressed = {};
  const axes = { x: 0, y: 0 };

  function merge() {
    for (const k in keyboardKeys) allKnown.add(k);
    for (const k in gamepadKeys) allKnown.add(k);
    for (const k in touchKeys) allKnown.add(k);
    for (const k of allKnown) {
      keys[k] = !!(keyboardKeys[k] || gamepadKeys[k] || touchKeys[k]);
      justPressed[k] = !!(keyboardJust[k] || gamepadJust[k] || touchJust[k]);
    }
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!keyboardKeys[k]) keyboardJust[k] = true;
    keyboardKeys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    merge();
  });
  window.addEventListener('keyup', (e) => {
    keyboardKeys[e.key.toLowerCase()] = false;
    merge();
  });

  // Standard gamepad mapping (XInput-style):
  // 0=A/attack, 2=X/interact, 3=Y/inventory, 4=LB/camera, 5=RB/fireball,
  // 9=Start/escape, 12-15=DPad, axes 0-1=left analog.
  function pollGamepad() {
    const mapped = ['w', 'a', 's', 'd', ' ', 'e', 'i', 'f', 'c', 'escape', 'shift'];
    for (const k of mapped) gamepadKeys[k] = false;
    axes.x = 0;
    axes.y = 0;

    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    for (const pad of pads) {
      if (!pad) continue;
      axes.x = pad.axes[0] || 0;
      axes.y = pad.axes[1] || 0;
      const t = 0.35;
      const up = pad.buttons[12]?.pressed || pad.axes[1] < -t;
      const down = pad.buttons[13]?.pressed || pad.axes[1] > t;
      const left = pad.buttons[14]?.pressed || pad.axes[0] < -t;
      const right = pad.buttons[15]?.pressed || pad.axes[0] > t;
      if (up) gamepadKeys['w'] = true;
      if (down) gamepadKeys['s'] = true;
      if (left) gamepadKeys['a'] = true;
      if (right) gamepadKeys['d'] = true;
      if (pad.buttons[0]?.pressed) gamepadKeys[' '] = true;
      if (pad.buttons[1]?.pressed) gamepadKeys['shift'] = true;
      if (pad.buttons[2]?.pressed) gamepadKeys['e'] = true;
      if (pad.buttons[3]?.pressed) gamepadKeys['i'] = true;
      if (pad.buttons[5]?.pressed) gamepadKeys['f'] = true;
      if (pad.buttons[4]?.pressed) gamepadKeys['c'] = true;
      if (pad.buttons[9]?.pressed) gamepadKeys['escape'] = true;
    }

    for (const k of mapped) {
      if (gamepadKeys[k] && !prevGamepad[k]) gamepadJust[k] = true;
      prevGamepad[k] = gamepadKeys[k];
    }
    merge();
  }

  // Virtual touch controls mapped onto the same keys.
  function setupTouch() {
    const wrap = document.getElementById('touch-controls');
    if (!wrap) return;
    wrap.querySelectorAll('[data-key]').forEach((el) => {
      const code = el.dataset.key === 'space' ? ' ' : el.dataset.key;
      const start = (e) => {
        e.preventDefault();
        if (!touchKeys[code]) touchJust[code] = true;
        touchKeys[code] = true;
        el.classList.add('active');
        merge();
      };
      const end = (e) => {
        e.preventDefault();
        touchKeys[code] = false;
        el.classList.remove('active');
        merge();
      };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('touchcancel', end, { passive: false });
    });
  }

  function setupJoystick() {
    const base = document.querySelector('.joystick-base');
    const knob = document.querySelector('.joystick-knob');
    if (!base || !knob) return;
    const maxR = 42;
    const dead = 0.1;
    let active = false;

    function set(dx, dy) {
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
      knob.style.left = (42 + dx) + 'px';
      knob.style.top = (42 + dy) + 'px';
      const nx = dx / maxR;
      const ny = dy / maxR;
      axes.x = nx;
      axes.y = ny;
      touchKeys['w'] = ny < -dead;
      touchKeys['a'] = nx < -dead;
      touchKeys['s'] = ny > dead;
      touchKeys['d'] = nx > dead;
      merge();
    }

    function end() {
      active = false;
      base.classList.remove('active');
      knob.style.left = '42px';
      knob.style.top = '42px';
      axes.x = 0;
      axes.y = 0;
      touchKeys['w'] = false;
      touchKeys['a'] = false;
      touchKeys['s'] = false;
      touchKeys['d'] = false;
      merge();
    }

    function getPoint(e) {
      const t = e.changedTouches[0];
      const rect = base.getBoundingClientRect();
      return { x: t.clientX - rect.left - rect.width / 2, y: t.clientY - rect.top - rect.height / 2 };
    }

    base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (navigator.vibrate) navigator.vibrate(15);
      active = true;
      base.classList.add('active');
      const p = getPoint(e);
      set(p.x, p.y);
    }, { passive: false });
    base.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!active) return;
      const p = getPoint(e);
      set(p.x, p.y);
    }, { passive: false });
    base.addEventListener('touchend', (e) => { e.preventDefault(); end(); });
    base.addEventListener('touchcancel', (e) => { e.preventDefault(); end(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { setupTouch(); setupJoystick(); });
  } else {
    setupTouch();
    setupJoystick();
  }

  return {
    keys,
    justPressed,
    axes,
    pollGamepad,
    clearJustPressed() {
      for (const k in keyboardJust) delete keyboardJust[k];
      for (const k in gamepadJust) delete gamepadJust[k];
      for (const k in touchJust) delete touchJust[k];
      merge();
    },
  };
}

// This game needs a keyboard, so phones/tablets get a "desktop only" screen
// instead of an unplayable control scheme.
function isMobileDevice() {
  const uaMobile = /Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const touchOnly = ('maxTouchPoints' in navigator) && navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
  const narrowViewport = Math.min(window.innerWidth, window.innerHeight) < 700;
  return uaMobile || (touchOnly && narrowViewport);
}
