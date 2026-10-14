import React from 'react';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Deep Obsidian Canvas */}
      <div className="absolute inset-0 bg-[#0f0606]" />

      {/* Ray Beam 1: Sweeping diagonally from top-left */}
      <div className="ray-beam-1 absolute -top-[30%] -left-[20%] w-[150vw] h-[150vh] pointer-events-none" />

      {/* Ray Beam 2: Counter beam piercing from top-right */}
      <div className="ray-beam-2 absolute -top-[20%] right-[-30%] w-[140vw] h-[140vh] pointer-events-none" />

      {/* Diagonal Dynamic Scan Streak */}
      <div className="pulse-light-streak absolute inset-0 pointer-events-none" />

      {/* Ambient Radial Corner Glows */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#650000]/25 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-[#e11d48]/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Fine Digital Cyber Grid */}
      <div className="cyber-grid absolute inset-0 pointer-events-none" />
    </div>
  );
};
