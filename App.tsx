import React, { useState, useEffect } from 'react';
import MindMap from './components/MindMap';
import ConceptList from './components/ConceptList'; // Import the new component
import DebateInterface from './components/DebateInterface';
import TrainingInterface from './components/TrainingInterface';
import Dashboard from './components/Dashboard';
import { ConceptNode, ConceptLink, UserStats, TrainingDrill, BranchSuggestion } from './types';
import { expandConcept, createTrainingDrill } from './services/geminiService';
import { Brain, Sparkles, Loader2, GitBranch, LayoutGrid, List, BookOpen, Quote } from 'lucide-react'; // Import icons

const INITIAL_NODE: ConceptNode = {
  id: 'root',
  label: 'Sociology',
  type: 'root',
  description: 'The systematic study of society and social interaction.',
  keyDefinition: 'Sociology is the scientific study of social behavior, its origins, development, organization, and institutions.',
  seminalWorks: ['The Rules of Sociological Method (Durkheim, 1895)', 'Economy and Society (Weber, 1922)'],
  academicControversy: 'The tension between structure (social forces) and agency (individual action).',
  year: 1838, // Auguste Comte coined the term
  mastery: 100,
  unlocked: true,
  x: 0,
  y: 0
};

const INITIAL_STATS: UserStats = {
  xp: 150,
  level: 1,
  debatesWon: 0,
  conceptsMastered: 1
};

