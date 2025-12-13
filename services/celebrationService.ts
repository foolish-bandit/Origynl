/**
 * Celebration Service
 * Success animations and visual feedback
 */

import confetti from 'canvas-confetti';

/**
 * Fire confetti celebration
 */
export function celebrate(type: 'success' | 'certified' | 'verified' = 'success'): void {
  const colors = {
    success: ['#10b981', '#84cc16', '#22c55e'],
    certified: ['#ea580c', '#f97316', '#fb923c'],
    verified: ['#3b82f6', '#60a5fa', '#93c5fd'],
  };

  const particleCount = type === 'certified' ? 150 : 100;

  confetti({
    particleCount,
    spread: 70,
    origin: { y: 0.6 },
    colors: colors[type],
    disableForReducedMotion: true,
  });
}

/**
 * Fire continuous confetti
 */
export function celebrateContinuous(duration: number = 3000): () => void {
  const end = Date.now() + duration;
  let animationFrame: number;

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#ea580c', '#f97316', '#fb923c'],
      disableForReducedMotion: true,
    });

    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#ea580c', '#f97316', '#fb923c'],
      disableForReducedMotion: true,
    });

    if (Date.now() < end) {
      animationFrame = requestAnimationFrame(frame);
    }
  };

  frame();

  // Return stop function
  return () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  };
}

/**
 * Fire confetti from specific position
 */
export function celebrateFrom(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x, y },
    colors: ['#ea580c', '#f97316', '#fb923c'],
    disableForReducedMotion: true,
  });
}

/**
 * Fire realistic confetti cannon
 */
export function confettiCannon(): void {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    disableForReducedMotion: true,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#ea580c', '#f97316'],
  });

  fire(0.2, {
    spread: 60,
    colors: ['#fb923c', '#fdba74'],
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#fed7aa', '#ffedd5'],
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#ea580c', '#f97316'],
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#fb923c', '#fdba74'],
  });
}

/**
 * Fire emoji celebration
 */
export function celebrateWithEmoji(emoji: string = '🎉'): void {
  const scalar = 2;
  const unicodeEmoji = confetti.shapeFromText({ text: emoji, scalar });

  confetti({
    shapes: [unicodeEmoji],
    particleCount: 50,
    spread: 100,
    origin: { y: 0.6 },
    scalar,
    disableForReducedMotion: true,
  });
}

/**
 * Fire blockchain-themed celebration
 */
export function celebrateBlockchain(): void {
  // Create chain link emoji effect
  const shapes = [
    confetti.shapeFromText({ text: '🔗', scalar: 2 }),
    confetti.shapeFromText({ text: '✓', scalar: 2 }),
    confetti.shapeFromText({ text: '🔒', scalar: 2 }),
  ];

  confetti({
    shapes,
    particleCount: 60,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#ea580c', '#f97316', '#fb923c'],
    disableForReducedMotion: true,
  });
}

/**
 * Fire AI detection celebration
 */
export function celebrateAIDetection(isAuthentic: boolean): void {
  const emoji = isAuthentic ? '✓' : '⚠';
  const colors = isAuthentic
    ? ['#10b981', '#84cc16', '#22c55e']
    : ['#f97316', '#fb923c', '#fdba74'];

  const shape = confetti.shapeFromText({ text: emoji, scalar: 2 });

  confetti({
    shapes: [shape],
    particleCount: 40,
    spread: 60,
    origin: { y: 0.6 },
    colors,
    disableForReducedMotion: true,
  });
}

/**
 * Create pulsing success indicator
 */
export function createSuccessPulse(element: HTMLElement, duration: number = 2000): () => void {
  element.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';

  let iteration = 0;
  const maxIterations = Math.floor(duration / 600);

  const pulse = () => {
    if (iteration >= maxIterations) {
      element.style.transform = '';
      element.style.boxShadow = '';
      return;
    }

    iteration++;

    // Scale up
    element.style.transform = 'scale(1.05)';
    element.style.boxShadow = '0 0 20px rgba(234, 88, 12, 0.5)';

    setTimeout(() => {
      // Scale down
      element.style.transform = 'scale(1)';
      element.style.boxShadow = '';

      setTimeout(pulse, 300);
    }, 300);
  };

  pulse();

  // Return stop function
  return () => {
    iteration = maxIterations;
    element.style.transform = '';
    element.style.boxShadow = '';
  };
}

/**
 * Show toast notification
 */
export function showToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'success',
  duration: number = 3000
): void {
  const toast = document.createElement('div');

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };

  const icons = {
    success: '✓',
    error: '✗',
    info: 'ⓘ',
  };

  toast.className = `fixed top-4 right-4 ${bgColors[type]} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 z-50 animate-slide-in-right`;
  toast.innerHTML = `
    <span class="text-xl font-bold">${icons[type]}</span>
    <span class="font-medium">${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, duration);
}
