import { useState, useEffect, useRef } from 'react';

interface ResilientGarmentImageProps {
  src: string;
  alt: string;
  title: string;
  viewLabel?: string;
  className?: string;
}

export function ResilientGarmentImage({
  src,
  alt,
  title,
  viewLabel,
  className = '',
}: ResilientGarmentImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-[#0c0c10] text-[#F3F2F0] overflow-hidden select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(139, 124, 168, 0.16), rgba(7, 7, 9, 0.96) 72%)',
          }}
        />
        <svg
          viewBox="0 0 180 220"
          className="relative z-10 w-32 h-40 text-[#A1A1AA]/45 mb-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        >
          <path d="M55 44 L75 32 Q90 42 105 32 L125 44 L158 72 L144 102 L128 92 L128 188 L52 188 L52 92 L36 102 L22 72 Z" />
          <path d="M90 66 L90 124 M72 86 L108 86" stroke="#8B7CA8" strokeWidth="1.5" />
          <circle cx="90" cy="86" r="14" stroke="#8B7CA8" strokeOpacity="0.45" />
        </svg>
        <p className="relative z-10 font-display text-xs tracking-[0.22em] uppercase text-[#F3F2F0]/80 px-6 text-center">
          {title}
        </p>
        {viewLabel && (
          <p className="relative z-10 mt-1 text-[11px] tracking-[0.14em] uppercase text-[#A1A1AA]">
            {viewLabel}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0b0b0f] overflow-hidden">
      {/* Dark-themed skeleton loading state while garment image fetches */}
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 nyx-skeleton-surface flex flex-col items-center justify-center p-6"
        >
          <div className="nyx-skeleton-shimmer" />
          <div className="relative z-10 w-20 h-24 border border-[#F3F2F0]/[0.07] flex items-center justify-center mb-3">
            <div className="w-8 h-8 border border-[#8B7CA8]/25 rotate-45" />
          </div>
          <div className="relative z-10 h-2 w-24 bg-[#F3F2F0]/[0.07] mb-2" />
          <div className="relative z-10 h-1.5 w-14 bg-[#8B7CA8]/20" />
        </div>
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        className={`${className} transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        draggable={false}
      />
    </div>
  );
}
