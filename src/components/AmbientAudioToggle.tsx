import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { DarkAmbientEngine } from '../audio/darkAmbientAudio';
import { triggerHaptic } from '../utils/haptics';

interface AmbientAudioToggleProps {
  reducedMotion: boolean;
}

export function AmbientAudioToggle({ reducedMotion }: AmbientAudioToggleProps) {
  const engineRef = useRef<DarkAmbientEngine | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    engineRef.current = new DarkAmbientEngine();
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleToggle = () => {
    if (!engineRef.current) return;
    triggerHaptic('tap');
    if (playing) {
      engineRef.current.stop();
      setPlaying(false);
    } else {
      const started = engineRef.current.start();
      setPlaying(started);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 sm:bottom-7 sm:left-7 z-40">
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={playing}
        aria-label={playing ? 'Mute dark ambient soundscape' : 'Play dark ambient soundscape'}
        className={`group inline-flex items-center gap-2.5 px-3.5 py-2 border text-xs tracking-[0.12em] uppercase transition-colors duration-200 min-h-[40px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CA8] ${
          playing
            ? 'border-[#8B7CA8]/65 bg-[#101014]/95 text-[#F3F2F0] shadow-[0_12px_32px_rgba(0,0,0,0.6)]'
            : 'border-[#F3F2F0]/15 bg-[#0b0b0f]/92 text-[#A1A1AA] hover:text-[#F3F2F0] hover:border-[#F3F2F0]/30'
        }`}
      >
        {playing ? (
          <Volume2 className="w-3.5 h-3.5 text-[#A796C9] shrink-0" />
        ) : (
          <VolumeX className="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-[#F3F2F0] shrink-0" />
        )}

        <span className="whitespace-nowrap">
          {playing ? 'Ambient · On' : 'Ambient · Off'}
        </span>

        {/* Minimalist equalizer indicator */}
        <span aria-hidden="true" className="inline-flex items-end gap-[2px] h-3 ml-0.5">
          <span
            className={`w-[2px] transition-all duration-300 ${
              playing
                ? reducedMotion
                  ? 'h-2 bg-[#A796C9]'
                  : 'h-2.5 bg-[#A796C9] nyx-eq-bar-1'
                : 'h-1 bg-[#52525B]'
            }`}
          />
          <span
            className={`w-[2px] transition-all duration-300 ${
              playing
                ? reducedMotion
                  ? 'h-3 bg-[#A796C9]'
                  : 'h-3 bg-[#F3F2F0] nyx-eq-bar-2'
                : 'h-1.5 bg-[#52525B]'
            }`}
          />
          <span
            className={`w-[2px] transition-all duration-300 ${
              playing
                ? reducedMotion
                  ? 'h-1.5 bg-[#A796C9]'
                  : 'h-2 bg-[#8B7CA8] nyx-eq-bar-3'
                : 'h-1 bg-[#52525B]'
            }`}
          />
        </span>
      </button>
    </div>
  );
}
