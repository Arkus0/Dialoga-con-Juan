import React, { useState, useEffect } from 'react';
import MindMap from './components/MindMap';
import DebateInterface from './components/DebateInterface';
import TrainingInterface from './components/TrainingInterface';
import Dashboard from './components/Dashboard';
import { ConceptNode, ConceptLink, UserStats, TrainingDrill } from './types';
import { expandConcept, createTrainingDrill } from './services/geminiService';
import { Brain, Sparkles, Loader2 } from 'lucide-react';

const INITIAL_NODE: ConceptNode = {
  id: 'root',
  label: 'Sociology',
  type: 'root',
  description: 'The study of the development, structure, and functioning of human society.',
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
  
  // Training Mode State
  const [activeDrill, setActiveDrill] = useState<TrainingDrill | null>(null);
  const [isDrillLoading, setIsDrillLoading] = useState(false);

  // Handle clicking a node -> Open Debate or Details
  const handleNodeClick = (node: ConceptNode) => {
    setActiveNode(node);
  };

  // Handle expanding the map
  const handleExpandMap = async () => {
    if (!activeNode) return;
    
    setIsLoading(true);
    setNotification(`Consulting the archives about ${activeNode.label}...`);
    
    const existingIds = nodes.map(n => n.id);
    const { nodes: newNodes, links: newLinks } = await expandConcept(activeNode.label, existingIds);
    
    if (newNodes.length > 0) {
      // Connect new nodes to the active node
      const connectedLinks = newLinks.map(l => ({
        source: activeNode.id, // Ensure we link back to origin for visual continuity primarily
        target: l.target === activeNode.id ? l.source : l.target, // Fallback logic
        relation: l.relation
      }));
      
      // Actually, Gemini service returns links. We should use them but ensure they connect to our graph.
      // For simplicity in this demo, we force links from Active Node -> New Nodes
      const directLinks = newNodes.map(n => ({
        source: activeNode.id,
        target: n.id,
        relation: "relates to"
      }));

      setNodes(prev => [...prev, ...newNodes]);
      setLinks(prev => [...prev, ...directLinks]);
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
      
      <div className="flex-1 relative flex">
        {/* Main Map Area */}
        <div className="flex-1 relative">
          <MindMap 
            nodes={nodes} 
            links={links} 
            onNodeClick={handleNodeClick} 
            onNodeExpand={() => {}} 
          />
          
          {/* Node Context Overlay (Floating Bottom Left) */}
          {activeNode && !activeNode.unlocked && (
             <div className="absolute bottom-8 left-8 p-4 bg-red-900/80 border border-red-500 rounded-lg max-w-sm backdrop-blur">
                <p className="text-red-200">This concept is locked. Master previous nodes to unlock.</p>
             </div>
          )}
          
          {activeNode && (
            <div className="absolute top-6 left-6 max-w-xs animate-slide-in">
              <div className="bg-slate-800/90 border border-slate-600 p-5 rounded-xl shadow-2xl backdrop-blur-md">
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-serif font-bold text-white">{activeNode.label}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${activeNode.mastery === 100 ? 'border-emerald-500 text-emerald-400' : 'border-slate-500 text-slate-400'}`}>
                        {activeNode.mastery}% Mastery
                    </span>
                </div>
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">{activeNode.description}</p>
                
                <div className="flex gap-2">
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
                    Debate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {notification && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-blue-300 px-4 py-2 rounded-full shadow-lg border border-blue-900/50 flex items-center gap-2 text-sm z-50">
               {isDrillLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4 text-blue-400" />}
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