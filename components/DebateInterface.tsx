import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Volume2, User, Play, XCircle, GitBranch, FileText, Download, GraduationCap, Gavel, AlertCircle, Quote, BookOpen } from 'lucide-react';
import { Message, ConceptNode, TheoristProfile, BranchSuggestion, PedagogyMode } from '../types';
import { analyzeDebateTurn, generateTheoristVoice, generateSessionSummary } from '../services/geminiService';

interface DebateInterfaceProps {
  node: ConceptNode;
  onClose: () => void;
  onUpdateScore: (score: number) => void;
  onBranchEvolve: (suggestion: BranchSuggestion) => void;
  isExpanded: boolean;
}

const THEORISTS: Record<string, TheoristProfile> = {
  "Karl Marx": { name: "Karl Marx", avatar: "https://picsum.photos/id/1025/100/100", voiceName: "Fenrir", specialty: "Conflict Theory" },
  "Max Weber": { name: "Max Weber", avatar: "https://picsum.photos/id/1062/100/100", voiceName: "Puck", specialty: "Rationalization" },
  "Emile Durkheim": { name: "Emile Durkheim", avatar: "https://picsum.photos/id/1011/100/100", voiceName: "Charon", specialty: "Functionalism" },
  "Pierre Bourdieu": { name: "Pierre Bourdieu", avatar: "https://picsum.photos/id/1005/100/100", voiceName: "Kore", specialty: "Cultural Capital" },
  "Michel Foucault": { name: "Michel Foucault", avatar: "https://picsum.photos/id/1074/100/100", voiceName: "Zephyr", specialty: "Power/Knowledge" },
  "Default": { name: "The Academic", avatar: "https://picsum.photos/seed/academic/100/100", voiceName: "Puck", specialty: "Sociology" }
};

