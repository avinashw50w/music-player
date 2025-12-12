import React from 'react';

const PlayingIndicator: React.FC = () => {
  return (
    <div className="flex items-end gap-[2px] h-4 w-4 justify-center">
      <div className="w-[3px] bg-green-500 rounded-sm equalizer-bar bar-1"></div>
      <div className="w-[3px] bg-green-500 rounded-sm equalizer-bar bar-2"></div>
      <div className="w-[3px] bg-green-500 rounded-sm equalizer-bar bar-3"></div>
    </div>
  );
};

export default PlayingIndicator;