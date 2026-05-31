const TILT_SENSITIVITY = 22;
const TILT_DEAD_ZONE = 0.08;

export function createInputController() {
  const keys = new Set();
  const movementKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']);
  const tilt = {
    enabled: false,
    status: getInitialTiltStatus(),
    gamma: 0,
    beta: 0,
    originGamma: null,
    originBeta: null,
  };
  let onStatusChangeCallback = () => {};

  function setTiltStatus(status) {
    if (tilt.status === status) return;

    tilt.status = status;
    onStatusChangeCallback(status);
  }

  function start() {
    window.addEventListener('keydown', (event) => {
      if (movementKeys.has(event.key)) {
        event.preventDefault();
      }

      keys.add(event.key);
    });
    window.addEventListener('keyup', (event) => keys.delete(event.key));
  }

  async function enableTilt() {
    if (!window.isSecureContext) {
      setTiltStatus('needs-https');
      return tilt.status;
    }

    const hasOrientation = 'DeviceOrientationEvent' in window;
    const hasMotion = 'DeviceMotionEvent' in window;

    if (!hasOrientation && !hasMotion) {
      setTiltStatus('unsupported');
      return tilt.status;
    }

    try {
      if (hasOrientation && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          setTiltStatus('denied');
          return tilt.status;
        }
      }

      tilt.enabled = true;
      setTiltStatus('waiting');
      tilt.originGamma = null;
      tilt.originBeta = null;
      window.addEventListener('deviceorientation', handleDeviceOrientation);
      window.addEventListener('devicemotion', handleDeviceMotion);
      return tilt.status;
    } catch {
      setTiltStatus('denied');
      return tilt.status;
    }
  }

  function getDirection() {
    const keyboardDirection = getKeyboardDirection();
    const tiltDirection = getTiltDirection();

    return {
      x: clampDirection(keyboardDirection.x + tiltDirection.x),
      y: clampDirection(keyboardDirection.y + tiltDirection.y),
    };
  }

  function getStatus() {
    return tilt.status;
  }

  function onStatusChange(callback) {
    onStatusChangeCallback = callback;
  }

  function handleDeviceOrientation(event) {
    if (typeof event.gamma !== 'number' || typeof event.beta !== 'number') return;

    if (tilt.originGamma === null || tilt.originBeta === null) {
      tilt.originGamma = event.gamma;
      tilt.originBeta = event.beta;
    }

    tilt.gamma = event.gamma - tilt.originGamma;
    tilt.beta = event.beta - tilt.originBeta;
    setTiltStatus('active');
  }

  function handleDeviceMotion(event) {
    if (tilt.status === 'active') return;

    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration || typeof acceleration.x !== 'number' || typeof acceleration.y !== 'number') return;

    if (tilt.originGamma === null || tilt.originBeta === null) {
      tilt.originGamma = acceleration.x;
      tilt.originBeta = acceleration.y;
    }

    tilt.gamma = (acceleration.x - tilt.originGamma) * 3;
    tilt.beta = (acceleration.y - tilt.originBeta) * -3;
    setTiltStatus('active');
  }

  function getKeyboardDirection() {
    return {
      x: Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a')),
      y: Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w')),
    };
  }

  function getTiltDirection() {
    if (!tilt.enabled) {
      return { x: 0, y: 0 };
    }

    return {
      x: applyDeadZone(tilt.gamma / TILT_SENSITIVITY),
      y: applyDeadZone(tilt.beta / TILT_SENSITIVITY),
    };
  }

  return {
    start,
    enableTilt,
    getDirection,
    getStatus,
    onStatusChange,
  };
}

function getInitialTiltStatus() {
  if (!window.isSecureContext) return 'needs-https';
  return 'ready';
}

function applyDeadZone(value) {
  const clampedValue = clampDirection(value);
  return Math.abs(clampedValue) < TILT_DEAD_ZONE ? 0 : clampedValue;
}

function clampDirection(value) {
  return Math.max(-1, Math.min(1, value));
}