const DebateInterface: React.FC<DebateInterfaceProps> = ({ node, onClose, onUpdateScore, onBranchEvolve, isExpanded }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<BranchSuggestion | null>(null);
  const [pedagogyMode, setPedagogyMode] = useState<PedagogyMode>('DEBATE');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine Persona
  const theorist = THEORISTS[node.associatedTheorist || "Default"] || THEORISTS["Default"];

  useEffect(() => {
    // Initial greeting
    if (messages.length === 0) {
      const initialMsg: Message = {
        id: 'init',
        role: 'ai',
        content: `I am ${theorist.name}. Let us discuss the implications of ${node.label}. State your position.`,
        timestamp: Date.now()
      };
      setMessages([initialMsg]);
      handleTTS(initialMsg.content, theorist.voiceName);
    }
  }, [node]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, pendingSuggestion]);

  const handleTTS = async (text: string, voice: string) => {
    // Simple cache check could go here, but for now we generate fresh
    const b64 = await generateTheoristVoice(text, voice);
    if (b64) {
      playDecodedAudio(b64);
    }
  };
  
  const playDecodedAudio = async (base64: string) => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Decode raw PCM 24kHz
        const dataInt16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(dataInt16.length);
        for(let i=0; i<dataInt16.length; i++) {
            float32[i] = dataInt16[i] / 32768.0;
        }
        
        const buffer = audioContext.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        
    } catch (e) {
        console.error("Audio playback error", e);
    }
  }

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Call AI with current mode
    const result = await analyzeDebateTurn(
      messages.map(m => ({ role: m.role, content: m.content })),
      userMsg.content,
      theorist.name,
      node.label,
      pedagogyMode
    );

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: result.reply,
      timestamp: Date.now(),
      score: result.score,
      critique: result.critique
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
    onUpdateScore(result.score);
    
    // Store suggestion to show in UI instead of auto-evolving
    if (result.suggestedNode) {
      setPendingSuggestion(result.suggestedNode);
    }
    
    // Play voice
    handleTTS(result.reply, theorist.voiceName);
  };

  const handleDownloadSummary = async () => {
    if (messages.length < 3) return;
    setIsGeneratingSummary(true);
    
    const summary = await generateSessionSummary(messages, node.label);
    
    const element = document.createElement("a");
    const file = new Blob([summary], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${node.label}_study_notes.md`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
    
    setIsGeneratingSummary(false);
  };

  const handleAcceptSuggestion = () => {
    if (pendingSuggestion) {
      onBranchEvolve(pendingSuggestion);
      setPendingSuggestion(null);
    }
  };

  const handleDeclineSuggestion = () => {
    setPendingSuggestion(null);
  };

  /**
   * Parse message content to highlight quotes and citations.
   */
  const renderMessageContent = (text: string) => {
    // Regex splits text by:
    // 1. Double quotes: "..."
    // 2. Parenthetical citations: (Name, Year) or (Name Year) e.g., (Marx, 1867)
    const parts = text.split(/(".*?"|\([A-Za-z\s]+,?\s\d{4}[a-z]?\))/g);
    
    return (
      <span className="inline-block">
        {parts.map((part, index) => {
          // Highlight Quotes
          if (part.startsWith('"') && part.endsWith('"')) {
             return (
               <span key={index} className="inline-flex items-baseline gap-1 bg-indigo-900/40 text-indigo-200 italic px-2 py-0.5 rounded-md border border-indigo-500/30 mx-1 shadow-sm transition-all hover:bg-indigo-900/60">
                 <Quote size={10} className="self-center opacity-70 flex-shrink-0" fill="currentColor" />
                 <span>{part.slice(1, -1)}</span>
                 <Quote size={10} className="self-center opacity-70 flex-shrink-0 transform rotate-180" fill="currentColor" />
               </span>
             );
          }
          // Highlight Citations
          if (part.match(/^\([A-Za-z\s]+,?\s\d{4}[a-z]?\)$/)) {
              return (
               <span key={index} className="inline-flex items-center gap-1 bg-emerald-900/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-500/30 mx-1 align-middle select-none">
                 <BookOpen size={8} />
                 {part}
               </span>
             );
          }
          // Normal Text
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  if (!isExpanded) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
      {/* Prominent Header with Avatar */}
      <div className="relative p-6 bg-slate-800/95 backdrop-blur-md border-b border-slate-700 flex flex-col items-center text-center z-10">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <XCircle size={24} />
        </button>
        
        {/* Dynamic Avatar */}
        <div className="relative mb-3 group cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-75 group-hover:opacity-100 transition duration-200 blur"></div>
            <img 
              src={theorist.avatar} 
              alt={theorist.name} 
              className="relative w-24 h-24 rounded-full border-2 border-slate-900 object-cover shadow-xl" 
            />
        </div>

        <div>
          <h3 className="font-serif text-2xl text-slate-100 font-bold">{theorist.name}</h3>
          
          {/* Mode Toggle */}
          <div className="flex justify-center mt-3 gap-2">
             <button 
               onClick={() => setPedagogyMode('DEBATE')}
               className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border transition-all ${pedagogyMode === 'DEBATE' ? 'bg-red-900/40 border-red-500 text-red-400' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
             >
                <Gavel size={12} /> Debate
             </button>
             <button 
               onClick={() => setPedagogyMode('SOCRATIC')}
               className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border transition-all ${pedagogyMode === 'SOCRATIC' ? 'bg-blue-900/40 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
             >
                <GraduationCap size={12} /> Socratic
             </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-academic-dark" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-4 rounded-xl text-sm leading-relaxed shadow-md ${
              msg.role === 'user' 
                ? 'bg-slate-700 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              {/* Use the new render function for AI messages to highlight quotes */}
              {msg.role === 'ai' ? renderMessageContent(msg.content) : msg.content}
            </div>
            
            {/* Feedback for User Messages */}
            {msg.role === 'ai' && msg.critique && (
               <div className="mt-3 mx-1 p-3 bg-yellow-900/10 border border-yellow-500/20 rounded-lg backdrop-blur-sm animate-fade-in max-w-[85%]">
                 <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                       <AlertCircle size={14} className="text-yellow-500" />
                       <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">Tutor Feedback</span>
                    </div>
                    {pedagogyMode === 'DEBATE' && msg.score !== undefined && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                           msg.score >= 7 
                             ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                             : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                           Score: {msg.score}/10
                        </span>
                    )}
                 </div>
                 <p className="text-xs text-yellow-200/90 italic leading-relaxed pl-1 border-l-2 border-yellow-500/20">
                    "{msg.critique}"
                 </p>
               </div>
            )}
          </div>
        ))}
        {isTyping && (
           <div className="text-slate-500 text-xs italic ml-2">Thinking...</div>
        )}
      </div>

      {/* Suggestion Card */}
      {pendingSuggestion && (
        <div className="mx-4 mb-2 p-4 bg-emerald-900/40 border border-emerald-500/50 rounded-xl animate-slide-up backdrop-blur-sm shadow-lg">
          <div className="flex items-start gap-3">
             <div className="bg-emerald-500/20 p-2 rounded-full mt-1">
                <GitBranch className="w-5 h-5 text-emerald-400" />
             </div>
             <div className="flex-1">
                <h4 className="text-emerald-300 font-bold text-sm">Insight Discovered!</h4>
                <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                   Connection to <span className="text-white font-semibold">"{pendingSuggestion.label}"</span> found.
                </p>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleAcceptSuggestion} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg">Add to Map</button>
                  <button onClick={handleDeclineSuggestion} className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-lg">Dismiss</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700 focus-within:border-blue-500 transition-colors">
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-slate-200 placeholder-slate-500 text-sm"
            placeholder={pedagogyMode === 'DEBATE' ? "Defend your position..." : "Reflect on the question..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        
        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-3">
             <p className="text-[10px] text-slate-500">
               {pedagogyMode === 'DEBATE' ? 'Arguments unlock branches.' : 'Questions deepen understanding.'}
             </p>
             
             {messages.length > 2 && (
               <button 
                 onClick={handleDownloadSummary}
                 disabled={isGeneratingSummary}
                 className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
               >
                 {isGeneratingSummary ? 'Writing...' : <><FileText size={12} /> Study Notes</>}
               </button>
             )}
        </div>
      </div>
    </div>
  );
};

export default DebateInterface;