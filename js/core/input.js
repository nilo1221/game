// core/input.js — keyboard state and mobile-device detection. Nothing here
// knows about the game itself; game.js reads `keys`/`justPressed` each frame.

function createInputState() {
  const keyboardKeys = {};
  const keyboardJust = {};
  const gamepadKeys = {};
  const gamepadJust = {};
  const prevGamepad = {};
  const allKnown = new Set();
  const keys = {};
  const justPressed = {};

  function merge() {
    for (const k in keyboardKeys) allKnown.add(k);
    for (const k in gamepadKeys) allKnown.add(k);
    for (const k of allKnown) {
      keys[k] = !!(keyboardKeys[k] || gamepadKeys[k]);
      justPressed[k] = !!(keyboardJust[k] || gamepadJust[k]);
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
    const mapped = ['w', 'a', 's', 'd', ' ', 'e', 'i', 'f', 'c', 'escape'];
    for (const k of mapped) gamepadKeys[k] = false;

    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    for (const pad of pads) {
      if (!pad) continue;
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

  return {
    keys,
    justPressed,
    pollGamepad,
    clearJustPressed() {
      for (const k in keyboardJust) delete keyboardJust[k];
      for (const k in gamepadJust) delete gamepadJust[k];
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
