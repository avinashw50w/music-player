
import React, { useState, useEffect, useMemo } from 'react';
import { Song } from '../types';
import { HomeHeroCards } from '../components/HomeHeroCards';
import { RecentlyAddedCarousel } from '../components/RecentlyAddedCarousel';
import { SongListItem } from '../components/SongListItem';

interface HomeProps {
  recentSongs: Song[];
  recentlyAdded: Song[];
  onPlaySong: (song: Song, context?: Song[]) => void;
  currentSongId?: string;
  isPlaying: boolean;
  onToggleFavorite: (id: string) => void;
  onAddToPlaylist: (song: Song) => void;
}

const Home: React.FC<HomeProps> = ({ recentSongs, recentlyAdded, onPlaySong, currentSongId, isPlaying, onToggleFavorite, onAddToPlaylist }) => {
  const [frozenIds, setFrozenIds] = useState<string[]>([]);

  useEffect(() => {
    if (frozenIds.length === 0 && recentSongs.length > 0) {
      setFrozenIds(recentSongs.map(s => s.id));
    }
  }, [recentSongs, frozenIds.length]);

  const displaySongs = useMemo(() => {
    if (frozenIds.length === 0) return recentSongs;
    return frozenIds
      .map(id => recentSongs.find(s => s.id === id))
      .filter((s): s is Song => !!s);
  }, [frozenIds, recentSongs]);

  return (
    <div className="p-10 pb-10">
      <div className="flex items-center justify-between mb-10 animate-fade-in-up">
        <h1 className="text-4xl font-bold text-white tracking-tight">Discover</h1>
      </div>
      
      <HomeHeroCards />

      <div className="flex flex-col gap-10 animate-fade-in-up delay-300">
        <RecentlyAddedCarousel 
          songs={recentlyAdded} 
          currentSongId={currentSongId} 
          isPlaying={isPlaying} 
          onPlaySong={onPlaySong} 
        />

        <div className="flex-1">
          <h2 className="text-3xl font-bold text-white mb-8">Recently Played</h2>
          <div className="flex flex-col space-y-1">
            {displaySongs.length > 0 ? (
                displaySongs.map((song, index) => (
                    <SongListItem
                        key={song.id}
                        song={song}
                        index={index}
                        currentSongId={currentSongId}
                        isPlaying={isPlaying}
                        onPlay={() => onPlaySong(song, displaySongs)}
                        onToggleFavorite={onToggleFavorite}
                        onAddToPlaylist={onAddToPlaylist}
                    />
                ))
            ) : (
                <div className="text-slate-500 py-10 italic">Start listening to songs to see your history here!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
