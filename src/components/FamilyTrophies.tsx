import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Award, 
  Star, 
  Crown, 
  Heart, 
  Sparkles, 
  Plus, 
  Trash2, 
  User, 
  Check, 
  TrendingUp, 
  X,
  Smile,
  Zap,
  Bookmark,
  Search,
  Share2
} from 'lucide-react';
import { Language } from '../lib/translations';

interface TrophyData {
  id: string;
  title: string;
  description: string;
  category: 'tasks' | 'expenses' | 'messages' | 'moods' | 'photos' | 'custom';
  userId: string;
  familyId: string;
  userDisplayName: string;
  createdAt: any;
  icon: string;
  earnedCriteria?: string;
}

interface FamilyTrophiesProps {
  trophies: TrophyData[];
  family: { id: string; members: string[]; name: string };
  familyProfiles: Record<string, string>;
  language: Language;
  theme: any;
  userData: any;
  onAwardTrophy: (title: string, description: string, category: 'custom', userId: string, icon: string) => Promise<void>;
  onDeleteTrophy: (id: string) => Promise<void>;
  tasks: any[];
  expenses: any[];
  messages: any[];
  photos: any[];
}

const ICON_PRESETS = [
  { char: '👑', label: 'Crown' },
  { char: '🏆', label: 'Trophy' },
  { char: '⭐️', label: 'Star' },
  { char: '❤️', label: 'Heart' },
  { char: '⚡️', label: 'Volt' },
  { char: '🧁', label: 'Cupcake' },
  { char: '🎖️', label: 'Medal' },
  { char: '🚀', label: 'Rocket' },
  { char: '🧁', label: 'Chef' },
  { char: '🧹', label: 'Helper' },
  { char: '🏋️', label: 'Champ' },
  { char: '🎨', label: 'Artist' }
];

