import React from 'react';
import { ConceptNode } from '../types';
import { User, Brain, Lock, CheckCircle, ArrowRight } from 'lucide-react';

interface ConceptListProps {
  nodes: ConceptNode[];
  onNodeClick: (node: ConceptNode) => void;
  activeNodeId?: string;
}

const ConceptList: React.FC<ConceptListProps> = ({ nodes, onNodeClick, activeNodeId }) => {
  // Sort nodes: Root first, then by mastery (desc), then alphabetical
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.type === 'root') return -1;
    if (b.type === 'root') return 1;
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return 0;
  });

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-900 p-4 md:p-8 custom-scrollbar">
       <div className="max-w-3xl mx-auto space-y-6 pb-20">
         <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-serif text-white font-bold">Concept Index</h2>
            <span className="text-sm text-slate-400">{nodes.length} concepts discovered</span>
         </div>
         
         <ul className="space-y-3" role="list" aria-label="List of sociology concepts">
           {sortedNodes.map(node => (
             <li key={node.id}>
               <button
                 onClick={() => onNodeClick(node)}
                 disabled={!node.unlocked}
                 aria-current={activeNodeId === node.id ? 'true' : undefined}
                 className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                   node.id === activeNodeId 
                     ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                     : node.unlocked 
                       ? 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750' 
                       : 'bg-slate-800/40 border-slate-800 opacity-60 cursor-not-allowed'
                 }`}
               >
                 <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`mt-1 p-2.5 rounded-lg flex-shrink-0 ${
                       node.type === 'root' ? 'bg-yellow-500/10 text-yellow-500' :
                       node.type === 'person' ? 'bg-rose-500/10 text-rose-500' :
                       'bg-blue-500/10 text-blue-500'
                    }`}>
                       {node.type === 'person' ? <User size={20} /> : <Brain size={20} />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className={`text-lg font-bold truncate ${node.id === activeNodeId ? 'text-blue-300' : 'text-slate-200 group-hover:text-white'}`}>
                            {node.label}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                             {node.mastery === 100 && (
                                <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase tracking-wider bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/50">
                                   <CheckCircle size={12} /> Mastered
                                </span>
                             )}
                             {!node.unlocked && (
                                <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold uppercase tracking-wider bg-red-950/50 px-2 py-0.5 rounded border border-red-900/50">
                                   <Lock size={12} /> Locked
                                </span>
                             )}
                          </div>
                       </div>
                       
                       {/* Use keyDefinition if available for more rigor */}
                       <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 italic">
                         {node.keyDefinition || node.description}
                       </p>
                       
                       {/* Context info */}
                       {node.associatedTheorist && (
                         <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                           <User size={12} /> {node.associatedTheorist}
                         </p>
                       )}
                    </div>
                    
                    {/* Chevron for indication */}
                    {node.unlocked && (
                      <div className="self-center text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all">
                        <ArrowRight size={20} />
                      </div>
                    )}
                 </div>
                 
                 {/* Selection Indicator Bar */}
                 {node.id === activeNodeId && (
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                 )}
               </button>
             </li>
           ))}
         </ul>
       </div>
    </div>
  );
};

export default ConceptList;