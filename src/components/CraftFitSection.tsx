import { useState } from 'react';
import { motion } from 'motion/react';
import { CinematicSectionReveal } from './CinematicSectionReveal';

interface CraftFitSectionProps {
  reducedMotion: boolean;
}

type MeasurementMode = 'hoodie' | 'tee';
const LUXURY_EASE = [0.19, 1, 0.22, 1] as const;

const MEASUREMENTS: Record<
  MeasurementMode,
  Array<{ size: string; chest: string; length: string; shoulder: string }>
> = {
  hoodie: [
    { size: 'S', chest: '46 in / 117 cm', length: '26.5 in / 67 cm', shoulder: '23.0 in / 58 cm' },
    { size: 'M', chest: '48 in / 122 cm', length: '27.5 in / 70 cm', shoulder: '24.0 in / 61 cm' },
    { size: 'L', chest: '50 in / 127 cm', length: '28.5 in / 72 cm', shoulder: '25.0 in / 64 cm' },
    { size: 'XL', chest: '52 in / 132 cm', length: '29.5 in / 75 cm', shoulder: '26.0 in / 66 cm' },
  ],
  tee: [
    { size: 'S', chest: '44 in / 112 cm', length: '27.5 in / 70 cm', shoulder: '21.5 in / 55 cm' },
    { size: 'M', chest: '46 in / 117 cm', length: '28.5 in / 72 cm', shoulder: '22.5 in / 57 cm' },
    { size: 'L', chest: '48 in / 122 cm', length: '29.5 in / 75 cm', shoulder: '23.5 in / 60 cm' },
    { size: 'XL', chest: '50 in / 127 cm', length: '30.5 in / 77 cm', shoulder: '24.5 in / 62 cm' },
  ],
};

export function CraftFitSection({ reducedMotion }: CraftFitSectionProps) {
  const [mode, setMode] = useState<MeasurementMode>('hoodie');

  return (
    <section
      id="craft-fit"
      className="py-20 sm:py-28 bg-[#13131c] border-b border-[#F3F2F0]/12"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <CinematicSectionReveal reducedMotion={reducedMotion}>
          <div className="max-w-2xl pb-12">
            <p className="text-xs tracking-[0.2em] uppercase text-[#8B7CA8] mb-3">
              Craft, Fit & Phased Philosophy
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-[0.04em] text-[#F3F2F0] [text-wrap:balance]">
              Built Slowly for Structure & Longevity
            </h2>
          </div>

          {/* 3-Column Editorial Principles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-[#F3F2F0]/10 pt-10">
            <div>
              <span className="font-mono-num text-xs text-[#8B7CA8]">01.</span>
              <h3 className="mt-2 text-lg font-semibold text-[#F3F2F0]">
                Architectural Oversized Fit
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">
                Patterned from scratch with dropped shoulder seams, wide chest volume, and firm
                ribbed cuffs so the garment holds a clean sculptural drape without collapsing.
              </p>
            </div>

            <div>
              <span className="font-mono-num text-xs text-[#8B7CA8]">02.</span>
              <h3 className="mt-2 text-lg font-semibold text-[#F3F2F0]">
                Archival Ink & Wash Care
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">
                Enzyme charcoal washes soften the cotton hand while keeping sigil and fallen-wing
                prints crisp. Wash cold inside out and hang in shade to preserve pigment depth.
              </p>
            </div>

            <div>
              <span className="font-mono-num text-xs text-[#8B7CA8]">03.</span>
              <h3 className="mt-2 text-lg font-semibold text-[#F3F2F0]">
                One-by-One Phased Drops
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">
                Instead of dumping twenty disposable items at once, NYKTERIA unlocks pieces
                individually once sampling, fabric GSM, and print tolerances are finalized.
              </p>
            </div>
          </div>

          {/* Interactive Garment Dimension Matrix */}
          <div className="mt-16 border border-[#F3F2F0]/10 bg-[#101014] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F3F2F0]/10">
              <div>
                <h3 className="text-base font-semibold text-[#F3F2F0]">
                  Garment Measurement Matrix
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  True boxy oversized cuts. Choose your regular size for intended drape.
                </p>
              </div>

              <div
                role="group"
                aria-label="Measurement silhouette"
                className="inline-flex border border-[#F3F2F0]/15 bg-[#070709] p-1 self-start"
              >
                {(
                  [
                    { id: 'hoodie', label: '480 GSM Hoodie' },
                    { id: 'tee', label: '280 GSM Tee' },
                  ] as const
                ).map((item) => {
                  const active = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      className={`relative px-4 py-2 text-xs font-medium tracking-[0.08em] uppercase transition-colors whitespace-nowrap cursor-pointer ${
                        active ? 'text-[#070709]' : 'text-[#A1A1AA] hover:text-[#F3F2F0]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="nyx-matrix-toggle"
                          transition={{ duration: 0.28, ease: LUXURY_EASE }}
                          className="absolute inset-0 bg-[#F3F2F0]"
                        />
                      )}
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#F3F2F0]/10 text-xs uppercase tracking-[0.12em] text-[#A1A1AA]">
                    <th className="py-3 pr-6 font-medium">Size</th>
                    <th className="py-3 pr-6 font-medium">Chest (Full)</th>
                    <th className="py-3 pr-6 font-medium">Body Length</th>
                    <th className="py-3 font-medium">Shoulder Drop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F2F0]/[0.06] text-sm font-mono-num">
                  {MEASUREMENTS[mode].map((row) => (
                    <tr
                      key={`${mode}-${row.size}`}
                      className="text-[#F3F2F0] hover:bg-[#F3F2F0]/[0.02] transition-colors"
                    >
                      <td className="py-3.5 pr-6 font-semibold text-[#A796C9]">{row.size}</td>
                      <td className="py-3.5 pr-6">{row.chest}</td>
                      <td className="py-3.5 pr-6">{row.length}</td>
                      <td className="py-3.5">{row.shoulder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CinematicSectionReveal>
      </div>
    </section>
  );
}