export const FamilyTrophies: React.FC<FamilyTrophiesProps> = ({
  trophies,
  family,
  familyProfiles,
  language,
  theme,
  userData,
  onAwardTrophy,
  onDeleteTrophy,
  tasks,
  expenses,
  messages,
  photos
}) => {
  const isDark = theme.bg?.includes('0c0a21') || theme.bg?.includes('020617') || theme.card?.includes('18181B') || theme.card?.includes('1e293b');

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrophies = trophies.filter(t => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (t.title && t.title.toLowerCase().includes(query)) ||
      (t.userDisplayName && t.userDisplayName.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  });

  // Custom award form state
  const [awardTitle, setAwardTitle] = useState('');
  const [awardDesc, setAwardDesc] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🏆');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Selected trophy details modal
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyData | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShareTrophy = async (trophy: TrophyData) => {
    const isEs = language === 'es';
    const appUrl = window.location.href;
    const shareText = isEs 
      ? `🏆 ¡Logro Desbloqueado!\n\n✨ ${trophy.userDisplayName} ha ganado el trofeo: "${trophy.title}"\n📝 "${trophy.description}"\n\n¡Míralo en nuestro Family Hub! 🏠\n🔗 ${appUrl}`
      : `🏆 Achievement Unlocked!\n\n✨ ${trophy.userDisplayName} has unsealed the trophy: "${trophy.title}"\n📝 "${trophy.description}"\n\nCheck it out in our Family Hub! 🏠\n🔗 ${appUrl}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for iframe restrictions
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCustomAwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardTitle.trim() || !awardDesc.trim() || !selectedUser) return;

    setIsSubmitting(true);
    try {
      await onAwardTrophy(
        awardTitle.trim(),
        awardDesc.trim(),
        'custom',
        selectedUser,
        selectedIcon
      );
      setAwardTitle('');
      setAwardDesc('');
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Predefined milestones tracking for active checklist displaying
  const milestones = [
    {
      id: 'tasks_1',
      title: language === 'es' ? 'Primer Logro' : 'First Achievement',
      desc: language === 'es' ? 'Completa 1 tarea' : 'Complete 1 task',
      req: 1,
      icon: '⭐️',
      type: 'tasks'
    },
    {
      id: 'tasks_5',
      title: language === 'es' ? 'Campeón de Tareas' : 'Task Champion',
      desc: language === 'es' ? 'Completa 5 tareas' : 'Complete 5 tasks',
      req: 5,
      icon: '🥉',
      type: 'tasks'
    },
    {
      id: 'tasks_15',
      title: language === 'es' ? 'Leyenda del Hogar' : 'Household Legend',
      desc: language === 'es' ? 'Completa 15 tareas' : 'Complete 15 tasks',
      req: 15,
      icon: '🥈',
      type: 'tasks'
    },
    {
      id: 'tasks_30',
      title: language === 'es' ? 'Héroe Supremo' : 'Supreme Household Hero',
      desc: language === 'es' ? 'Completa 30 tareas' : 'Complete 30 tasks',
      req: 30,
      icon: '👑',
      type: 'tasks'
    },
    {
      id: 'expenses_1',
      title: language === 'es' ? 'Contable Junior' : 'Junior Accountant',
      desc: language === 'es' ? 'Añade 1 gasto familiar' : 'Log 1 family expense',
      req: 1,
      icon: '💸',
      type: 'expenses'
    },
    {
      id: 'expenses_10',
      title: language === 'es' ? 'Gurú Financiero' : 'Financial Guru',
      desc: language === 'es' ? 'Añade 10 gastos familiares' : 'Log 10 family expenses',
      req: 10,
      icon: '💳',
      type: 'expenses'
    },
    {
      id: 'messages_5',
      title: language === 'es' ? 'Social Butterfly' : 'Social Butterfly',
      desc: language === 'es' ? 'Añade 5 notas en el muro' : 'Post 5 sticky messages',
      req: 5,
      icon: '💬',
      type: 'messages'
    },
    {
      id: 'photos_3',
      title: language === 'es' ? 'Cronista del Álbum' : 'Album Historian',
      desc: language === 'es' ? 'Sube 3 fotos de recuerdos' : 'Add 3 family moments',
      req: 3,
      icon: '📷',
      type: 'photos'
    }
  ];

  // Helper matching assignee name to members database IDs precisely
  const isUserAssignee = (assignee: any, memberId: string) => {
    if (!assignee) return false;
    const profileName = familyProfiles[memberId];
    if (profileName) {
      const pLower = profileName.toLowerCase();
      if (pLower === 'papá' || pLower === 'papa') {
        return assignee === 'Papá' || assignee === 'papa' || assignee.toLowerCase() === 'papa' || assignee === memberId;
      }
      if (pLower === 'mamá' || pLower === 'mama') {
        return assignee === 'Mamá' || assignee === 'mama' || assignee.toLowerCase() === 'mama' || assignee === memberId;
      }
      return assignee === profileName || assignee === memberId;
    }
    return assignee === memberId;
  };

  const getMemberCompletedTasks = (memberId: string) => {
    return tasks.filter(t => t.status === 'Completed' && isUserAssignee(t.assignedTo, memberId)).length;
  };

  const getMemberExpenses = (memberId: string) => {
    return expenses.filter(e => e.authorId === memberId).length;
  };

  const getMemberMessages = (memberId: string) => {
    return messages.filter(m => m.authorId === memberId).length;
  };

  const getMemberPhotos = (memberId: string) => {
    return photos.filter(p => p.authorId === memberId).length;
  };

  return (
    <div className="space-y-8 select-none">
      {/* 1. Header Title Card */}
      <div className={`${theme.card} p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6`}>
        <div className="flex items-center gap-4">
          <span className="p-3.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl animate-[bounce_3s_infinite]" style={{ color: '#F59E0B' }}>
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />
          </span>
          <div>
            <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter">
              {language === 'es' ? 'Vitrina de Trofeos' : 'Family Trophies'}
            </h2>
            <p className="text-xs opacity-50 font-bold uppercase tracking-widest mt-1">
              {language === 'es' ? `${trophies.length} logros acumulados por los campeones de la casa` : `${trophies.length} achievements unsealed by family heroes`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="px-5 py-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-500">
              {language === 'es' ? 'Gran Copa Familiar' : 'Family Grand Slam'}
            </span>
          </div>
        </div>
      </div>

      {/* 1.5 Search Bar */}
      <div className={`${theme.card} p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm flex items-center gap-3 border border-black/5 dark:border-white/5`}>
        <div className="p-2 bg-amber-500/10 dark:bg-amber-500/15 rounded-xl text-amber-500">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder={language === 'es' ? 'Buscar logros por título, descripción o miembro...' : 'Search achievements by title, description, or member name...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full bg-transparent text-xs sm:text-sm font-extrabold placeholder:opacity-30 outline-none ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={() => setSearchQuery('')}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 2. Main content grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Trophy Cabinet per member (2 Span on desktop) */}
        <div className="lg:col-span-2 space-y-8">
          <div className={`${theme.card} p-6 sm:p-8 rounded-[2rem] shadow-sm space-y-6`}>
            <div className="flex items-center gap-2 pb-4 border-b border-black/5 dark:border-white/5">
              <Sparkles size={18} className="text-amber-500" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                {language === 'es' ? 'Gabinete de Honor de la Familia' : 'Honorary Cabinets'}
              </h3>
            </div>

            <div className="space-y-8">
              {family.members.map((memberId) => {
                const memberName = familyProfiles[memberId] || 'Member';
                const memberTrophies = filteredTrophies.filter(t => t.userId === memberId);
                
                const taskBadgeEarnedCount = getMemberCompletedTasks(memberId);
                const expenseBadgeEarnedCount = getMemberExpenses(memberId);
                
                return (
                  <motion.div 
                    key={memberId} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl border border-black/[0.03] dark:border-white/[0.03] bg-black/[0.01] dark:bg-white/[0.01] space-y-4 hover:border-amber-500/10 transition-colors"
                  >
                    {/* Member Profile bar */}
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 dark:bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
                          {memberName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base leading-none">
                            {memberName}
                          </h4>
                          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1 block">
                            🏆 {memberTrophies.length} {language === 'es' ? 'Trofeos ganados' : 'Trophies unsealed'}
                          </span>
                        </div>
                      </div>

                      {/* Small stats summary pill */}
                      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                        <span>🎯 {taskBadgeEarnedCount} {language === 'es' ? 'Tareas' : 'Tasks'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                        <span>💸 {expenseBadgeEarnedCount} {language === 'es' ? 'Gastos' : 'Expenses'}</span>
                      </div>
                    </div>

                    {/* Cabinet list display items */}
                    <div className="min-h-16 rounded-xl bg-black/5 dark:bg-black/20 p-4 border border-black/5 dark:border-white/5 flex flex-wrap gap-3 items-center">
                      {memberTrophies.length === 0 ? (
                        <div className="py-2 text-center text-xs opacity-40 font-bold uppercase tracking-wider w-full">
                          {searchQuery 
                            ? (language === 'es' ? 'Ningún trofeo coincide con tu búsqueda' : 'No achievements match your search') 
                            : `💤 ${language === 'es' ? 'Sin trofeos todavía' : 'No trophies currently unsealed'}`}
                        </div>
                      ) : (
                        memberTrophies.map((trophy) => (
                          <motion.div
                            key={trophy.id}
                            id={`trophy-card-${trophy.id}`}
                            initial={{ scale: 0.3, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                            whileHover={{ scale: 1.15, rotate: [0, -3, 3, 0] }}
                            onClick={() => setSelectedTrophy(trophy)}
                            className="trophy-card w-11 h-11 rounded-lg bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/10 hover:border-amber-500/30 flex items-center justify-center text-2xl cursor-pointer shadow-sm transition-all"
                            title={trophy.title}
                          >
                            <span>{trophy.icon || '🏆'}</span>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Milestone Details & Completion checklist panel */}
          <div className={`${theme.card} p-6 sm:p-8 rounded-[2rem] shadow-sm space-y-6`}>
            <div className="flex items-center gap-2 pb-4 border-b border-black/5 dark:border-white/5">
              <TrendingUp size={18} className="text-amber-500" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                {language === 'es' ? 'Lista de Hitos de Completado' : 'Milestone Grid Achievements'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {milestones.map((m) => {
                // Find members who unlocked this specific milestone
                const earners = filteredTrophies.filter(t => t.earnedCriteria === m.id);

                return (
                  <div 
                    key={m.id}
                    className="p-4 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] flex items-start gap-3 hover:shadow-inner transition-shadow"
                  >
                    <span className="text-2xl p-2 bg-amber-500/5 rounded-xl block shrink-0">{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white leading-tight">
                        {m.title}
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{m.desc}</p>
                      
                      {/* Displays Earners names */}
                      <div className="mt-2.5 flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500 mr-1 shrink-0">
                          {language === 'es' ? 'Obtenido por:' : 'Unlocked by:'}
                        </span>
                        {earners.length === 0 ? (
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest shrink-0 italic">
                            {language === 'es' ? 'Nadie todavía' : 'No one yet'}
                          </span>
                        ) : (
                          earners.map((e, idx) => (
                            <span 
                              key={e.id}
                              className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded"
                            >
                              {e.userDisplayName}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Form to Award custom trophy (1 Span on desktop) */}
        <div className="space-y-8">
          <div className={`${theme.card} p-6 sm:p-8 rounded-[2rem] shadow-sm space-y-6`}>
            <div className="flex items-center gap-2 pb-4 border-b border-black/5 dark:border-white/5">
              <Award size={18} className="text-pink-500" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                {language === 'es' ? 'Entregar un Trofeo' : 'Award Custom Trophy'}
              </h3>
            </div>

            <form onSubmit={handleCustomAwardSubmit} className="space-y-4">
              {formSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-bold flex items-center gap-2">
                  <Check size={14} />
                  <span>{language === 'es' ? '¡Trofeo entregado con éxito!' : 'Trophy awarded successfully!'}</span>
                </div>
              )}

              {/* Award Member selector */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400 block">
                  {language === 'es' ? '¿Para quién?' : 'To which Member?'}
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-xl text-xs font-bold outline-none border transition-all ${
                    isDark 
                      ? 'bg-[#18181B] border-white/10 text-white focus:border-amber-500/50' 
                      : 'bg-black/5 border-black/5 text-zinc-900 focus:border-amber-500/50'
                  }`}
                >
                  <option value="">{language === 'es' ? 'Seleccionar miembro...' : 'Choose family member...'}</option>
                  {family.members.map(memberId => {
                    const name = familyProfiles[memberId] || 'Member';
                    // We can choose any family member
                    return (
                      <option key={memberId} value={memberId}>
                        {name} {memberId === userData?.uid ? (language === 'es' ? '(Yo)' : '(Me)') : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Trophy Title input */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400 block">
                  {language === 'es' ? 'Título del Trofeo' : 'Trophy Title'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'es' ? 'Ej: Súper Cocinero, Master de Platos' : 'e.g. Best Room Cleaner, Math Pro'}
                  value={awardTitle}
                  onChange={(e) => setAwardTitle(e.target.value)}
                  maxLength={100}
                  required
                  className={`w-full px-4 py-3 rounded-xl text-xs font-bold outline-none border transition-all ${
                    isDark 
                      ? 'bg-[#18181B] border-white/10 text-white placeholder:opacity-30 focus:border-amber-500/50' 
                      : 'bg-black/5 border-black/5 text-zinc-900 placeholder:opacity-40 focus:border-amber-500/50'
                  }`}
                />
              </div>

              {/* Badge Icon Customizer */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400 block">
                  {language === 'es' ? 'Emblema / Icono' : 'Emblem Badges'}
                </label>
                <div className="grid grid-cols-6 gap-2 p-3 bg-black/5 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5">
                  {ICON_PRESETS.map((icon) => (
                    <button
                      key={icon.char}
                      type="button"
                      onClick={() => setSelectedIcon(icon.char)}
                      className={`h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-all ${
                        selectedIcon === icon.char 
                          ? 'border-amber-500 bg-amber-500/15 scale-110 shadow-sm' 
                          : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {icon.char}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trophy Description */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400 block">
                  {language === 'es' ? '¿Por qué lo gana?' : 'Achievement Reason'}
                </label>
                <textarea
                  placeholder={language === 'es' ? 'Detalla por qué merece esta distinción familiar...' : 'Describe what amazing thin they did to unseal this award...'}
                  value={awardDesc}
                  onChange={(e) => setAwardDesc(e.target.value)}
                  rows={3}
                  maxLength={400}
                  required
                  className={`w-full px-4 py-3 rounded-xl text-xs font-bold outline-none border transition-all resize-none ${
                    isDark 
                      ? 'bg-[#18181B] border-white/10 text-white placeholder:opacity-30 focus:border-amber-500/50' 
                      : 'bg-black/5 border-black/5 text-zinc-900 placeholder:opacity-40 focus:border-amber-500/50'
                  }`}
                />
              </div>

              {/* Award Trigger Button */}
              <button
                type="submit"
                disabled={isSubmitting || !awardTitle.trim() || !awardDesc.trim() || !selectedUser}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                <Award size={14} />
                <span>{isSubmitting ? (language === 'es' ? 'Entregando...' : 'Awarding...') : (language === 'es' ? 'Entregar Trofeo' : 'Award Trophy')}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 4. Lightbox Detail Dialog Modal Popup */}
      <AnimatePresence>
        {selectedTrophy && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedTrophy(null);
              setCopied(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`${isDark ? 'bg-zinc-900 border border-white/10' : 'bg-white border border-black/5'} w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-6 relative overflow-hidden cursor-default`}
            >
              {/* Backglow decorative light effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

              {/* Close Button */}
              <button 
                onClick={() => {
                  setSelectedTrophy(null);
                  setCopied(false);
                }}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors animate-none"
              >
                <X size={16} />
              </button>

              <div className="text-center pt-4 space-y-4">
                {/* Large Trophy logo */}
                <span className="text-6xl inline-block p-4 rounded-3xl bg-amber-500/5 animate-[bounce_2s_infinite]">
                  {selectedTrophy.icon || '🏆'}
                </span>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 block">
                    🏅 {selectedTrophy.category === 'custom' ? (language === 'es' ? 'Logro Especial' : 'Special Award') : (language === 'es' ? 'Hito Completado' : 'Milestone Unlocked')}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase leading-tight italic tracking-tight">
                    {selectedTrophy.title}
                  </h3>
                </div>

                <div className="p-4 bg-black/5 dark:bg-black/25 rounded-2xl text-xs font-bold text-zinc-600 dark:text-zinc-350 italic">
                  "{selectedTrophy.description}"
                </div>

                {/* Metadata details info */}
                <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-col items-center gap-1.5 text-zinc-400">
                  <div className="text-[10px] font-black uppercase tracking-wider">
                    {language === 'es' ? 'Otorgado a:' : 'Awarded to:'}
                    <span className="text-zinc-900 dark:text-white ml-1 font-extrabold uppercase bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">
                      {selectedTrophy.userDisplayName}
                    </span>
                  </div>
                  {selectedTrophy.createdAt && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 opacity-60">
                      {new Date(selectedTrophy.createdAt.seconds ? selectedTrophy.createdAt.seconds * 1000 : selectedTrophy.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Share / Clipboard Copy Button */}
                <button
                  type="button"
                  onClick={() => handleShareTrophy(selectedTrophy)}
                  className={`mt-4 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all w-full flex items-center justify-center gap-2 border shadow-md ${
                    copied 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                      : isDark
                        ? 'bg-[#18181B] hover:bg-zinc-800 border-white/10 text-white'
                        : 'bg-zinc-100 hover:bg-zinc-200 border-black/5 text-zinc-900'
                  }`}
                >
                  {copied ? <Check size={14} className="text-emerald-500 animate-[pulse_1s_infinite]" /> : <Share2 size={14} />}
                  <span>
                    {copied 
                      ? (language === 'es' ? '¡Logro copiado!' : 'Trophy summary copied!') 
                      : (language === 'es' ? 'Compartir Logro' : 'Share Achievement')}
                  </span>
                </button>

                {/* Revoke / delete buttons for custom trophies only (so user can clean up custom rewards) */}
                {selectedTrophy.category === 'custom' && (
                  <button 
                    onClick={async () => {
                      if (confirm(language === 'es' ? '¿Quieres revocar este trofeo?' : 'Do you want to revoke this custom trophy?')) {
                        await onDeleteTrophy(selectedTrophy.id);
                        setSelectedTrophy(null);
                        setCopied(false);
                      }
                    }}
                    className="mt-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all w-full flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={11} />
                    <span>{language === 'es' ? 'Eliminar Trofeo' : 'Revoke Trophy'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
