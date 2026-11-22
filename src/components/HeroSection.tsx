import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { ArrowDown } from 'lucide-react';
import { HERO_EDITORIAL_IMAGE } from '../data/initialProducts';
import { ResilientGarmentImage } from './ResilientGarmentImage';
import { triggerHaptic } from '../utils/haptics';

interface HeroSectionProps {
  activePieceCount: number;
  reducedMotion: boolean;
}

const LUXURY_EASE = [0.19, 1, 0.22, 1] as const;

export function HeroSection({ activePieceCount, reducedMotion }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 24,
    mass: 0.4,
  });

  const bgY = useTransform(smoothProgress, [0, 1], ['0%', '18%']);
  const bgScale = useTransform(smoothProgress, [0, 1], [1.03, 1.13]);
  const bgOpacity = useTransform(smoothProgress, [0, 0.85, 1], [0.94, 0.62, 0.3]);
  const contentY = useTransform(smoothProgress, [0, 1], [0, -48]);
  const contentOpacity = useTransform(smoothProgress, [0, 0.72, 1], [1, 0.85, 0.15]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative min-h-[88svh] sm:min-h-[96vh] flex items-end pt-20 pb-9 sm:pt-24 sm:pb-16 md:pb-24 overflow-hidden bg-[#0f0f15] border-b border-[#F3F2F0]/10"
    >
      {/* Scroll-linked 3D depth backdrop */}
      <motion.div
        style={
          reducedMotion
            ? { transform: 'scale(1.02)', opacity: 0.92 }
            : { y: bgY, scale: bgScale, opacity: bgOpacity }
        }
        className="absolute inset-0 will-change-transform origin-center"
      >
        <ResilientGarmentImage
          src={HERO_EDITORIAL_IMAGE}
          alt="NYKTERIA editorial silhouette in obsidian concrete studio"
          title="NYKTERIA"
          className="w-full h-full object-cover object-[50%_18%] md:object-center"
        />
      </motion.div>

      {/* Measured contrast scrims: keep upper/center garment visual open on mobile */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#0f0f15] via-[#0f0f15]/55 via-35% to-transparent"
      />
      <div
        aria-hidden="true"
        className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#0f0f15]/78 via-[#0f0f15]/25 to-transparent"
      />

      {/* Subtle architectural vignette framing */}
      <div
        aria-hidden="true"
        className="absolute inset-3.5 sm:inset-8 md:inset-10 border border-[#F3F2F0]/[0.09] pointer-events-none"
      />

      <motion.div
        style={reducedMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto w-full max-w-[1360px] px-5 sm:px-8 will-change-transform"
      >
        <div className="max-w-md md:max-w-2xl">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05, ease: LUXURY_EASE }}
            className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs tracking-[0.16em] sm:tracking-[0.2em] uppercase text-[#A1A1AA] mb-2.5 sm:mb-5"
          >
            <span>Release 01</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">{activePieceCount} Pieces</span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <span className="hidden sm:inline">Slow-Forged Darkwear</span>
          </motion.div>

          <motion.h1
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: LUXURY_EASE }}
            className="font-display text-[1.75rem] leading-[1.12] sm:text-4xl md:text-[clamp(2.75rem,4.8vw,4.15rem)] md:leading-[1.07] font-semibold tracking-[0.035em] sm:tracking-[0.04em] text-[#F3F2F0] [text-wrap:balance]"
          >
            Obsidian Silhouettes, Released One by One
          </motion.h1>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: LUXURY_EASE }}
            className="mt-2.5 sm:mt-6 text-[13px] leading-snug sm:text-base md:text-lg sm:leading-relaxed text-[#D4D4D8] max-w-sm sm:max-w-xl"
          >
            Small-batch heavyweight cottons, sharp gothic sigils, and unhurried craft built to
            outlast cycles.
          </motion.p>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.28, ease: LUXURY_EASE }}
            className="mt-5 sm:mt-9 flex flex-wrap items-center gap-4 sm:gap-6"
          >
            <a
              href="#release-stage"
              onClick={() => triggerHaptic('tap')}
              className="group inline-flex items-center gap-2.5 sm:gap-3 px-5 sm:px-7 py-3 sm:py-3.5 bg-[#F3F2F0] text-[#070709] text-xs font-semibold tracking-[0.14em] uppercase hover:bg-[#E4E2DE] transition-all duration-200 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
            >
              <span>Inspect Release 01</span>
              <ArrowDown className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>

            <a
              href="#craft-fit"
              onClick={() => triggerHaptic('tap')}
              className="text-xs font-medium tracking-[0.14em] uppercase text-[#A1A1AA] hover:text-[#F3F2F0] transition-colors duration-200 underline underline-offset-8 decoration-[#F3F2F0]/25 hover:decoration-[#8B7CA8] whitespace-nowrap shrink-0 py-2"
            >
              Garment Architecture
            </a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
