
import React from 'react';

export const SkeletonHeader = () => (
  <div className="relative w-full">
    {/* Background approximation */}
    <div className="absolute inset-0 h-[500px] bg-gradient-to-b from-white/5 to-transparent opacity-20 pointer-events-none" />
    
    <div className="relative px-10 pb-12 pt-20 flex flex-col md:flex-row gap-10 items-end z-20 max-w-7xl mx-auto">
      <div className="w-64 h-64 md:w-72 md:h-72 bg-white/5 rounded-[2rem] flex-shrink-0 skeleton-bg shadow-2xl" />
      <div className="flex-1 w-full space-y-4 mb-2">
        <div className="h-5 w-24 bg-white/5 rounded-full skeleton-bg" />
        <div className="h-16 w-3/4 bg-white/5 rounded-2xl skeleton-bg" />
        <div className="h-6 w-1/2 bg-white/5 rounded-xl skeleton-bg" />
      </div>
    </div>
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5">
    <div className="w-8 h-8 bg-white/5 rounded-md skeleton-bg" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-48 bg-white/5 rounded skeleton-bg" />
      <div className="h-3 w-24 bg-white/5 rounded skeleton-bg" />
    </div>
    <div className="w-12 h-4 bg-white/5 rounded skeleton-bg" />
  </div>
);

export const DetailSkeleton = () => (
  <div className="min-h-full animate-pulse">
    <SkeletonHeader />
    <div className="px-10 max-w-7xl mx-auto mt-8 space-y-2">
      {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
    </div>
  </div>
);

export const SongDetailSkeleton = () => (
  <div className="min-h-full flex flex-col p-8 pb-10 relative overflow-hidden animate-pulse">
    <div className="relative z-10 w-full max-w-7xl mx-auto mt-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 flex flex-col items-center lg:items-start">
          <div className="w-full max-w-md aspect-square rounded-[2rem] bg-white/5 skeleton-bg mb-8" />
          <div className="w-3/4 h-10 bg-white/5 rounded-xl skeleton-bg mb-4" />
          <div className="w-1/2 h-8 bg-white/5 rounded-xl skeleton-bg mb-8" />
          <div className="grid grid-cols-2 gap-4 w-full bg-white/5 p-6 rounded-3xl border border-white/5">
              {[...Array(4)].map((_,i) => <div key={i} className="h-10 bg-white/5 rounded skeleton-bg" />)}
          </div>
        </div>
        <div className="lg:col-span-7">
           <div className="w-full h-[500px] bg-white/5 rounded-[2.5rem] skeleton-bg" />
        </div>
      </div>
    </div>
  </div>
);