export default function App() {
  const [nodes, setNodes] = useState<ConceptNode[]>([INITIAL_NODE]);
  const [links, setLinks] = useState<ConceptLink[]>([]);
  const [activeNode, setActiveNode] = useState<ConceptNode | null>(null);
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  // View State
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Training Mode State
  const [activeDrill, setActiveDrill] = useState<TrainingDrill | null>(null);
  const [isDrillLoading, setIsDrillLoading] = useState(false);

  // Handle clicking a node -> Open Debate or Details
  const handleNodeClick = (node: ConceptNode) => {
    setActiveNode(node);
  };

  // Handle expanding the map manually
  const handleExpandMap = async () => {
    if (!activeNode) return;
    
    setIsLoading(true);
    setNotification(`Consulting the archives about ${activeNode.label}...`);
    
    const existingIds = nodes.map(n => n.id);
    const { nodes: newNodes, links: newLinks } = await expandConcept(activeNode.label, existingIds);
    
    if (newNodes.length > 0) {
      // Connect new nodes to the active node
      const directLinks = newLinks; 
      // Note: The service now generates specific links, but if they are floating, connect them to active
      // For now, assume service links are sufficient or append a fallback logic if needed
      
      // If service returns links that don't connect to current ID, manual fix:
      const connectedLinks = newLinks.length > 0 ? newLinks : newNodes.map(n => ({
         source: activeNode.id,
         target: n.id,
         relation: 'RELATES_TO' // Fallback
      } as ConceptLink));

      setNodes(prev => [...prev, ...newNodes]);
      setLinks(prev => [...prev, ...connectedLinks]);
      setNotification(`Discovered ${newNodes.length} new concepts!`);
      
      // Award XP for exploration
      setStats(prev => ({ ...prev, xp: prev.xp + 20 }));
    } else {
      setNotification("The archives are silent on this specific path.");
    }
    
    setIsLoading(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateScore = (score: number) => {
    // Logic: If score > 7, consider it a "win" or "good argument"
    if (score >= 7) {
      setStats(prev => ({
        ...prev,
        xp: prev.xp + (score * 5),
        debatesWon: prev.debatesWon + 1
      }));
      
      if (activeNode && activeNode.mastery < 100) {
        setNodes(prev => prev.map(n => 
          n.id === activeNode.id ? { ...n, mastery: Math.min(100, n.mastery + 25) } : n
        ));
      }
    } else {
       setStats(prev => ({
        ...prev,
        xp: prev.xp + 5 // Small XP for participating
      }));
    }
  };

  // Handle evolutionary debate branching
  const handleBranchEvolution = (suggestion: BranchSuggestion) => {
    if (!activeNode) return;
    
    const newId = `evolved-${Date.now()}`;
    // Evolved nodes need empty defaults for new strict fields until expanded
    const newNode: ConceptNode = {
      id: newId,
      label: suggestion.label,
      type: suggestion.type,
      description: suggestion.description,
      keyDefinition: suggestion.description, // Fallback
      seminalWorks: [], // To be populated later
      academicControversy: "Newly discovered connection.",
      year: activeNode.year || 2000, // Inherit approximation until expanded
      associatedTheorist: suggestion.associatedTheorist,
      mastery: 0,
      unlocked: true,
      // Random offset from parent for visual placement near parent
      x: activeNode.x ? activeNode.x + 50 : 0, 
      y: activeNode.y ? activeNode.y + 50 : 0
    };

    const newLink: ConceptLink = {
      source: activeNode.id,
      target: newId,
      relation: suggestion.relation
    };

    setNodes(prev => [...prev, newNode]);
    setLinks(prev => [...prev, newLink]);
    
    setNotification(`Debate Evolved: "${suggestion.label}" added to map!`);
    setStats(prev => ({ ...prev, xp: prev.xp + 50 })); // Bonus XP for creating new knowledge
    setTimeout(() => setNotification(null), 4000);
  };

  const handleStartTraining = async () => {
    // Pick topic from active node or random
    const topic = activeNode ? activeNode.label : "Sociology Basics";
    
    setIsDrillLoading(true);
    setNotification("Coach is preparing your drill...");
    
    const drill = await createTrainingDrill(topic);
    
    if (drill) {
      setActiveDrill(drill);
    } else {
      setNotification("Coach is unavailable right now. Try again.");
    }
    setIsDrillLoading(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCompleteDrill = (avgScore: number) => {
    setStats(prev => ({
      ...prev,
      xp: prev.xp + (avgScore * 10)
    }));
    setActiveDrill(null);
    setNotification(`Drill complete! +${avgScore * 10} XP`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-200 font-sans overflow-hidden selection:bg-blue-500/30">
      <Dashboard stats={stats} onOpenTraining={handleStartTraining} />
      
      <div className="flex-1 relative flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 relative h-full flex flex-col">
          
          {/* View Toggle Switch */}
          <div className="absolute top-4 right-4 z-20 bg-slate-800 rounded-lg p-1 border border-slate-700 flex gap-1 shadow-xl">
             <button 
               onClick={() => setViewMode('map')}
               className={`p-2 rounded-md transition-all ${viewMode === 'map' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
               title="Map View"
               aria-label="Switch to Map View"
             >
               <LayoutGrid size={18} />
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
               title="List View"
               aria-label="Switch to List View"
             >
               <List size={18} />
             </button>
          </div>

          {/* View Content */}
          <div className="flex-1 relative overflow-hidden">
            {viewMode === 'map' ? (
              <MindMap 
                nodes={nodes} 
                links={links} 
                onNodeClick={handleNodeClick} 
                onNodeExpand={() => {}} 
              />
            ) : (
              <ConceptList 
                nodes={nodes} 
                onNodeClick={handleNodeClick}
                activeNodeId={activeNode?.id}
              />
            )}
          </div>
          
          {/* Node Context Overlay (Common for both views) */}
          {activeNode && !activeNode.unlocked && (
             <div className="absolute bottom-8 left-8 p-4 bg-red-900/80 border border-red-500 rounded-lg max-w-sm backdrop-blur z-20 shadow-lg">
                <p className="text-red-200 text-sm flex items-center gap-2">
                   <span className="font-bold">Locked:</span> Master connecting concepts first.
                </p>
             </div>
          )}
          
          {/* Active Node Detail Card */}
          {activeNode && (
            <div className="absolute top-6 left-6 max-w-sm animate-slide-in z-20">
              <div className="bg-slate-800/95 border border-slate-600 p-5 rounded-xl shadow-2xl backdrop-blur-md max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-serif font-bold text-white leading-tight">{activeNode.label}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${activeNode.mastery === 100 ? 'border-emerald-500 text-emerald-400' : 'border-slate-500 text-slate-400'} whitespace-nowrap ml-2`}>
                        {activeNode.mastery}%
                    </span>
                </div>
                
                {/* Academic Fields */}
                <div className="space-y-4 mb-4">
                    {/* Definition */}
                    <div className="bg-slate-900/50 p-3 rounded-lg border-l-2 border-blue-500">
                        <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Definition</p>
                        <p className="text-sm text-slate-200 italic leading-relaxed">
                            "{activeNode.keyDefinition || activeNode.description}"
                        </p>
                    </div>

                    {/* Seminal Works */}
                    {activeNode.seminalWorks && activeNode.seminalWorks.length > 0 && (
                        <div>
                            <p className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                                <BookOpen size={12} /> Seminal Works
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                                {activeNode.seminalWorks.map((work, idx) => (
                                    <li key={idx} className="text-xs text-slate-300">{work}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Controversy */}
                    {activeNode.academicControversy && (
                         <div>
                            <p className="flex items-center gap-2 text-xs text-rose-400 font-bold uppercase tracking-wider mb-1">
                                <Quote size={12} /> Controversy
                            </p>
                            <p className="text-xs text-slate-400 leading-relaxed">{activeNode.academicControversy}</p>
                        </div>
                    )}

                    {/* Year */}
                    <div className="text-xs text-slate-500 text-right italic">
                        Circa {activeNode.year}
                    </div>
                </div>
                
                <div className="flex gap-2 pt-2 border-t border-slate-700">
                  <button 
                    onClick={handleExpandMap}
                    disabled={isLoading || isDrillLoading}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-slate-600"
                  >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <Brain className="w-4 h-4" />}
                    Expand
                  </button>
                  <button 
                    onClick={() => { /* Handled by DebateInterface visibility */ }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 px-3 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Seminar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {notification && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-blue-300 px-4 py-2 rounded-full shadow-lg border border-blue-900/50 flex items-center gap-2 text-sm z-50 animate-fade-in">
               {isDrillLoading ? <Loader2 className="animate-spin w-4 h-4" /> : notification.includes("Evolved") ? <GitBranch className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4 text-blue-400" />}
               {notification}
            </div>
          )}
        </div>

        {/* Debate Panel (Right Side) */}
        {activeNode && !activeDrill && (
          <DebateInterface 
            node={activeNode} 
            isExpanded={!!activeNode} 
            onClose={() => setActiveNode(null)}
            onUpdateScore={handleUpdateScore}
            onBranchEvolve={handleBranchEvolution}
          />
        )}
        
        {/* Training Mode Overlay */}
        {activeDrill && (
          <TrainingInterface 
            drill={activeDrill}
            onClose={() => setActiveDrill(null)}
            onComplete={handleCompleteDrill}
          />
        )}
      </div>
    </div>
  );
}