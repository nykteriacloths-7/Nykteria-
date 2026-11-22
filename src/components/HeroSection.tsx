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
      className="relative min-h-[94vh] sm:min-h-[98vh] flex items-end pt-24 pb-16 sm:pb-24 overflow-hidden bg-[#0f0f15] border-b border-[#F3F2F0]/10"
    >
      {/* Scroll-linked 3D depth backdrop */}
      <motion.div
        style={
          reducedMotion
            ? { transform: 'scale(1.02)', opacity: 0.9 }
            : { y: bgY, scale: bgScale, opacity: bgOpacity }
        }
        className="absolute inset-0 will-change-transform origin-center"
      >
        <ResilientGarmentImage
          src={HERO_EDITORIAL_IMAGE}
          alt="NYKTERIA editorial silhouette in obsidian concrete studio"
          title="NYKTERIA"
          className="w-full h-full object-cover object-center"
        />
      </motion.div>

      {/* Measured contrast scrims */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#0f0f15]/92 via-[#0f0f15]/36 to-[#0f0f15]/10"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#0f0f15]/78 via-[#0f0f15]/26 to-transparent"
      />

      {/* Subtle architectural vignette framing */}
      <div
        aria-hidden="true"
        className="absolute inset-6 sm:inset-10 border border-[#F3F2F0]/[0.09] pointer-events-none"
      />

      <motion.div
        style={reducedMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto w-full max-w-[1360px] px-4 sm:px-8 will-change-transform"
      >
        <div className="max-w-2xl">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: LUXURY_EASE }}
            className="flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-[#A1A1AA] mb-5"
          >
            <span>Phased Release 01</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">{activePieceCount} Ready Pieces</span>
            <span aria-hidden="true">·</span>
            <span>Slow-Forged Darkwear</span>
          </motion.div>

          <motion.h1
            initial={reducedMotion ? false : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.14, ease: LUXURY_EASE }}
            className="font-display text-[clamp(2.35rem,4.8vw,4.15rem)] font-semibold leading-[1.07] tracking-[0.04em] text-[#F3F2F0] [text-wrap:balance]"
          >
            Obsidian Silhouettes, Released One by One
          </motion.h1>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.24, ease: LUXURY_EASE }}
            className="mt-6 text-base sm:text-lg leading-relaxed text-[#D4D4D8] max-w-xl"
          >
            NYKTERIA rejects seasonal excess. Every garment is engineered in small architectural
            batches—heavyweight charcoal cottons, sharp gothic sigils, and unhurried craft built to
            outlast cycles.
          </motion.p>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.34, ease: LUXURY_EASE }}
            className="mt-9 flex flex-wrap items-center gap-6"
          >
            <a
              href="#release-stage"
              onClick={() => triggerHaptic('tap')}
              className="group inline-flex items-center gap-3 px-7 py-3.5 bg-[#F3F2F0] text-[#070709] text-xs font-semibold tracking-[0.14em] uppercase hover:bg-[#E4E2DE] transition-all duration-200 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8]"
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
