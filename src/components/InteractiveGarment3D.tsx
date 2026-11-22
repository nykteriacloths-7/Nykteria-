import { useEffect, useRef, useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Move3d, Orbit, Repeat, ScanSearch } from 'lucide-react';
import { GarmentViewAngle, Product } from '../types';
import { ResilientGarmentImage } from './ResilientGarmentImage';
import { triggerHaptic } from '../utils/haptics';

const LENS_MAGNIFICATION = 2.6;

interface InteractiveGarment3DProps {
  product: Product;
  viewAngle: GarmentViewAngle;
  onChangeViewAngle: (angle: GarmentViewAngle) => void;
  reducedMotion: boolean;
}

export function InteractiveGarment3D({
  product,
  viewAngle,
  onChangeViewAngle,
  reducedMotion,
}: InteractiveGarment3DProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const backdropPlaneRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const frontSheenRef = useRef<HTMLDivElement>(null);
  const backSheenRef = useRef<HTMLDivElement>(null);
  const frontFaceRef = useRef<HTMLDivElement>(null);
  const backFaceRef = useRef<HTMLDivElement>(null);
  const lensWrapRef = useRef<HTMLDivElement>(null);
  const lensImgRef = useRef<HTMLImageElement>(null);

  const [isZoomed, setIsZoomed] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [isLensActive, setIsLensActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [liveYawDisplay, setLiveYawDisplay] = useState(0);

  // Target & current 60fps damped physics state stored in refs to avoid React re-renders
  const targetRef = useRef({ rx: 0, ry: 0, tx: 0, ty: 0, scale: 1 });
  const currentRef = useRef({ rx: 0, ry: 0, tx: 0, ty: 0, tz: 0, scale: 1 });
  const dragOffsetRef = useRef(0);
  const orbitOffsetRef = useRef(0);
  const lastDisplayYawRef = useRef(0);

  // Touch-safe drag tracking: waits for clear horizontal intent before locking drag,
  // so vertical page scrolling on mobile is never hijacked.
  const dragSessionRef = useRef<{
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    startOffset: number;
    committed: boolean;
  } | null>(null);

  // Sync preset target orientation when Front / Back / 3D Angle changes
  useEffect(() => {
    dragOffsetRef.current = 0;
    orbitOffsetRef.current = 0;
    if (viewAngle === 'front') {
      targetRef.current.ry = 0;
      targetRef.current.rx = 0;
    } else if (viewAngle === 'back') {
      targetRef.current.ry = 180;
      targetRef.current.rx = 0;
    } else {
      targetRef.current.ry = -22;
      targetRef.current.rx = 5;
    }
  }, [viewAngle, product.id]);

  useEffect(() => {
    targetRef.current.scale = isZoomed ? 1.18 : 1;
  }, [isZoomed]);

  useEffect(() => {
    setIsZoomed(false);
    setIsOrbiting(false);
    setIsLensActive(false);
  }, [product.id]);

  // Keep Lens loupe hidden whenever Lens mode toggles off
  useEffect(() => {
    if (!isLensActive && lensWrapRef.current) {
      lensWrapRef.current.style.opacity = '0';
    }
  }, [isLensActive]);

  // Continuous 60fps exponential-damped 3D spatial loop
  useEffect(() => {
    if (reducedMotion) {
      const yAngle = viewAngle === 'back' ? 180 : viewAngle === 'angle' ? -14 : 0;
      const scale = isZoomed ? 1.15 : 1;
      currentRef.current.ry = yAngle;
      if (rigRef.current) {
        rigRef.current.style.transform = `translate3d(0px, 0px, 0px) rotateY(${yAngle}deg) scale3d(${scale}, ${scale}, 1)`;
      }
      setLiveYawDisplay(((yAngle % 360) + 360) % 360);
      return;
    }

    let rafId = 0;
    let active = true;
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (!active) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (isOrbiting && !dragSessionRef.current?.committed) {
        orbitOffsetRef.current += dt * 32;
      }

      const cur = currentRef.current;
      const tgt = targetRef.current;
      const k = 1 - Math.exp(-8.5 * dt);

      const combinedTargetRy = tgt.ry + dragOffsetRef.current + orbitOffsetRef.current;
      const idleFloatY =
        isDragging || isZoomed || isLensActive ? 0 : Math.sin(now * 0.0014) * 3.2;

      cur.rx += (tgt.rx - cur.rx) * k;
      cur.ry += (combinedTargetRy - cur.ry) * k;
      cur.tx += (tgt.tx - cur.tx) * k;
      cur.ty += (tgt.ty + idleFloatY - cur.ty) * k;
      cur.scale += (tgt.scale - cur.scale) * k;

      // Subtle Z-depth push & edge-on pitch lift during 180° flip arc
      const ryRad = (cur.ry * Math.PI) / 180;
      const edgeFactor = Math.abs(Math.sin(ryRad)); // Peaks at 90° / 270°
      const flipArcScale = cur.scale * (1 - edgeFactor * 0.045);
      const targetTz = isZoomed ? 22 : isDragging ? 14 : 8 - edgeFactor * 18;
      cur.tz += (targetTz - cur.tz) * k;

      const dynamicRx = cur.rx - edgeFactor * 3.2;

      if (rigRef.current) {
        rigRef.current.style.transform = `translate3d(${cur.tx.toFixed(2)}px, ${cur.ty.toFixed(
          2
        )}px, ${cur.tz.toFixed(1)}px) rotateX(${dynamicRx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(
          2
        )}deg) scale3d(${flipArcScale.toFixed(3)}, ${flipArcScale.toFixed(3)}, 1)`;
      }

      // Counter-parallax on deeper Z studio frame
      if (backdropPlaneRef.current) {
        backdropPlaneRef.current.style.transform = `translate3d(${(-cur.tx * 0.65).toFixed(
          2
        )}px, ${(-cur.ty * 0.45).toFixed(2)}px, -42px)`;
      }

      // Dynamic floor shadow shifts opposite to horizontal yaw
      if (shadowRef.current) {
        const shadowX = (-Math.sin(ryRad) * 14).toFixed(2);
        const shadowScaleX = (0.76 + Math.abs(Math.cos(ryRad)) * 0.24).toFixed(3);
        shadowRef.current.style.transform = `translate3d(${shadowX}px, 0, 0) scaleX(${shadowScaleX})`;
      }

      // Specular gothic ash-violet rim sheen reactive to angle & tilt
      const sheenX = 50 + cur.tx * 1.9 + Math.sin(ryRad) * 30;
      const sheenY = 32 + cur.ty * 1.5;
      const sheenGradient = `radial-gradient(circle at ${sheenX.toFixed(1)}% ${sheenY.toFixed(
        1
      )}%, rgba(182, 168, 214, 0.22), rgba(16, 16, 20, 0) 58%)`;

      if (frontSheenRef.current) {
        frontSheenRef.current.style.background = sheenGradient;
      }
      if (backSheenRef.current) {
        backSheenRef.current.style.background = sheenGradient;
      }

      const roundedYaw = ((Math.round(cur.ry) % 360) + 360) % 360;
      if (Math.abs(roundedYaw - lastDisplayYawRef.current) >= 2) {
        lastDisplayYawRef.current = roundedYaw;
        setLiveYawDisplay(roundedYaw);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      active = false;
      window.cancelAnimationFrame(rafId);
    };
  }, [reducedMotion, viewAngle, isZoomed, isOrbiting, isDragging, isLensActive]);

  const updateLensPosition = (clientX: number, clientY: number) => {
    if (!isLensActive || !stageRef.current || !lensWrapRef.current || !lensImgRef.current) {
      return;
    }

    const stageRect = stageRef.current.getBoundingClientRect();
    const normalizedYaw = ((currentRef.current.ry % 360) + 360) % 360;
    const isRear = normalizedYaw > 90 && normalizedYaw < 270;
    const activeFaceEl = isRear ? backFaceRef.current : frontFaceRef.current;
    if (!activeFaceEl) return;

    const faceRect = activeFaceEl.getBoundingClientRect();
    const insideFace =
      clientX >= faceRect.left &&
      clientX <= faceRect.right &&
      clientY >= faceRect.top &&
      clientY <= faceRect.bottom;

    if (!insideFace || faceRect.width <= 0 || faceRect.height <= 0) {
      lensWrapRef.current.style.opacity = '0';
      return;
    }

    const sx = clientX - stageRect.left;
    const sy = clientY - stageRect.top;
    const fx = clientX - faceRect.left;
    const fy = clientY - faceRect.top;
    const lensHalf = lensWrapRef.current.offsetWidth / 2 || 76;

    lensWrapRef.current.style.opacity = '1';
    lensWrapRef.current.style.transform = `translate3d(${(sx - lensHalf).toFixed(1)}px, ${(
      sy - lensHalf
    ).toFixed(1)}px, 0)`;

    lensImgRef.current.style.width = `${(faceRect.width * LENS_MAGNIFICATION).toFixed(1)}px`;
    lensImgRef.current.style.height = `${(faceRect.height * LENS_MAGNIFICATION).toFixed(1)}px`;
    lensImgRef.current.style.transform = `translate3d(${(
      lensHalf -
      fx * LENS_MAGNIFICATION
    ).toFixed(1)}px, ${(lensHalf - fy * LENS_MAGNIFICATION).toFixed(1)}px, 0)`;
  };

  const updateSpotlightVars = (clientX: number, clientY: number) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    if (frontFaceRef.current) {
      frontFaceRef.current.style.setProperty('--spot-x', `${xPct.toFixed(1)}%`);
      frontFaceRef.current.style.setProperty('--spot-y', `${yPct.toFixed(1)}%`);
      frontFaceRef.current.style.setProperty('--spot-opacity', '1');
    }
    if (backFaceRef.current) {
      backFaceRef.current.style.setProperty('--spot-x', `${(100 - xPct).toFixed(1)}%`);
      backFaceRef.current.style.setProperty('--spot-y', `${yPct.toFixed(1)}%`);
      backFaceRef.current.style.setProperty('--spot-opacity', '1');
    }
    return { rect, xPct, yPct };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLensActive) {
      updateSpotlightVars(e.clientX, e.clientY);
      updateLensPosition(e.clientX, e.clientY);
    }
    if (reducedMotion) return;
    dragSessionRef.current = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      startOffset: dragOffsetRef.current,
      committed: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const spot = updateSpotlightVars(e.clientX, e.clientY);
    if (isLensActive && !isDragging) {
      updateLensPosition(e.clientX, e.clientY);
    } else if (lensWrapRef.current) {
      lensWrapRef.current.style.opacity = '0';
    }

    if (reducedMotion || !spot) return;

    const session = dragSessionRef.current;
    if (session && session.pointerId === e.pointerId) {
      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;

      if (!session.committed) {
        // Allow vertical mobile swipes to scroll the page natively without interference
        if (session.pointerType === 'touch' && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          dragSessionRef.current = null;
          return;
        }
        if (Math.abs(dx) > 6 && Math.abs(dx) >= Math.abs(dy) * 0.85) {
          session.committed = true;
          setIsOrbiting(false);
          setIsDragging(true);
          if (lensWrapRef.current) {
            lensWrapRef.current.style.opacity = '0';
          }
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Ignore if pointer capture is unavailable
          }
        }
      }

      if (session.committed) {
        dragOffsetRef.current = session.startOffset + dx * 0.65;
        targetRef.current.rx = Math.max(-14, Math.min(14, -dy * 0.08));
        return;
      }
    }

    // Gentle hover tilt for desktop mouse pointer (paused in Lens mode so details stay anchored)
    if (e.pointerType !== 'touch' && !isOrbiting && !isLensActive) {
      const { rect } = spot;
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;

      const baseRx = viewAngle === 'angle' ? 5 : 0;
      const baseRy = viewAngle === 'back' ? 180 : viewAngle === 'angle' ? -22 : 0;

      targetRef.current.rx = baseRx - ny * 11;
      targetRef.current.ry = baseRy + nx * 16;
      targetRef.current.tx = nx * 10;
      targetRef.current.ty = ny * 7;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (session && session.pointerId === e.pointerId) {
      if (session.committed) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore if already released
        }
        targetRef.current.rx = viewAngle === 'angle' && !isLensActive ? 5 : 0;
      }
      dragSessionRef.current = null;
      setIsDragging(false);
    }
  };

  const handlePointerLeave = () => {
    frontFaceRef.current?.style.setProperty('--spot-opacity', '0');
    backFaceRef.current?.style.setProperty('--spot-opacity', '0');
    if (lensWrapRef.current) {
      lensWrapRef.current.style.opacity = '0';
    }

    if (!dragSessionRef.current?.committed && !isOrbiting) {
      targetRef.current.tx = 0;
      targetRef.current.ty = 0;
      if (viewAngle === 'front') {
        targetRef.current.rx = 0;
        targetRef.current.ry = 0;
      } else if (viewAngle === 'back') {
        targetRef.current.rx = 0;
        targetRef.current.ry = 180;
      } else {
        targetRef.current.rx = isLensActive ? 0 : 5;
        targetRef.current.ry = isLensActive ? 0 : -22;
      }
    }
  };

  const toggleLensMode = () => {
    triggerHaptic('select');
    setIsLensActive((prev) => {
      const next = !prev;
      if (next) {
        setIsOrbiting(false);
        dragOffsetRef.current = 0;
        orbitOffsetRef.current = 0;
        const isRear = liveYawDisplay > 90 && liveYawDisplay < 270;
        if (viewAngle === 'angle') {
          onChangeViewAngle(isRear ? 'back' : 'front');
        }
        targetRef.current.rx = 0;
        targetRef.current.tx = 0;
        targetRef.current.ty = 0;
        targetRef.current.ry = isRear ? 180 : 0;
      }
      return next;
    });
  };

  const triggerFlip = () => {
    triggerHaptic('flip');
    setIsOrbiting(false);
    const isCurrentlyRear = liveYawDisplay > 90 && liveYawDisplay < 270;
    onChangeViewAngle(isCurrentlyRear ? 'front' : 'back');
  };

  const isRearFacing = liveYawDisplay > 105 && liveYawDisplay < 255;
  const activeLensSrc = isRearFacing ? product.backImage : product.frontImage;

  return (
    <div className="flex flex-col">
      {/* 3D Interactive Real-Garment Spatial Stage */}
      <div
        ref={stageRef}
        data-cursor="stage"
        data-lens-active={isLensActive ? 'true' : undefined}
        onPointerEnter={() => {
          frontFaceRef.current?.style.setProperty('--spot-opacity', '1');
          backFaceRef.current?.style.setProperty('--spot-opacity', '1');
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={triggerFlip}
        className={`relative min-h-[390px] aspect-[4/5] sm:aspect-[3/4] w-full bg-[#070709] border border-[#F3F2F0]/12 overflow-hidden nyx-perspective select-none touch-pan-y ${
          isLensActive
            ? 'cursor-crosshair'
            : isDragging
            ? 'cursor-grabbing'
            : 'cursor-grab'
        }`}
        aria-label={`Interactive 3D view of ${product.name}`}
      >
        {/* Obsidian Rim Backdrop Lighting */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 42%, rgba(167, 150, 201, 0.14) 0%, rgba(14, 14, 20, 0.58) 46%, rgba(7, 7, 9, 0.99) 80%)',
          }}
        />

        {/* Animated Pulsing Editorial Aura Behind Garment */}
        <div aria-hidden="true" className="absolute inset-0 nyx-garment-aura" />

        {/* Deep Parallax Architectural Crosshairs (Z -42px) */}
        <div
          ref={backdropPlaneRef}
          aria-hidden="true"
          className="absolute inset-3.5 sm:inset-5 border border-[#F3F2F0]/[0.06] pointer-events-none will-change-transform"
        >
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#F3F2F0]/[0.04]" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#F3F2F0]/[0.04]" />
          <span className="absolute -top-2 -left-1.5 font-mono-num text-[11px] text-[#F3F2F0]/25">
            +
          </span>
          <span className="absolute -top-2 -right-1.5 font-mono-num text-[11px] text-[#F3F2F0]/25">
            +
          </span>
          <span className="absolute -bottom-2 -left-1.5 font-mono-num text-[11px] text-[#F3F2F0]/25">
            +
          </span>
          <span className="absolute -bottom-2 -right-1.5 font-mono-num text-[11px] text-[#F3F2F0]/25">
            +
          </span>
        </div>

        {/* Dynamic Garment Plinth Floor Shadow */}
        <div
          ref={shadowRef}
          aria-hidden="true"
          className="absolute bottom-4 sm:bottom-5 inset-x-12 sm:inset-x-16 h-5 rounded-full bg-black/85 blur-xl pointer-events-none will-change-transform"
        />

        {/* Layer 2: Double-Sided High-Resolution 3D Garment Card */}
        <div className="absolute inset-0 flex items-center justify-center px-5 py-9 sm:px-9 sm:py-10 nyx-perspective">
          <div
            ref={rigRef}
            className="relative w-full h-full nyx-preserve-3d will-change-transform"
          >
            {/* Front Face (0 deg) */}
            <div
              ref={frontFaceRef}
              className="absolute inset-0 nyx-backface-hidden overflow-hidden bg-[#0a0a0e] border border-[#F3F2F0]/15 shadow-[0_32px_90px_rgba(0,0,0,0.9)]"
            >
              <ResilientGarmentImage
                src={product.frontImage}
                alt={`${product.name} — Front View`}
                title={product.shortName}
                viewLabel="Front Silhouette"
                className="w-full h-full object-cover object-center"
              />
              {/* Subtle top silver rim accent */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#F3F2F0]/35 to-transparent pointer-events-none"
              />
              <div
                ref={frontSheenRef}
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 nyx-editorial-spotlight-ring"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 nyx-editorial-spotlight"
              />
            </div>

            {/* Back Face (180 deg) */}
            <div
              ref={backFaceRef}
              className="absolute inset-0 nyx-backface-hidden overflow-hidden bg-[#0a0a0e] border border-[#F3F2F0]/15 shadow-[0_32px_90px_rgba(0,0,0,0.9)]"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <ResilientGarmentImage
                src={product.backImage}
                alt={`${product.name} — Back Artwork View`}
                title={product.shortName}
                viewLabel="Back Artwork"
                className="w-full h-full object-cover object-center"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#A796C9]/45 to-transparent pointer-events-none"
              />
              <div
                ref={backSheenRef}
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 nyx-editorial-spotlight-ring"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 nyx-editorial-spotlight"
              />
            </div>
          </div>
        </div>

        {/* Optical Textile & Print Magnification Loupe (Lens Mode) */}
        {isLensActive && activeLensSrc && (
          <div
            ref={lensWrapRef}
            aria-hidden="true"
            style={{ opacity: 0, transition: 'opacity 140ms ease' }}
            className="absolute top-0 left-0 z-30 w-[132px] h-[132px] sm:w-[164px] sm:h-[164px] rounded-full overflow-hidden pointer-events-none border border-[#A796C9]/80 bg-[#070709] shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_28px_rgba(139,124,168,0.28)]"
          >
            <img
              ref={lensImgRef}
              src={activeLensSrc}
              alt=""
              referrerPolicy="no-referrer"
              className="absolute top-0 left-0 max-w-none object-cover object-center pointer-events-none select-none will-change-transform"
            />
            {/* Optical glass rim vignette + hairline crosshair */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow:
                  'inset 0 0 22px rgba(7,7,9,0.72), inset 0 0 0 1px rgba(243,242,240,0.22)',
              }}
            />
            <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-[#A796C9]/70" />
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-[#A796C9]/70" />
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-[1px] bg-[#A796C9]/70" />
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-[1px] bg-[#A796C9]/70" />
            <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 font-mono-num text-[9px] tracking-[0.16em] uppercase text-[#F3F2F0]/90 bg-[#070709]/80 px-1.5 py-0.5">
              {LENS_MAGNIFICATION.toFixed(1)}×
            </span>
          </div>
        )}

        {/* Floating Corner Stage HUD (strictly outside inner garment padding) */}
        <div className="absolute top-3 inset-x-3.5 sm:top-4 sm:inset-x-5 z-20 pointer-events-none flex items-center justify-between gap-2 text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-[#A1A1AA]">
          <span className="inline-flex items-center gap-1.5 truncate">
            {isLensActive ? (
              <ScanSearch className="w-3.5 h-3.5 text-[#A796C9] shrink-0" />
            ) : (
              <Move3d className="w-3.5 h-3.5 text-[#8B7CA8] shrink-0" />
            )}
            <span className="sm:hidden">
              {isLensActive ? 'Lens 2.6× · Tap Fabric' : 'Swipe 3D · Tap Flip'}
            </span>
            <span className="hidden sm:inline">
              {isLensActive
                ? 'Lens 2.6× · Hover Texture & Print'
                : reducedMotion
                ? 'Studio View'
                : 'Drag 3D · Double-Click Flip'}
            </span>
          </span>
          <span className="font-mono-num text-[#F3F2F0]/85 shrink-0">
            {String(liveYawDisplay).padStart(3, '0')}°
          </span>
        </div>

        {/* Bottom Face Calibration Readout */}
        <div className="absolute bottom-2.5 inset-x-3.5 sm:bottom-3.5 sm:inset-x-5 z-20 pointer-events-none flex items-center justify-between text-[10px] font-mono-num tracking-[0.14em] uppercase text-[#A1A1AA]/75">
          <span>{isRearFacing ? 'Rear Artwork' : 'Front Silhouette'}</span>
          <span className="hidden sm:inline">{product.releaseNumber}</span>
        </div>
      </div>

      {/* Mobile-First Thumb-Friendly Inspection Toolbar */}
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 border border-[#F3F2F0]/10 bg-[#101014] p-2">
        <div
          className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-1"
          role="group"
          aria-label="Garment angle views"
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic('flip');
              setIsOrbiting(false);
              onChangeViewAngle('front');
            }}
            className={`px-3 py-2.5 sm:py-2 text-xs font-medium tracking-[0.08em] uppercase transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8] ${
              viewAngle === 'front' && !isOrbiting
                ? 'bg-[#F3F2F0] text-[#070709]'
                : 'text-[#A1A1AA] hover:text-[#F3F2F0] bg-[#09090d] sm:bg-transparent'
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('flip');
              setIsOrbiting(false);
              onChangeViewAngle('back');
            }}
            className={`px-3 py-2.5 sm:py-2 text-xs font-medium tracking-[0.08em] uppercase transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8] ${
              viewAngle === 'back' && !isOrbiting
                ? 'bg-[#F3F2F0] text-[#070709]'
                : 'text-[#A1A1AA] hover:text-[#F3F2F0] bg-[#09090d] sm:bg-transparent'
            }`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('flip');
              setIsOrbiting(false);
              setIsLensActive(false);
              onChangeViewAngle('angle');
            }}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-medium tracking-[0.08em] uppercase transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8] ${
              viewAngle === 'angle' && !isOrbiting
                ? 'bg-[#8B7CA8] text-[#070709]'
                : 'text-[#A1A1AA] hover:text-[#F3F2F0] bg-[#09090d] sm:bg-transparent'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>3D Tilt</span>
          </button>

          <button
            type="button"
            onClick={triggerFlip}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-medium tracking-[0.08em] uppercase text-[#A1A1AA] hover:text-[#F3F2F0] bg-[#09090d] sm:bg-transparent transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8] ${
              reducedMotion ? 'col-span-3 sm:col-span-1' : ''
            }`}
          >
            <Repeat className="w-3.5 h-3.5 text-[#A796C9]" />
            <span>Flip 180°</span>
          </button>

          {!reducedMotion && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setIsLensActive(false);
                setIsOrbiting((prev) => !prev);
              }}
              aria-pressed={isOrbiting}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-medium tracking-[0.08em] uppercase transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8] ${
                isOrbiting
                  ? 'bg-[#8B7CA8] text-[#070709]'
                  : 'text-[#A1A1AA] hover:text-[#F3F2F0] bg-[#09090d] sm:bg-transparent'
              }`}
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>Orbit</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleLensMode}
            aria-pressed={isLensActive}
            className={`sm:hidden inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium tracking-[0.08em] uppercase transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8] ${
              isLensActive
                ? 'bg-[#8B7CA8] text-[#070709]'
                : 'text-[#A1A1AA] hover:text-[#F3F2F0] bg-[#09090d]'
            }`}
          >
            <ScanSearch className="w-3.5 h-3.5" />
            <span>Lens</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleLensMode}
            aria-pressed={isLensActive}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium tracking-[0.08em] uppercase border transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8] ${
              isLensActive
                ? 'border-[#A796C9] bg-[#8B7CA8] text-[#070709]'
                : 'border-[#F3F2F0]/10 bg-[#070709] text-[#A1A1AA] hover:text-[#F3F2F0]'
            }`}
          >
            <ScanSearch className="w-3.5 h-3.5" />
            <span>Lens</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              setIsZoomed((prev) => !prev);
            }}
            aria-pressed={isZoomed}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 text-xs font-medium tracking-[0.08em] uppercase text-[#A1A1AA] hover:text-[#F3F2F0] border border-[#F3F2F0]/10 bg-[#070709] transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
          >
            {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
            <span>{isZoomed ? 'Reset Zoom' : 'Inspect'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
