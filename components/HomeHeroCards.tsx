
import React from 'react';
import { Disc, Music, Mic2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomeHeroCards: React.FC = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Albums',
      subtitle: 'Explore all albums',
      path: '/library/albums',
      gradient: 'from-[#4f46e5] to-[#3b82f6]',
      shadow: 'shadow-indigo-900/20',
      icon: Disc,
      img: 'https://images.unsplash.com/photo-1505672984986-b7c468c7a134?q=80&w=400',
      delay: 'delay-100'
    },
    {
      title: 'Songs',
      subtitle: 'Discover new tracks',
      path: '/library/songs',
      gradient: 'from-[#f59e0b] to-[#fbbf24]',
      shadow: 'shadow-amber-900/20',
      icon: Music,
      img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
      delay: 'delay-200'
    },
    {
      title: 'Artists',
      subtitle: 'Find your favorites',
      path: '/library/artists',
      gradient: 'from-[#f43f5e] to-[#fb7185]',
      shadow: 'shadow-rose-900/20',
      icon: Mic2,
      img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
      delay: 'delay-300'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
      {cards.map((card) => (
        <div 
          key={card.title}
          onClick={() => navigate(card.path)}
          className={`h-64 rounded-[2.5rem] bg-gradient-to-br ${card.gradient} p-8 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02] shadow-xl ${card.shadow} isolate animate-fade-in-up ${card.delay}`}
          style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
        >
          <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
            <div className="bg-white/20 backdrop-blur-md w-fit px-4 py-1.5 rounded-full text-sm font-semibold text-white flex items-center gap-2">
              <card.icon className="w-4 h-4" /> Library
            </div>
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">{card.title}</h2>
              <p className="text-indigo-100 text-base font-medium opacity-80">{card.subtitle}</p>
            </div>
          </div>
          <img 
            src={card.img} 
            className="absolute bottom-0 right-0 w-56 h-64 object-cover object-center opacity-60 mix-blend-overlay group-hover:scale-110 transition-transform duration-500 ease-out" 
            style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}
            alt={card.title} 
          />
        </div>
      ))}
    </div>
  );
};
