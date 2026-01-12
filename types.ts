export type RelationType = 'CRITIQUES' | 'EXPANDS_UPON' | 'INFLUENCED_BY' | 'OPPOSES' | 'RELATES_TO';

export type PedagogyMode = 'DEBATE' | 'SOCRATIC';

export interface ConceptNode {
  id: string;
  label: string;
  type: 'root' | 'theory' | 'person' | 'concept';
  description: string; // General summary
  keyDefinition: string; // Strict academic definition
  seminalWorks: string[]; // e.g. ["The Protestant Ethic (1905)"]
  academicControversy: string; // Why scholars argue about this
  year: number; // Approximate year of origin
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  mastery: number; // 0-100
  unlocked: boolean;
  associatedTheorist?: string; // e.g., "Karl Marx"
}

export interface ConceptLink {
  source: string | ConceptNode;
  target: string | ConceptNode;
  relation: RelationType;
}

export interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  score?: number; // For AI critique
  critique?: string; // Short feedback
  audioData?: string; // Base64 audio if generated
}

export interface UserStats {
  xp: number;
  level: number;
  debatesWon: number;
  conceptsMastered: number;
}

export enum GameState {
  MAPPING = 'MAPPING',
  DEBATING = 'DEBATING',
  LOADING = 'LOADING',
  TRAINING = 'TRAINING',
}

export interface TheoristProfile {
  name: string;
  avatar: string;
  voiceName: string; // For TTS
  specialty: string;
}

export interface TrainingStep {
  id: string;
  type: 'analysis' | 'construction' | 'refutation';
  instruction: string;
  scenarioText: string;
  completed: boolean;
  userResponse?: string;
  feedback?: string;
  score?: number;
}

export interface TrainingDrill {
  id: string;
  topic: string;
  steps: TrainingStep[];
}

export interface BranchSuggestion {
  label: string;
  description: string;
  type: 'theory' | 'person' | 'concept';
  associatedTheorist: string;
  relation: RelationType; // How it relates to the current debate topic
}

export interface DebateTurnResult {
  reply: string;
  score: number;
  critique: string;
  suggestedNode?: BranchSuggestion;
}