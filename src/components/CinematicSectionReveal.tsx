import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface CinematicSectionRevealProps {
  children: ReactNode;
  reducedMotion: boolean;
  className?: string;
  delay?: number;
}

export function CinematicSectionReveal({
  children,
  reducedMotion,
  className = '',
  delay = 0,
}: CinematicSectionRevealProps) {
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, rotateX: 3 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: 0.85,
        delay,
        ease: [0.19, 1, 0.22, 1],
      }}
      style={{ transformPerspective: 1200 }}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}
