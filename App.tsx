import React, { useState, useEffect, useRef } from 'react';
import { MemoryStore, Category, MemoryItem, ChatMessage } from './types';
import { 
  Brain, Sprout, ShieldAlert, Plus, BookOpen, Send, Sparkles, 
  ArrowLeft, Settings, Moon, Sun, Phone, MessageSquare, Mic, Check,
  Search, X, Wifi, Battery
} from './components/Icons';
import MemoryEntryModal from './components/MemoryEntryModal';
import MemoryCard from './components/MemoryCard';
import { sendMessageToLucy, resetChatSession } from './services/geminiService';

// --- Types & Constants ---
type AppId = 'home' | 'journal' | 'chat' | 'settings' | 'phone' | 'messages' | 'live';
type Theme = 'light' | 'dark';

// Default Data
const DEFAULT_MEMORY: MemoryStore = {
  struggles: [],
  development: [],
  mindset: []
};

// --- Helper Components ---

const StatusBar = ({ theme }: { theme: Theme }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000); // Update every minute is enough
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`w-full flex justify-between items-center px-6 py-2 text-xs font-medium select-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
       <span>{timeString}</span>
       <div className="flex items-center gap-2">
         <Wifi className="w-4 h-4" />
         <div className="flex items-center gap-1">
            <span>100%</span>
            <Battery className="w-4 h-4" />
         </div>
       </div>
    </div>
  );
};

const Clock = ({ theme }: { theme: Theme }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const dateString = time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col items-center justify-center py-10 md:py-16 animate-fade-in select-none">
      <h1 className={`text-7xl md:text-9xl font-light tracking-tighter drop-shadow-sm transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{hours}:{minutes}</h1>
      <p className={`font-medium text-lg md:text-xl mt-2 tracking-wide transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{dateString}</p>
    </div>
  );
};

const AppIcon = ({ 
  icon: Icon, 
  label, 
  colorClass, 
  onClick, 
  theme 
}: { 
  icon: any, 
  label: string, 
  colorClass: string, 
  onClick: () => void,
  theme: Theme 
}) => (
  <div className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-transform duration-200 group" onClick={onClick}>
    <div className={`w-[68px] h-[68px] rounded-[24px] flex items-center justify-center shadow-md ${colorClass} ${theme === 'dark' ? 'shadow-black/20' : 'shadow-slate-200'}`}>
      <Icon className="w-8 h-8 text-white" />
    </div>
    <span className={`text-xs font-medium tracking-tight transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{label}</span>
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  // System State
  const [memory, setMemory] = useState<MemoryStore>(DEFAULT_MEMORY);
  const [activeApp, setActiveApp] = useState<AppId>('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  
  // Permissions State (Simulation)
  const [permissions, setPermissions] = useState({
    mic: false,
    location: false,
    activity: false,
    autoUpdate: false
  });
  
  // App Specific State
  const [journalFilter, setJournalFilter] = useState<Category | 'all'>('all');
  const [journalSearchQuery, setJournalSearchQuery] = useState('');
  const [liveListening, setLiveListening] = useState(false);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: "Systems online. Lucy ready.", timestamp: Date.now() }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persistence & Initialization
  useEffect(() => {
    const storedMemory = localStorage.getItem('lucy_memory');
    if (storedMemory) setMemory(JSON.parse(storedMemory));

    const storedTheme = localStorage.getItem('lucy_theme') as Theme;
    if (storedTheme) setTheme(storedTheme);
    
    // Auto-update check simulation
    const storedPerms = localStorage.getItem('lucy_permissions');
    if (storedPerms) setPermissions(JSON.parse(storedPerms));
  }, []);

  useEffect(() => {
    localStorage.setItem('lucy_theme', theme);
    document.body.style.backgroundColor = theme === 'dark' ? '#000000' : '#f8fafc';
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const updatePermissions = (key: keyof typeof permissions) => {
    const newPerms = { ...permissions, [key]: !permissions[key] };
    setPermissions(newPerms);
    localStorage.setItem('lucy_permissions', JSON.stringify(newPerms));
    
    // If mic enabled, user feels like "Auto Update" is possible
    if (key === 'mic' && newPerms.mic) {
        // Request actual browser permission
        navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
            console.error("Mic permission denied by browser", err);
            setPermissions(p => ({ ...p, mic: false }));
        });
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: inputMessage, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const responseText = await sendMessageToLucy(userMsg.text, memory);
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: responseText, timestamp: Date.now() }]);
    } catch (error) {
       setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: "Connection Error.", timestamp: Date.now() }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- Views ---

  const renderHome = () => (
    <div className="flex flex-col min-h-screen pb-28 relative overflow-hidden">
      <StatusBar theme={theme} />
      
      <Clock theme={theme} />

      {/* Main Grid */}
      <div className="flex-1 px-6 flex flex-col justify-end pb-8 gap-8">
        
        {/* Widget Area */}
        <div 
            onClick={() => { setActiveApp('chat'); }}
            className={`w-full p-6 rounded-[2rem] backdrop-blur-xl border flex flex-col gap-2 transition-all active:scale-95 cursor-pointer
              ${theme === 'dark' 
                ? 'bg-zinc-900/60 border-zinc-800 text-white shadow-lg' 
                : 'bg-white/60 border-white/50 text-slate-800 shadow-xl shadow-slate-200/50'
              }`}
        >
            <div className="flex items-center gap-3 mb-1">
                <Sparkles className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-brand-600'}`} />
                <span className="font-semibold text-lg">Daily Insight</span>
            </div>
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'}`}>
               "Progress is impossible without change, and those who cannot change their minds cannot change anything."
            </p>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-4 gap-y-6 gap-x-4">
           <AppIcon theme={theme} icon={Phone} label="Phone" colorClass="bg-green-500" onClick={() => setActiveApp('phone')} />
           <AppIcon theme={theme} icon={MessageSquare} label="Messages" colorClass="bg-blue-500" onClick={() => setActiveApp('messages')} />
           <AppIcon theme={theme} icon={Settings} label="Settings" colorClass="bg-slate-500" onClick={() => setActiveApp('settings')} />
           <AppIcon theme={theme} icon={Mic} label="Lucy Live" colorClass="bg-rose-500" onClick={() => setActiveApp('live')} />
           
           <AppIcon theme={theme} icon={ShieldAlert} label="Struggles" colorClass="bg-amber-500" onClick={() => { setJournalFilter('struggles'); setActiveApp('journal'); }} />
           <AppIcon theme={theme} icon={Sprout} label="Growth" colorClass="bg-emerald-500" onClick={() => { setJournalFilter('development'); setActiveApp('journal'); }} />
           <AppIcon theme={theme} icon={Brain} label="Mindset" colorClass="bg-indigo-500" onClick={() => { setJournalFilter('mindset'); setActiveApp('journal'); }} />
           <AppIcon theme={theme} icon={BookOpen} label="Journal" colorClass="bg-orange-500" onClick={() => { setJournalFilter('all'); setActiveApp('journal'); }} />
        </div>
      </div>
      
      {/* Dock */}
      <nav className="fixed bottom-6 left-4 right-4 z-40">
        <div className={`p-2.5 rounded-[2.2rem] shadow-2xl flex justify-evenly items-center backdrop-blur-2xl border
            ${theme === 'dark' ? 'bg-zinc-800/80 border-zinc-700/50' : 'bg-white/80 border-white/40'}`}>
           
           <button onClick={() => setActiveApp('home')} className={`p-4 rounded-[1.5rem] ${activeApp === 'home' ? (theme === 'dark' ? 'bg-zinc-700' : 'bg-slate-200') : ''}`}>
             <Brain className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`} />
           </button>

           <button onClick={() => setActiveApp('chat')} className="p-4 rounded-[1.5rem] relative group">
             <div className="absolute inset-0 bg-brand-500/20 rounded-[1.5rem] opacity-0 group-hover:opacity-100 scale-75 transition-all"></div>
             <Sparkles className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-brand-600'}`} />
           </button>

           <button onClick={() => setIsModalOpen(true)} className="p-4 rounded-[1.5rem]">
             <Plus className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`} />
           </button>
        </div>
      </nav>
    </div>
  );

  const renderSettings = () => (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'} animate-fade-in`}>
         <div className="sticky top-0 p-4 flex items-center gap-4 bg-inherit z-10">
             <button onClick={() => setActiveApp('home')}><ArrowLeft className="w-6 h-6" /></button>
             <h1 className="text-2xl font-bold">Settings</h1>
         </div>
         
         <div className="p-4 space-y-6">
             {/* Account Section */}
             <div className={`p-6 rounded-3xl flex items-center gap-4 ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white shadow-sm'}`}>
                 <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold">L</div>
                 <div>
                     <h2 className="text-xl font-bold">Lucy OS</h2>
                     <p className="opacity-60 text-sm">System Active</p>
                 </div>
             </div>

             {/* Appearance */}
             <div className={`rounded-3xl overflow-hidden ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white shadow-sm'}`}>
                 <div className="p-4 border-b border-white/5 opacity-80 font-bold text-sm uppercase tracking-wider pl-6">Appearance</div>
                 <div onClick={toggleTheme} className="p-5 flex items-center justify-between active:bg-black/5 cursor-pointer">
                     <div className="flex items-center gap-3">
                         {theme === 'dark' ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-orange-400" />}
                         <span className="font-medium">Dark Mode</span>
                     </div>
                     <div className={`w-12 h-7 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-brand-500' : 'bg-slate-300'}`}>
                         <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${theme === 'dark' ? 'translate-x-5' : ''}`}></div>
                     </div>
                 </div>
             </div>

             {/* Privacy & Permissions */}
             <div className={`rounded-3xl overflow-hidden ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white shadow-sm'}`}>
                 <div className="p-4 border-b border-white/5 opacity-80 font-bold text-sm uppercase tracking-wider pl-6">Intelligent Access</div>
                 
                 {/* Mic */}
                 <div onClick={() => updatePermissions('mic')} className="p-5 flex items-center justify-between active:bg-black/5 cursor-pointer border-b border-white/5">
                     <div className="flex items-center gap-3">
                         <Mic className="w-5 h-5 text-rose-500" />
                         <div>
                             <div className="font-medium">Conversation Listener</div>
                             <div className="text-xs opacity-60">Allow Lucy to hear environment</div>
                         </div>
                     </div>
                     <div className={`w-12 h-7 rounded-full p-1 transition-colors ${permissions.mic ? 'bg-brand-500' : 'bg-slate-300'}`}>
                         <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${permissions.mic ? 'translate-x-5' : ''}`}></div>
                     </div>
                 </div>

                 {/* Activity */}
                 <div onClick={() => updatePermissions('activity')} className="p-5 flex items-center justify-between active:bg-black/5 cursor-pointer">
                     <div className="flex items-center gap-3">
                         <Phone className="w-5 h-5 text-green-500" />
                         <div>
                             <div className="font-medium">Activity Tracking</div>
                             <div className="text-xs opacity-60">Analyze app usage patterns</div>
                         </div>
                     </div>
                     <div className={`w-12 h-7 rounded-full p-1 transition-colors ${permissions.activity ? 'bg-brand-500' : 'bg-slate-300'}`}>
                         <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${permissions.activity ? 'translate-x-5' : ''}`}></div>
                     </div>
                 </div>
             </div>
             
             <p className="text-center text-xs opacity-40 mt-8">Lucy OS v2.1 • Samsung One UI Inspired</p>
         </div>
      </div>
  );

  const renderLiveApp = () => (
    <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center relative ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-slate-900'}`}>
        <button onClick={() => setActiveApp('home')} className="absolute top-4 left-4 p-2 rounded-full bg-slate-100/10"><ArrowLeft className="w-6 h-6" /></button>
        
        <div className={`w-40 h-40 rounded-full flex items-center justify-center mb-8 transition-all duration-1000 ${liveListening ? 'bg-rose-500 shadow-[0_0_100px_rgba(244,63,94,0.4)] animate-pulse' : 'bg-slate-200 dark:bg-zinc-800'}`}>
            <Mic className={`w-16 h-16 ${liveListening ? 'text-white' : 'text-slate-400'}`} />
        </div>
        
        <h2 className="text-3xl font-bold mb-2">Lucy Live</h2>
        <p className="opacity-60 max-w-xs mx-auto mb-10">
            {permissions.mic 
              ? (liveListening ? "Listening to your environment to update memory context..." : "Tap to start passive listening.") 
              : "Microphone permission required. Go to Settings."}
        </p>

        {permissions.mic && (
            <button 
                onClick={() => setLiveListening(!liveListening)}
                className={`px-8 py-3 rounded-full font-bold text-lg transition-all ${liveListening ? 'bg-slate-800 text-white dark:bg-white dark:text-black' : 'bg-rose-500 text-white'}`}
            >
                {liveListening ? 'Stop Listening' : 'Start Listening'}
            </button>
        )}
    </div>
  );

  const renderSimpleApp = (title: string, icon: any, color: string) => (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center relative ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-slate-900'}`}>
         <button onClick={() => setActiveApp('home')} className="absolute top-4 left-4 p-2 rounded-full bg-slate-100/10"><ArrowLeft className="w-6 h-6" /></button>
         <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 ${color} shadow-2xl`}>
             {React.createElement(icon, { className: "w-10 h-10 text-white" })}
         </div>
         <h1 className="text-3xl font-bold mb-2">{title}</h1>
         <p className="opacity-50">This system app is currently simulated for the OS experience.</p>
      </div>
  );

  const renderJournal = () => (
    <div className={`min-h-screen flex flex-col pb-24 ${theme === 'dark' ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'} animate-fade-in`}>
       {/* App Header */}
       <div className={`sticky top-0 z-20 px-4 pt-4 pb-2 flex flex-col gap-4 border-b ${theme === 'dark' ? 'bg-black/80 border-white/10' : 'bg-white/90 border-slate-200'} backdrop-blur-md`}>
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <button onClick={() => setActiveApp('home')}><ArrowLeft className="w-6 h-6" /></button>
               <h1 className="text-xl font-bold">Memory Bank</h1>
             </div>
             <button onClick={() => setIsModalOpen(true)} className={`p-2 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                <Plus className="w-5 h-5" />
             </button>
          </div>
          
          {/* Search Bar */}
          <div className={`relative flex items-center px-4 py-3 rounded-xl transition-colors ${theme === 'dark' ? 'bg-zinc-900 focus-within:bg-zinc-800' : 'bg-slate-100 focus-within:bg-white border border-transparent focus-within:border-slate-200 shadow-sm'}`}>
             <Search className="w-4 h-4 opacity-40 mr-3" />
             <input 
                type="text"
                placeholder="Search memories..."
                value={journalSearchQuery}
                onChange={(e) => setJournalSearchQuery(e.target.value)}
                className="bg-transparent w-full outline-none text-sm placeholder:opacity-50 font-medium"
             />
             {journalSearchQuery && (
                <button onClick={() => setJournalSearchQuery('')} className="p-1"><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
             )}
          </div>
       </div>

       {/* Category Tabs */}
       <div className="px-4 py-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {(['all', 'struggles', 'development', 'mindset'] as const).map(cat => (
             <button
               key={cat}
               onClick={() => setJournalFilter(cat)}
               className={`px-5 py-2 rounded-full text-sm font-medium transition-all border capitalize ${
                 journalFilter === cat 
                   ? (theme === 'dark' ? 'bg-white text-black border-white' : 'bg-slate-900 text-white border-slate-900')
                   : (theme === 'dark' ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-white text-slate-600 border-slate-200')
               }`}
             >
               {cat}
             </button>
          ))}
       </div>

       <div className="flex-1 px-4 space-y-4 overflow-y-auto">
         {(['development', 'mindset', 'struggles'] as const)
            .filter(cat => journalFilter === 'all' || journalFilter === cat)
            .map(cat => {
              // Filtering Logic: Check both description and details
              const filteredItems = memory[cat].filter(item => {
                 if (!journalSearchQuery) return true;
                 const q = journalSearchQuery.toLowerCase();
                 const inDesc = item.value.description.toLowerCase().includes(q);
                 const inDetails = item.value.details?.some(d => d.toLowerCase().includes(q));
                 return inDesc || inDetails;
              });
              
              if (filteredItems.length === 0) {
                  // Only show "No records" if we aren't searching, or if searching reveals nothing for a specific filtered tab
                  if (journalSearchQuery && journalFilter !== 'all' && journalFilter === cat) {
                      return <div key={cat} className="p-4 text-center text-sm opacity-50">No matches in {cat}.</div>;
                  }
                  if (memory[cat].length === 0) return null; // Don't show header if empty natively
                  return null; 
              }

              return (
               <div key={cat} className="space-y-3">
                  {(journalFilter === 'all' || journalSearchQuery) && <h3 className="capitalize text-xs font-bold opacity-40 ml-1 mt-2">{cat}</h3>}
                  {filteredItems.map(item => (
                    <MemoryCard key={item.id} item={item} category={cat} />
                  ))}
               </div>
              );
         })}
         
         {/* Global Empty State for Search */}
         {journalSearchQuery && (
             ['development', 'mindset', 'struggles'].every(cat => 
                 memory[cat as Category].filter(item => 
                     item.value.description.toLowerCase().includes(journalSearchQuery.toLowerCase()) || 
                     item.value.details?.some(d => d.toLowerCase().includes(journalSearchQuery.toLowerCase()))
                 ).length === 0
             )
         ) && (
             <div className="flex flex-col items-center justify-center pt-10 opacity-50">
                 <Search className="w-12 h-12 mb-2" />
                 <p>No memories found for "{journalSearchQuery}"</p>
             </div>
         )}
       </div>
    </div>
  );

  const renderChat = () => (
    <div className={`flex flex-col h-screen fixed inset-0 z-50 ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-slate-900'} animate-fade-in`}>
      <div className={`p-4 flex items-center gap-3 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-slate-100'}`}>
        <button onClick={() => setActiveApp('home')}><ArrowLeft className="w-6 h-6" /></button>
        <div className="flex flex-col">
           <h2 className="font-bold leading-none">Lucy</h2>
           <span className="text-[10px] text-brand-500 font-medium leading-tight flex items-center gap-1 mt-1">
             <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></span> Online
           </span>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${theme === 'dark' ? 'bg-zinc-900/20' : 'bg-slate-50/50'}`}>
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[1.2rem] px-5 py-3 text-[15px] leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-brand-600 text-white rounded-br-sm' 
                  : (theme === 'dark' ? 'bg-zinc-800 text-zinc-200' : 'bg-white text-slate-800 border border-slate-100') + ' rounded-bl-sm'
              }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      
      <div className={`p-3 pb-8 md:pb-4 border-t ${theme === 'dark' ? 'border-zinc-800 bg-black' : 'border-slate-100 bg-white'}`}>
        <div className={`relative flex items-center gap-2 rounded-full p-1 pl-4 ${theme === 'dark' ? 'bg-zinc-900' : 'bg-slate-100'}`}>
          <input 
            type="text" 
            className="w-full bg-transparent border-none focus:ring-0 placeholder:opacity-40 py-2.5 outline-none"
            placeholder="Message Lucy..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            autoFocus
          />
          <button 
            onClick={handleSendMessage}
            className="p-2 bg-brand-600 text-white rounded-full active:scale-90 transition-transform"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <main>
        {activeApp === 'home' && renderHome()}
        {activeApp === 'journal' && renderJournal()}
        {activeApp === 'chat' && renderChat()}
        {activeApp === 'settings' && renderSettings()}
        {activeApp === 'live' && renderLiveApp()}
        {activeApp === 'phone' && renderSimpleApp("Phone", Phone, "bg-green-500")}
        {activeApp === 'messages' && renderSimpleApp("Messages", MessageSquare, "bg-blue-500")}
      </main>

      <MemoryEntryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={(c, d, det) => {
            const newItem: MemoryItem = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), value: { description: d, details: det } };
            const updated = { ...memory, [c]: [newItem, ...memory[c]] };
            setMemory(updated);
            localStorage.setItem('lucy_memory', JSON.stringify(updated));
        }} 
      />
    </div>
  );
};

export default App;