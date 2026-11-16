import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Code2,
  Compass,
  PenTool,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  BUILT_IN_OPPORTUNITIES,
  CATEGORY_LABELS,
  type OpportunityTemplate,
  type PageCategory,
} from '../lib/opportunities';

interface OpportunitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customOpportunities: OpportunityTemplate[];
  onLaunchOpportunity: (template: OpportunityTemplate) => Promise<void>;
  onCreateCustomOpportunity: (data: {
    title: string;
    description: string;
    category: Exclude<PageCategory, 'general'>;
    systemInstruction: string;
    starterPrompt: string;
  }) => Promise<void>;
  onDeleteCustomOpportunity: (id: string) => Promise<void>;
}

function getCategoryIcon(category: PageCategory) {
  switch (category) {
    case 'opportunity':
      return Briefcase;
    case 'coding':
      return Code2;
    case 'learning':
      return BookOpen;
    case 'writing':
      return PenTool;
    case 'custom':
      return Sparkles;
    default:
      return Compass;
  }
}

export function OpportunitiesModal({
  isOpen,
  onClose,
  customOpportunities,
  onLaunchOpportunity,
  onCreateCustomOpportunity,
  onDeleteCustomOpportunity,
}: OpportunitiesModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] =
    useState<Exclude<PageCategory, 'general'>>('opportunity');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [starterPrompt, setStarterPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLaunch = async (template: OpportunityTemplate) => {
    setLaunchingId(template.id);
    try {
      await onLaunchOpportunity(template);
      onClose();
    } finally {
      setLaunchingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedInstr = systemInstruction.trim();

    if (!trimmedTitle || !trimmedDesc || !trimmedInstr) {
      setFormError('Please fill in title, description, and AI instructions.');
      return;
    }

    setSaving(true);
    try {
      await onCreateCustomOpportunity({
        title: trimmedTitle.slice(0, 100),
        description: trimmedDesc.slice(0, 400),
        category,
        systemInstruction: trimmedInstr.slice(0, 4000),
        starterPrompt: starterPrompt.trim().slice(0, 1000),
      });
      setTitle('');
      setDescription('');
      setSystemInstruction('');
      setStarterPrompt('');
      setShowCreateForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save custom page template.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90dvh] md:max-h-[88vh] overflow-y-auto rounded-t-3xl md:rounded-2xl border p-5 md:p-8 pb-safe space-y-6 md:space-y-8"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--surface-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden w-10 h-1.5 rounded-full mx-auto -mt-1 mb-1 opacity-30 bg-current" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-semibold tracking-tight">
              New Page & Opportunities
            </h2>
            <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Open a specialized AI workspace page or create your own template.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCreateForm((v) => !v)}
              className="min-h-[44px] md:min-h-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl md:rounded-lg text-xs font-medium cursor-pointer transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-fg)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showCreateForm ? 'Back to Templates' : 'Create Custom Page'}</span>
              <span className="sm:hidden">{showCreateForm ? 'Back' : 'Custom'}</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-2 flex items-center justify-center rounded-xl md:rounded-lg cursor-pointer hover:opacity-75"
              style={{ backgroundColor: 'var(--surface-bg)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showCreateForm ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium block">Page Title</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Freelance Proposal Strategist"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-base md:text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium block">Category</label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as Exclude<PageCategory, 'general'>)
                  }
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-base md:text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                >
                  <option value="opportunity">Opportunities</option>
                  <option value="coding">Code Studio</option>
                  <option value="learning">Study Mentor</option>
                  <option value="writing">Writing Desk</option>
                  <option value="custom">Custom Page</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium block">Short Description</label>
              <input
                type="text"
                required
                maxLength={400}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this page help you accomplish?"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-base md:text-sm outline-none"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  borderColor: 'var(--surface-border)',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium block">
                AI Role & Instructions
              </label>
              <textarea
                required
                rows={4}
                maxLength={4000}
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                placeholder="Describe how Aurora should think and respond inside this page..."
                className="w-full px-3.5 py-2.5 rounded-xl border text-base md:text-sm outline-none resize-y"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  borderColor: 'var(--surface-border)',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium block">
                Optional Starter Prompt
              </label>
              <input
                type="text"
                maxLength={1000}
                value={starterPrompt}
                onChange={(e) => setStarterPrompt(e.target.value)}
                placeholder="Auto-fill or send an opening prompt when opened (optional)"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-base md:text-sm outline-none"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  borderColor: 'var(--surface-border)',
                }}
              />
            </div>

            {formError && (
              <p className="text-sm text-red-500">{formError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl md:rounded-lg text-sm font-medium border cursor-pointer"
                style={{ borderColor: 'var(--surface-border)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] px-5 py-2 rounded-xl md:rounded-lg text-sm font-medium cursor-pointer disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-fg)',
                }}
              >
                {saving ? 'Saving to Firebase...' : 'Save Page Template'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <h3
                className="text-xs font-semibold tracking-wide uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Featured Opportunity Pages
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {BUILT_IN_OPPORTUNITIES.map((item) => {
                  const Icon = getCategoryIcon(item.category);
                  const isBusy = launchingId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleLaunch(item)}
                      disabled={isBusy}
                      className="group p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 hover:opacity-95"
                      style={{
                        backgroundColor: 'var(--surface-bg)',
                        borderColor: 'var(--surface-border)',
                      }}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              className="w-4 h-4 shrink-0"
                              style={{ color: 'var(--accent-primary)' }}
                            />
                            <span className="font-semibold text-sm">{item.title}</span>
                          </div>
                          <ArrowRight
                            className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
                          />
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {item.description}
                        </p>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {CATEGORY_LABELS[item.category]} · {isBusy ? 'Opening page...' : 'Launch page'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {customOpportunities.length > 0 && (
              <section className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
                <h3
                  className="text-xs font-semibold tracking-wide uppercase"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Your Saved Custom Pages
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {customOpportunities.map((item) => {
                    const Icon = getCategoryIcon(item.category);
                    const isBusy = launchingId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border flex flex-col justify-between gap-3"
                        style={{
                          backgroundColor: 'var(--surface-bg)',
                          borderColor: 'var(--surface-border)',
                        }}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon
                                className="w-4 h-4 shrink-0"
                                style={{ color: 'var(--accent-primary)' }}
                              />
                              <span className="font-semibold text-sm truncate">
                                {item.title}
                              </span>
                            </div>
                            <button
                              onClick={() => onDeleteCustomOpportunity(item.id)}
                              aria-label={`Delete ${item.title}`}
                              className="p-1.5 rounded-md hover:opacity-75 cursor-pointer shrink-0"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p
                            className="text-xs leading-relaxed"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {CATEGORY_LABELS[item.category]}
                          </span>
                          <button
                            onClick={() => handleLaunch(item)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer hover:underline"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            <span>{isBusy ? 'Opening...' : 'Open Page'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
