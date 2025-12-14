export type Category = 'struggles' | 'development' | 'mindset';

export interface MemoryValue {
  description: string;
  details: string[]; // Maps to 'examples' or 'milestones' from python script
}

export interface MemoryItem {
  id: string;
  timestamp: string;
  value: MemoryValue;
}

export interface MemoryStore {
  struggles: MemoryItem[];
  development: MemoryItem[];
  mindset: MemoryItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
