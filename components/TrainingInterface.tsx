import React, { useState } from 'react';
import { TrainingDrill, TrainingStep } from '../types';
import { evaluateDrillResponse } from '../services/geminiService';
import { Send, CheckCircle, XCircle, ArrowRight, Dumbbell, Loader2 } from 'lucide-react';

interface TrainingInterfaceProps {
  drill: TrainingDrill;
  onClose: () => void;
  onComplete: (score: number) => void;
}

const TrainingInterface: React.FC<TrainingInterfaceProps> = ({ drill, onClose, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [input, setInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentStep, setCurrentStep] = useState<TrainingStep>(drill.steps[0]);
  const [steps, setSteps] = useState<TrainingStep[]>(drill.steps);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    setIsEvaluating(true);
    const result = await evaluateDrillResponse(currentStep, input, drill.topic);
    
    const updatedStep = {
      ...currentStep,
      completed: result.passed,
      userResponse: input,
      feedback: result.feedback,
      score: result.score
    };

    const newSteps = [...steps];
    newSteps[currentStepIndex] = updatedStep;
    setSteps(newSteps);
    setCurrentStep(updatedStep);
    setIsEvaluating(false);
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setCurrentStep(steps[nextIndex]);
      setInput('');
    } else {
      // Calculate total average score
      const totalScore = steps.reduce((acc, s) => acc + (s.score || 0), 0);
      onComplete(Math.round(totalScore / steps.length));
    }
  };

  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/20 p-3 rounded-full border border-blue-500/30">
              <Dumbbell className="text-blue-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-100">Debate Dojo: {drill.topic}</h2>
              <div className="flex gap-2 mt-1">
                {steps.map((s, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 w-8 rounded-full transition-colors ${
                      i < currentStepIndex ? 'bg-emerald-500' : 
                      i === currentStepIndex ? 'bg-blue-500' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8">
          
          {/* Scenario Card */}
          <div className="bg-slate-700/50 p-6 rounded-xl border border-slate-600 relative">
            <span className="absolute -top-3 left-4 bg-slate-600 text-slate-300 text-xs px-2 py-1 rounded border border-slate-500 uppercase tracking-wider font-bold">
              {currentStep.type} Phase
            </span>
            <p className="text-lg text-slate-200 font-serif leading-relaxed italic">
              "{currentStep.scenarioText}"
            </p>
          </div>

          {/* Instruction */}
          <div className="space-y-4">
             <div className="flex items-start gap-3 text-blue-300">
               <div className="bg-blue-900/50 p-1.5 rounded-full mt-0.5">
                 <ArrowRight className="w-4 h-4" />
               </div>
               <p className="text-lg font-medium">{currentStep.instruction}</p>
             </div>

             {/* Input Area */}
             {!currentStep.completed ? (
               <div className="space-y-4">
                 <textarea 
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-500 focus:border-blue-500 outline-none resize-none h-32 transition-all"
                   placeholder="Type your response here..."
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   disabled={isEvaluating}
                 />
                 <div className="flex justify-end">
                   <button 
                     onClick={handleSubmit}
                     disabled={!input.trim() || isEvaluating}
                     className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                   >
                     {isEvaluating ? <Loader2 className="animate-spin w-4 h-4"/> : <Send className="w-4 h-4"/>}
                     Submit Argument
                   </button>
                 </div>
               </div>
             ) : (
               /* Feedback Area */
               <div className={`p-6 rounded-xl border ${currentStep.score && currentStep.score >= 6 ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30'} animate-fade-in`}>
                 <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-bold ${currentStep.score && currentStep.score >= 6 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {currentStep.score && currentStep.score >= 6 ? 'Well Done!' : 'Needs Improvement'}
                    </h3>
                    <span className="text-sm font-mono opacity-70">Score: {currentStep.score}/10</span>
                 </div>
                 <p className="text-slate-300 text-sm mb-4">{currentStep.feedback}</p>
                 <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Your Answer:</p>
                    <p className="text-slate-300 italic text-sm">"{currentStep.userResponse}"</p>
                 </div>
                 
                 <div className="mt-6 flex justify-end">
                   {currentStep.score && currentStep.score >= 6 ? (
                      <button 
                        onClick={handleNext}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                      >
                        {isLastStep ? 'Complete Drill' : 'Next Step'} <ArrowRight className="w-4 h-4"/>
                      </button>
                   ) : (
                      <button 
                         onClick={() => {
                           // Reset step state for retry
                           const resetStep = { ...currentStep, completed: false, userResponse: undefined, feedback: undefined, score: undefined };
                           setCurrentStep(resetStep);
                           setInput(currentStep.userResponse || ''); // Keep text for edit
                           // We don't update 'steps' array yet, effectively allowing retry locally
                         }}
                         className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Try Again
                      </button>
                   )}
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingInterface;