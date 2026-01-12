import React from 'react';
import { UserStats } from '../types';
import { Trophy, Flame, BookOpen, Dumbbell } from 'lucide-react';

interface DashboardProps {
  stats: UserStats;
  onOpenTraining: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, onOpenTraining }) => {
  const progress = (stats.xp % 1000) / 10; // Simple level progress

  return (
    <div className="bg-slate-800 border-b border-slate-700 p-4 flex flex-wrap gap-6 items-center justify-between text-slate-200">
      <div className="flex items-center gap-4">
        <div className="bg-slate-700 p-2 rounded-lg border border-slate-600">
            <h1 className="font-serif text-xl font-bold tracking-tight text-white">Socio<span className="text-blue-500">Mind</span></h1>
        </div>
        <button 
          onClick={onOpenTraining}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-emerald-400 border border-slate-600 hover:border-emerald-500/50 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        >
           <Dumbbell className="w-4 h-4" />
           Debate Dojo
        </button>
      </div>

      <div className="flex items-center gap-6 text-sm">
        {/* Level */}
        <div className="flex flex-col min-w-[120px]">
          <div className="flex justify-between mb-1">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Level {stats.level}</span>
            <span className="text-xs text-blue-400">{stats.xp} XP</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {/* Stats items */}
        <div className="flex items-center gap-2" title="Debates Won">
          <Trophy className="text-yellow-500 w-4 h-4" />
          <span className="font-bold">{stats.debatesWon}</span>
        </div>
        
        <div className="flex items-center gap-2" title="Current Streak">
          <Flame className="text-orange-500 w-4 h-4" />
          <span className="font-bold">3 Days</span>
        </div>

        <div className="flex items-center gap-2" title="Concepts Mastered">
          <BookOpen className="text-emerald-500 w-4 h-4" />
          <span className="font-bold">{stats.conceptsMastered}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;