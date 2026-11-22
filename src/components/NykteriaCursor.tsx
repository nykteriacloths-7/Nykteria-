import { useEffect, useRef, useState } from 'react';

interface NykteriaCursorProps {
  reducedMotion: boolean;
}

type CursorMode = 'default' | 'action' | 'garment' | 'text' | 'lens';

export function NykteriaCursor({ reducedMotion }: NykteriaCursorProps) {
  const coreRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<CursorMode>('default');
  const [pressed, setPressed] = useState(false);

  const posRef = useRef({
    targetX: -100,
    targetY: -100,
    trailX: -100,
    trailY: -100,
    hasMoved: false,
  });

  // Enable only on fine-pointer devices when reducedMotion is off
  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') {
      setEnabled(false);
      document.documentElement.classList.remove('nyx-custom-cursor-active');
      return;
    }

    const media = window.matchMedia('(pointer: fine)');
    const syncPointerCapability = () => {
      const fine = media.matches;
      setEnabled(fine);
      if (!fine) {
        document.documentElement.classList.remove('nyx-custom-cursor-active');
      }
    };

    syncPointerCapability();
    media.addEventListener('change', syncPointerCapability);
    return () => {
      media.removeEventListener('change', syncPointerCapability);
      document.documentElement.classList.remove('nyx-custom-cursor-active');
    };
  }, [reducedMotion]);

  // Toggle cursor:none class only after user moves pointer
  useEffect(() => {
    if (enabled && visible) {
      document.documentElement.classList.add('nyx-custom-cursor-active');
    } else {
      document.documentElement.classList.remove('nyx-custom-cursor-active');
    }
    return () => {
      document.documentElement.classList.remove('nyx-custom-cursor-active');
    };
  }, [enabled, visible]);

  // 60fps trailing physics & target detection
  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    let active = true;

    const resolveCursorMode = (target: EventTarget | null): CursorMode => {
      if (!(target instanceof Element)) return 'default';
      if (target.closest('input, textarea, select')) return 'text';
      if (target.closest('[data-lens-active="true"]')) return 'lens';
      if (target.closest('[data-cursor="garment"], [data-cursor="stage"]')) return 'garment';
      if (target.closest('button, a, [role="button"], [role="tab"], [role="radio"], label')) {
        return 'action';
      }
      return 'default';
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const p = posRef.current;
      p.targetX = e.clientX;
      p.targetY = e.clientY;
      if (!p.hasMoved) {
        p.trailX = e.clientX;
        p.trailY = e.clientY;
        p.hasMoved = true;
      }
      setVisible(true);
      setMode(resolveCursorMode(e.target));
    };

    const handlePointerDown = () => setPressed(true);
    const handlePointerUp = () => setPressed(false);
    const handleMouseLeave = () => setVisible(false);

    const tick = () => {
      if (!active) return;
      const p = posRef.current;

      // Immediate sharp core follow
      if (coreRef.current) {
        coreRef.current.style.transform = `translate3d(${p.targetX.toFixed(
          2
        )}px, ${p.targetY.toFixed(2)}px, 0)`;
      }

      // Weighted trailing ring follow
      p.trailX += (p.targetX - p.trailX) * 0.14;
      p.trailY += (p.targetY - p.trailY) * 0.14;

      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${p.trailX.toFixed(
          2
        )}px, ${p.trailY.toFixed(2)}px, 0)`;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    rafId = window.requestAnimationFrame(tick);

    return () => {
      active = false;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled]);

  if (!enabled || !visible || mode === 'text' || mode === 'lens') return null;

  const isGarment = mode === 'garment';
  const isAction = mode === 'action';

  const ringScale = pressed
    ? 0.84
    : isGarment
    ? 2.05
    : isAction
    ? 1.5
    : 1;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] pointer-events-none select-none overflow-hidden"
    >
      {/* Trailing Branded Reticle */}
      <div
        ref={trailRef}
        className="fixed top-0 left-0 will-change-transform"
      >
        <div
          style={{
            transform: `translate3d(-50%, -50%, 0) scale3d(${ringScale}, ${ringScale}, 1)`,
            transition:
              'transform 260ms cubic-bezier(0.19, 1, 0.22, 1), border-color 220ms ease, box-shadow 260ms ease, background-color 220ms ease',
          }}
          className={`relative flex items-center justify-center w-9 h-9 rounded-full border ${
            isGarment
              ? 'border-[#A796C9]/75 bg-[#8B7CA8]/[0.12] shadow-[0_0_26px_rgba(139,124,168,0.38)]'
              : isAction
              ? 'border-[#A796C9]/70 bg-[#8B7CA8]/[0.1] shadow-[0_0_18px_rgba(139,124,168,0.3)]'
              : 'border-[#F3F2F0]/30 bg-transparent shadow-none'
          }`}
        >
          {/* Minimalist NYKTERIA brand micro-tag */}
          <span
            style={{
              opacity: isGarment ? 0.95 : isAction ? 0.8 : 0.55,
              transform: `translate3d(0, ${isGarment ? '24px' : '22px'}, 0) scale(${(
                1 / ringScale
              ).toFixed(3)})`,
              transition: 'opacity 200ms ease, transform 240ms cubic-bezier(0.19, 1, 0.22, 1)',
            }}
            className="absolute font-display text-[8px] tracking-[0.26em] uppercase text-[#F3F2F0] whitespace-nowrap drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]"
          >
            NYKTERIA
          </span>
        </div>
      </div>

      {/* Sharp Center Diamond Core */}
      <div
        ref={coreRef}
        className="fixed top-0 left-0 will-change-transform"
      >
        <div
          style={{
            transform: `translate3d(-50%, -50%, 0) rotate(45deg) scale(${
              pressed ? 0.75 : isGarment || isAction ? 1.25 : 1
            })`,
            transition: 'transform 160ms cubic-bezier(0.19, 1, 0.22, 1), background-color 180ms ease',
          }}
          className={`w-1.5 h-1.5 ${
            isGarment || isAction
              ? 'bg-[#A796C9] shadow-[0_0_10px_rgba(167,150,201,0.85)]'
              : 'bg-[#F3F2F0]'
          }`}
        />
      </div>
    </div>
  );
}
