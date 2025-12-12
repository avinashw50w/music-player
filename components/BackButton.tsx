import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-3 text-slate-400 hover:text-white transition-colors hover:bg-white/10 rounded-full backdrop-blur-md"
  >
    <ArrowLeft className="w-6 h-6" />
  </button>
);