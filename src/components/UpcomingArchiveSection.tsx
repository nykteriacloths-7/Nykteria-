import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { NEXT_RELEASE_UNLOCK_ISO, UPCOMING_ARCHIVE_SLOTS } from '../data/initialProducts';
import { CinematicSectionReveal } from './CinematicSectionReveal';

interface UpcomingArchiveSectionProps {
  activePieceCount: number;
  reducedMotion: boolean;
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  unlocked: boolean;
}

const LUXURY_EASE = [0.19, 1, 0.22, 1] as const;

function computeCountdown(targetMs: number): CountdownParts {
  const diff = Math.max(0, targetMs - Date.now());
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, unlocked: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, unlocked: false };
}

function padTwo(val: number): string {
  return String(val).padStart(2, '0');
}

export function UpcomingArchiveSection({
  activePieceCount,
  reducedMotion,
}: UpcomingArchiveSectionProps) {
  const targetMs = new Date(NEXT_RELEASE_UNLOCK_ISO).getTime();
  const [countdown, setCountdown] = useState<CountdownParts>(() => computeCountdown(targetMs));

  useEffect(() => {
    setCountdown(computeCountdown(targetMs));
    const timer = window.setInterval(() => {
      setCountdown(computeCountdown(targetMs));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetMs]);

  return (
    <section
      id="upcoming-archive"
      className="py-20 sm:py-24 bg-[#0f0f15] border-b border-[#F3F2F0]/12"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <CinematicSectionReveal reducedMotion={reducedMotion}>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-10 border-b border-[#F3F2F0]/10">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#8B7CA8] mb-3">
                Locked Archive
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-[0.04em] text-[#F3F2F0] [text-wrap:balance]">
                Future Releases Unlock One by One
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
              {/* Subtle Next-Unlock Countdown Readout */}
              <div
                aria-label="Countdown to next phased release unlock"
                className="flex flex-col sm:items-end gap-1"
              >
                <span className="text-[11px] tracking-[0.16em] uppercase text-[#A1A1AA]">
                  Piece 03 Unlock Window
                </span>
                {countdown.unlocked ? (
                  <span className="font-mono-num text-xs sm:text-sm tracking-[0.14em] uppercase text-[#A796C9]">
                    Allocation Opening
                  </span>
                ) : (
                  <div className="flex items-baseline gap-2.5 font-mono-num text-sm sm:text-base text-[#F3F2F0]">
                    <span>
                      {padTwo(countdown.days)}
                      <span className="text-[11px] text-[#8B7CA8] ml-0.5">d</span>
                    </span>
                    <span aria-hidden="true" className="text-[#F3F2F0]/25">
                      ·
                    </span>
                    <span>
                      {padTwo(countdown.hours)}
                      <span className="text-[11px] text-[#8B7CA8] ml-0.5">h</span>
                    </span>
                    <span aria-hidden="true" className="text-[#F3F2F0]/25">
                      ·
                    </span>
                    <span>
                      {padTwo(countdown.minutes)}
                      <span className="text-[11px] text-[#8B7CA8] ml-0.5">m</span>
                    </span>
                    <span aria-hidden="true" className="text-[#F3F2F0]/25">
                      ·
                    </span>
                    <span className="text-[#A796C9]">
                      {padTwo(countdown.seconds)}
                      <span className="text-[11px] text-[#8B7CA8] ml-0.5">s</span>
                    </span>
                  </div>
                )}
              </div>

              <p className="font-mono-num text-xs tracking-[0.14em] uppercase text-[#A1A1AA] sm:border-l sm:border-[#F3F2F0]/10 sm:pl-8">
                {activePieceCount} Active · {UPCOMING_ARCHIVE_SLOTS.length} In Development
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {UPCOMING_ARCHIVE_SLOTS.map((slot, index) => {
              const isNextSlot = index === 0;
              return (
                <motion.div
                  key={slot.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.65,
                    delay: reducedMotion ? 0 : index * 0.08,
                    ease: LUXURY_EASE,
                  }}
                  whileHover={
                    reducedMotion
                      ? undefined
                      : { y: -3, transition: { duration: 0.25, ease: LUXURY_EASE } }
                  }
                  className="group relative overflow-hidden border border-[#F3F2F0]/10 hover:border-[#8B7CA8]/40 bg-[#101014]/55 flex flex-col justify-between transition-colors duration-300"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[1px] z-20 bg-gradient-to-r from-transparent via-[#8B7CA8]/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />

                  {/* Dark-themed skeleton image slot while upcoming release assets remain locked */}
                  <div className="relative aspect-[4/3] w-full nyx-skeleton-surface border-b border-[#F3F2F0]/10 flex flex-col items-center justify-center p-6">
                    <div className="nyx-skeleton-shimmer" />
                    <div
                      aria-hidden="true"
                      className="relative z-10 w-24 h-28 border border-[#F3F2F0]/[0.07] flex flex-col items-center justify-center gap-2.5 bg-[#070709]/55"
                    >
                      <Lock className="w-4 h-4 text-[#8B7CA8]/75" />
                      <div className="w-10 h-[1px] bg-[#F3F2F0]/15" />
                      <span className="font-mono-num text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA]/70">
                        {slot.pieceNumber}
                      </span>
                    </div>
                    <div className="relative z-10 mt-4 flex flex-col items-center gap-1.5">
                      <div className="h-1.5 w-20 bg-[#F3F2F0]/[0.07]" />
                      <div className="h-1.5 w-12 bg-[#8B7CA8]/20" />
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                    <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                      <span className="font-mono-num tracking-[0.14em] uppercase">
                        {slot.pieceNumber}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[#8B7CA8]">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{isNextSlot ? 'Next Unlock' : 'Locked'}</span>
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-[#A1A1AA] mb-1.5">{slot.category}</p>
                      <h3 className="font-display text-lg font-medium tracking-[0.03em] text-[#F3F2F0]/85 group-hover:text-[#F3F2F0] transition-colors">
                        {slot.title}
                      </h3>
                    </div>

                    {isNextSlot && !countdown.unlocked ? (
                      <div className="flex items-center justify-between gap-3 text-xs tracking-[0.1em] uppercase text-[#A1A1AA] border-t border-[#F3F2F0]/[0.06] pt-4">
                        <span>Unlocks in</span>
                        <span className="font-mono-num text-[#F3F2F0]/90">
                          {padTwo(countdown.days)}d · {padTwo(countdown.hours)}h ·{' '}
                          {padTwo(countdown.minutes)}m · {padTwo(countdown.seconds)}s
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs tracking-[0.1em] uppercase text-[#A1A1AA] border-t border-[#F3F2F0]/[0.06] pt-4">
                        {slot.targetNote}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CinematicSectionReveal>
      </div>
    </section>
  );
}
