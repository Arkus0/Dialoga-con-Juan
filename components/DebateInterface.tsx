import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Volume2, User, Play, XCircle } from 'lucide-react';
import { Message, ConceptNode, TheoristProfile } from '../types';
import { analyzeDebateTurn, generateTheoristVoice } from '../services/geminiService';

interface DebateInterfaceProps {
  node: ConceptNode;
  onClose: () => void;
  onUpdateScore: (score: number) => void;
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

const DebateInterface: React.FC<DebateInterfaceProps> = ({ node, onClose, onUpdateScore, isExpanded }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
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
  }, [messages, isTyping]);

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

    // Call AI
    const result = await analyzeDebateTurn(
      messages.map(m => ({ role: m.role, content: m.content })),
      userMsg.content,
      theorist.name,
      node.label
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
    
    // Play voice
    handleTTS(result.reply, theorist.voiceName);
  };

  if (!isExpanded) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
      {/* Prominent Header with Avatar */}
      <div className="relative p-6 bg-slate-800/95 backdrop-blur-md border-b border-slate-700 flex flex-col items-center text-center z-10">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <XCircle size={24} />
        </button>
        
        {/* Dynamic Avatar with Glow Effect */}
        <div className="relative mb-3 group cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-75 group-hover:opacity-100 transition duration-200 blur"></div>
            <img 
              src={theorist.avatar} 
              alt={theorist.name} 
              className="relative w-24 h-24 rounded-full border-2 border-slate-900 object-cover shadow-xl" 
            />
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-800" title="Active"></div>
        </div>

        <div>
          <h3 className="font-serif text-2xl text-slate-100 font-bold">{theorist.name}</h3>
          <p className="text-xs text-blue-400 font-medium uppercase tracking-widest mt-1 px-3 py-1 bg-blue-900/20 rounded-full border border-blue-800/50 inline-block">
            {theorist.specialty}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-academic-dark" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-xl text-sm leading-relaxed shadow-md ${
              msg.role === 'user' 
                ? 'bg-slate-700 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              {msg.content}
            </div>
            
            {/* Feedback for User Messages */}
            {msg.role === 'ai' && msg.critique && (
               <div className="mt-2 text-xs text-accent-gold flex items-center gap-2 animate-fade-in">
                 <span className="font-bold border border-accent-gold/30 px-1 rounded">Score: {msg.score}/10</span>
                 <span className="italic opacity-80">{msg.critique}</span>
               </div>
            )}
          </div>
        ))}
        {isTyping && (
           <div className="text-slate-500 text-xs italic ml-2">Thinking...</div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700 focus-within:border-blue-500 transition-colors">
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-slate-200 placeholder-slate-500 text-sm"
            placeholder="Defend your position..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="text-slate-400 hover:text-white transition-colors">
            <Mic size={18} />
          </button>
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 text-center">
            <p className="text-[10px] text-slate-500">Debating unlocks map branches and boosts mastery.</p>
        </div>
      </div>
    </div>
  );
};

export default DebateInterface;