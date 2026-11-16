import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Check,
  Compass,
  Copy,
  Languages,
  Loader2,
  Menu,
  Mic,
  MicOff,
  Palette,
  Plus,
  RotateCcw,
  Send,
  Square,
  Video,
  Volume2,
  VolumeX,
  X,
  Youtube,
} from 'lucide-react';
import {
  BUILT_IN_OPPORTUNITIES,
  CATEGORY_LABELS,
  DEFAULT_VOICE_BY_GENDER,
  getLanguageOption,
  getVoiceGender,
  LANGUAGE_OPTIONS,
  type ChatMessage,
  type ChatPage,
  type LanguageCode,
  type VideoAttachmentPayload,
  type VoiceName,
} from '../lib/opportunities';

interface ChatWorkspaceProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activePage: ChatPage | null;
  messages: ChatMessage[];
  streamingContent: string;
  retryStatus?: string | null;
  isGenerating: boolean;
  voiceReplyEnabled: boolean;
  isListening: boolean;
  isTranscribing: boolean;
  interimText: string;
  speakingId: string | null;
  loadingSpeechId: string | null;
  voiceAutoSend: boolean;
  onToggleVoiceAutoSend: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onSpeakMessage: (id: string, text: string) => void;
  onStopSpeaking: () => void;
  onToggleVoiceReply: () => void;
  voiceName: VoiceName;
  onSelectVoiceName: (voice: VoiceName) => void;
  preferredLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onSendMessage: (
    content: string,
    usedVoice?: boolean,
    videoAttachment?: VideoAttachmentPayload,
    enableUrlContext?: boolean
  ) => Promise<void>;
  onStopGeneration: () => void;
  onRegenerateLast: () => Promise<void>;
  onOpenAppearance: () => void;
  onOpenOpportunities: () => void;
  onOpenYouTube: () => void;
  connectedYouTubeCount: number;
  onCreateNewPage: () => void;
  draftInput: string;
  onDraftInputChange: (val: string) => void;
  errorMessage: string | null;
  onDismissError?: () => void;
}

export function ChatWorkspace({
  sidebarOpen,
  onToggleSidebar,
  activePage,
  messages,
  streamingContent,
  retryStatus,
  isGenerating,
  voiceReplyEnabled,
  isListening,
  isTranscribing,
  interimText,
  speakingId,
  loadingSpeechId,
  voiceAutoSend,
  onToggleVoiceAutoSend,
  onStartListening,
  onStopListening,
  onSpeakMessage,
  onStopSpeaking,
  onToggleVoiceReply,
  voiceName,
  onSelectVoiceName,
  preferredLanguage,
  onSelectLanguage,
  onSendMessage,
  onStopGeneration,
  onRegenerateLast,
  onOpenAppearance,
  onOpenOpportunities,
  onOpenYouTube,
  connectedYouTubeCount,
  onCreateNewPage,
  draftInput,
  onDraftInputChange,
  errorMessage,
  onDismissError,
}: ChatWorkspaceProps) {
  const activeVoiceGender = getVoiceGender(voiceName);
  const currentLang = getLanguageOption(preferredLanguage);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachedVideo, setAttachedVideo] = useState<{
    payload: VideoAttachmentPayload;
    previewUrl: string;
  } | null>(null);
  const [videoNotice, setVideoNotice] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draftInput]);

  useEffect(() => {
    return () => {
      if (attachedVideo?.previewUrl) {
        URL.revokeObjectURL(attachedVideo.previewUrl);
      }
    };
  }, [attachedVideo]);

  const clearAttachedVideo = () => {
    if (attachedVideo?.previewUrl) {
      URL.revokeObjectURL(attachedVideo.previewUrl);
    }
    setAttachedVideo(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoNotice(null);
    const hasVideoMime = file.type.startsWith('video/');
    const hasVideoExt = /\.(mp4|webm|mov|m4v|mkv|avi|3gp)$/i.test(file.name);
    if (!hasVideoMime && !hasVideoExt) {
      setVideoNotice('Please select a valid video file (MP4, WebM, or MOV).');
      e.target.value = '';
      return;
    }

    const maxBytes = 100 * 1024 * 1024;
    if (file.size > maxBytes) {
      setVideoNotice('Please upload a video smaller than 100MB.');
      e.target.value = '';
      return;
    }

    const inferredMime = hasVideoMime
      ? file.type
      : /\.webm$/i.test(file.name)
        ? 'video/webm'
        : /\.mov$/i.test(file.name)
          ? 'video/quicktime'
          : 'video/mp4';

    if (attachedVideo?.previewUrl) {
      URL.revokeObjectURL(attachedVideo.previewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setAttachedVideo({
      payload: {
        file,
        mimeType: inferredMime,
        fileName: file.name,
        sizeBytes: file.size,
      },
      previewUrl,
    });
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = draftInput.trim();
    if ((!trimmed && !attachedVideo) || isGenerating) return;

    const currentVideo = attachedVideo?.payload;
    const messageText =
      trimmed ||
      `Analyze this uploaded video (${currentVideo?.fileName || 'video'}) and explain what happens in detail.`;
    const containsUrl = /https?:\/\/\S+/i.test(messageText);

    onDraftInputChange('');
    setVideoNotice(null);
    clearAttachedVideo();
    await onSendMessage(messageText, false, currentVideo, containsUrl);
  };

  const starterSuggestions =
    BUILT_IN_OPPORTUNITIES.find((o) => o.category === activePage?.category)
      ?.starterSuggestions || BUILT_IN_OPPORTUNITIES[0].starterSuggestions || [];

  const categoryLabel = activePage
    ? CATEGORY_LABELS[activePage.category]
    : 'New Workspace';

  return (
    <div
      className="flex-1 flex flex-col min-w-0 h-full"
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (!touch) return;
        if (!sidebarOpen && touch.clientX <= 36) {
          swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
        } else {
          swipeStartRef.current = null;
        }
      }}
      onTouchEnd={(e) => {
        if (!swipeStartRef.current) return;
        const touch = e.changedTouches[0];
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        if (!touch) return;
        const dx = touch.clientX - start.x;
        const dy = Math.abs(touch.clientY - start.y);
        if (dx > 56 && dy < 48 && !sidebarOpen) {
          onToggleSidebar();
        }
      }}
    >
      {/* Top Bar */}
      <header
        className="pt-safe min-h-[54px] md:h-14 px-2.5 sm:px-3 md:px-6 border-b flex items-center justify-between gap-2 md:gap-4 shrink-0"
        style={{
          backgroundColor: 'var(--canvas-bg)',
          borderColor: 'var(--surface-border)',
        }}
      >
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-2 flex items-center justify-center rounded-xl md:rounded-lg border cursor-pointer hover:opacity-80 shrink-0"
            style={{
              backgroundColor: 'var(--surface-bg)',
              borderColor: 'var(--surface-border)',
            }}
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="min-w-0 flex items-center gap-2 text-sm flex-1">
            <h1 className="text-base md:text-sm font-semibold truncate">
              {activePage ? activePage.title : 'Aurora AI'}
            </h1>
            <span aria-hidden="true" className="hidden sm:inline shrink-0" style={{ color: 'var(--text-muted)' }}>
              ·
            </span>
            <span
              className="text-xs whitespace-nowrap hidden sm:inline shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              {categoryLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <div
            className="min-h-[44px] md:min-h-0 inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl md:rounded-lg border shrink-0"
            style={{
              backgroundColor: 'var(--surface-bg)',
              borderColor: 'var(--surface-border)',
            }}
            title="Select conversation & voice language"
          >
            <Languages className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
            <select
              aria-label="Language"
              value={preferredLanguage}
              onChange={(e) => onSelectLanguage(e.target.value as LanguageCode)}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer pr-0.5 max-w-[68px] sm:max-w-[115px]"
              style={{ color: 'var(--text-primary)' }}
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option
                  key={lang.id}
                  value={lang.id}
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {lang.nativeLabel}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onToggleVoiceReply}
            title={
              voiceReplyEnabled
                ? 'Auto Voice Reply is On'
                : 'Auto Voice Reply is Off'
            }
            aria-label={voiceReplyEnabled ? 'Turn off voice reply' : 'Turn on voice reply'}
            className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 inline-flex items-center justify-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl md:rounded-lg text-xs font-medium border cursor-pointer transition-colors whitespace-nowrap shrink-0"
            style={{
              backgroundColor: voiceReplyEnabled
                ? 'var(--accent-primary)'
                : 'var(--surface-bg)',
              color: voiceReplyEnabled
                ? 'var(--accent-fg)'
                : 'var(--text-primary)',
              borderColor: voiceReplyEnabled
                ? 'var(--accent-primary)'
                : 'var(--surface-border)',
            }}
          >
            {voiceReplyEnabled ? (
              <Volume2 className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
            ) : (
              <VolumeX className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {voiceReplyEnabled ? 'Voice Reply On' : 'Voice Reply Off'}
            </span>
          </button>

          <button
            onClick={onOpenYouTube}
            title="Connect YouTube channel"
            aria-label="Connect YouTube channel"
            className="hidden sm:inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 items-center justify-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl md:rounded-lg text-xs font-medium border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--surface-bg)',
              borderColor: 'var(--surface-border)',
            }}
          >
            <Youtube className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0 text-red-500" />
            <span className="hidden md:inline">
              {connectedYouTubeCount > 0 ? 'YouTube Connected' : 'YouTube'}
            </span>
          </button>

          <button
            onClick={onOpenAppearance}
            title="Change background color and voice"
            aria-label="Change background color and voice"
            className="hidden sm:inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 items-center justify-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl md:rounded-lg text-xs font-medium border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--surface-bg)',
              borderColor: 'var(--surface-border)',
            }}
          >
            <Palette className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
            <span className="hidden md:inline">Background</span>
          </button>

          <button
            onClick={onCreateNewPage}
            aria-label="New page"
            className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl md:rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-fg)',
            }}
          >
            <Plus className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
            <span className="hidden sm:inline">New Page</span>
          </button>
        </div>
      </header>

      {/* Main Conversation Stream */}
      <main className="flex-1 overflow-y-auto px-3.5 md:px-8 py-4 md:py-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && !streamingContent ? (
            <div className="py-4 md:py-16 space-y-5 md:space-y-8">
              <div className="space-y-2 md:space-y-3">
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {categoryLabel} · {currentLang.nativeLabel} · Voice Reply {voiceReplyEnabled ? 'On' : 'Off'}
                </p>
                <h2
                  className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  {activePage
                    ? `What would you like to explore in "${activePage.title}"?`
                    : 'How can Aurora help you today?'}
                </h2>
                <p className="text-sm max-w-xl" style={{ color: 'var(--text-secondary)' }}>
                  Choose your language, speak a voice command, toggle voice replies, upload a video, or connect a YouTube channel.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {starterSuggestions.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void onSendMessage(prompt, false)}
                    className="p-4 rounded-xl border text-left text-sm transition-all cursor-pointer hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--surface-border)',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  onClick={isListening ? onStopListening : onStartListening}
                  disabled={isTranscribing || isGenerating}
                  className="min-h-[44px] md:min-h-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl md:rounded-lg text-xs font-medium border cursor-pointer hover:opacity-85 disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                >
                  <Mic className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                  <span>{isListening ? 'Stop Voice Command' : 'Voice Command'}</span>
                </button>

                <button
                  onClick={onOpenAppearance}
                  className="min-h-[44px] md:min-h-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl md:rounded-lg text-xs font-medium border cursor-pointer hover:opacity-85"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                >
                  <Languages className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                  <span>Language & Voice Settings</span>
                </button>

                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="min-h-[44px] md:min-h-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl md:rounded-lg text-xs font-medium border cursor-pointer hover:opacity-85"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                >
                  <Video className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                  <span>Upload Video</span>
                </button>

                <button
                  onClick={onOpenYouTube}
                  className="min-h-[44px] md:min-h-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl md:rounded-lg text-xs font-medium border cursor-pointer hover:opacity-85"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                >
                  <Youtube className="w-3.5 h-3.5 text-red-500" />
                  <span>Connect YouTube</span>
                </button>

                <button
                  onClick={onOpenOpportunities}
                  className="min-h-[44px] md:min-h-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl md:rounded-lg text-xs font-medium border cursor-pointer hover:opacity-85"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                >
                  <Compass className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                  <span>Explore Opportunity Pages</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isSpeakingThis = speakingId === msg.id;
                const isLoadingSpeech = loadingSpeechId === msg.id;
                const isLastModel =
                  !isUser && idx === messages.length - 1 && !isGenerating;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {isUser ? (
                      <div className="max-w-[85%] sm:max-w-[75%] space-y-1">
                        <div
                          className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                          style={{
                            backgroundColor: 'var(--user-bubble-bg)',
                            color: 'var(--user-bubble-fg)',
                          }}
                        >
                          {msg.content}
                        </div>
                        {msg.usedVoice && (
                          <div
                            className="text-[11px] text-right pr-1"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Sent via voice command
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full min-w-0 space-y-2.5">
                        <div
                          className="p-4 md:p-5 rounded-2xl border overflow-x-auto"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: 'var(--surface-border)',
                          }}
                        >
                          <div className="ai-markdown">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 px-1">
                          <button
                            onClick={() =>
                              isSpeakingThis
                                ? onStopSpeaking()
                                : onSpeakMessage(msg.id, msg.content)
                            }
                            disabled={isLoadingSpeech}
                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-md text-xs font-medium border cursor-pointer hover:opacity-85 disabled:opacity-60"
                            style={{
                              backgroundColor: isSpeakingThis
                                ? 'var(--accent-primary)'
                                : 'var(--surface-bg)',
                              color: isSpeakingThis
                                ? 'var(--accent-fg)'
                                : 'var(--text-secondary)',
                              borderColor: 'var(--surface-border)',
                            }}
                          >
                            {isLoadingSpeech ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isSpeakingThis ? (
                              <Square className="w-3 h-3" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {isLoadingSpeech
                                ? 'Loading voice...'
                                : isSpeakingThis
                                  ? 'Stop Voice'
                                  : 'Listen'}
                            </span>
                          </button>

                          <button
                            onClick={() => void handleCopy(msg.id, msg.content)}
                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-md text-xs font-medium border cursor-pointer hover:opacity-85"
                            style={{
                              backgroundColor: 'var(--surface-bg)',
                              color: 'var(--text-secondary)',
                              borderColor: 'var(--surface-border)',
                            }}
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          {isLastModel && (
                            <button
                              onClick={() => void onRegenerateLast()}
                              className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-md text-xs font-medium border cursor-pointer hover:opacity-85"
                              style={{
                                backgroundColor: 'var(--surface-bg)',
                                color: 'var(--text-secondary)',
                                borderColor: 'var(--surface-border)',
                              }}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Regenerate</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {(isGenerating || streamingContent) && (
                <div className="flex justify-start">
                  <div
                    className="w-full p-4 md:p-5 rounded-2xl border"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--surface-border)',
                    }}
                  >
                    {streamingContent ? (
                      <div className="ai-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-2 text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>{retryStatus || 'Thinking...'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 p-3.5 rounded-xl border text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              style={{
                backgroundColor: 'var(--surface-bg)',
                borderColor: '#dc2626',
                color: '#ef4444',
              }}
            >
              <span className="leading-snug">{errorMessage}</span>
              <div className="flex items-center gap-2 shrink-0">
                {messages.some((m) => m.role === 'user') && !isGenerating && (
                  <button
                    type="button"
                    onClick={() => void onRegenerateLast()}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-fg)',
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                )}
                {onDismissError && (
                  <button
                    type="button"
                    onClick={onDismissError}
                    aria-label="Dismiss error"
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border cursor-pointer hover:opacity-80"
                    style={{
                      borderColor: 'var(--surface-border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Composer */}
      <footer
        className="px-3 md:px-8 pt-2 pb-safe md:pb-5 shrink-0"
        style={{ backgroundColor: 'var(--canvas-bg)' }}
      >
        <div className="max-w-3xl mx-auto space-y-2">
          {(isListening || isTranscribing || interimText) && (
            <div
              className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl border text-xs"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--accent-primary)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Mic
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: 'var(--accent-primary)' }}
                />
                <span className="truncate font-medium">
                  {interimText || 'Listening... speak your prompt or command'}
                </span>
              </div>
              {isListening && (
                <button
                  onClick={onStopListening}
                  className="min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-fg)',
                  }}
                >
                  Done
                </button>
              )}
            </div>
          )}

          {videoNotice && (
            <div
              role="alert"
              className="px-3.5 py-2 rounded-xl border text-xs"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: '#dc2626',
                color: '#ef4444',
              }}
            >
              {videoNotice}
            </div>
          )}

          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            className="hidden"
            onChange={handleVideoFileChange}
          />

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border p-2.5 md:p-3 flex flex-col gap-2"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--surface-border)',
            }}
          >
            {attachedVideo && (
              <div
                className="flex items-center justify-between gap-3 p-2 rounded-xl border"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  borderColor: 'var(--surface-border)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <video
                    src={attachedVideo.previewUrl}
                    muted
                    playsInline
                    className="w-14 h-10 rounded-lg object-cover shrink-0 bg-black"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">
                      {attachedVideo.payload.fileName}
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {(attachedVideo.payload.sizeBytes / (1024 * 1024)).toFixed(1)} MB · Ready to analyze
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearAttachedVideo}
                  aria-label="Remove attached video"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:opacity-75 cursor-pointer shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              value={draftInput}
              onChange={(e) => onDraftInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder={
                attachedVideo
                  ? 'Ask a question about this video (or tap Send to analyze)...'
                  : 'Ask Aurora anything, upload a video, or tap Voice...'
              }
              className="w-full bg-transparent resize-none outline-none text-base md:text-[15px] px-1.5 py-1 max-h-40 leading-relaxed"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isGenerating}
                  title="Upload video to analyze (up to 100MB)"
                  aria-label="Upload video"
                  className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 inline-flex items-center justify-center gap-1.5 px-2.5 md:px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: attachedVideo
                      ? 'var(--accent-primary)'
                      : 'var(--surface-bg)',
                    color: attachedVideo
                      ? 'var(--accent-fg)'
                      : 'var(--text-primary)',
                    borderColor: attachedVideo
                      ? 'var(--accent-primary)'
                      : 'var(--surface-border)',
                  }}
                >
                  <Video className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Video</span>
                </button>

                <button
                  type="button"
                  onClick={isListening ? onStopListening : onStartListening}
                  disabled={isTranscribing || isGenerating}
                  title={
                    isListening
                      ? 'Stop voice command'
                      : `Start voice command (${currentLang.nativeLabel})`
                  }
                  className="min-h-[44px] md:min-h-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: isListening
                      ? '#dc2626'
                      : 'var(--surface-bg)',
                    color: isListening ? '#ffffff' : 'var(--text-primary)',
                    borderColor: isListening
                      ? '#dc2626'
                      : 'var(--surface-border)',
                  }}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
                  ) : (
                    <Mic className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
                  )}
                  <span className="hidden sm:inline">
                    {isListening
                      ? 'Stop Listening'
                      : isTranscribing
                        ? 'Wait...'
                        : 'Voice Cmd'}
                  </span>
                  <span className="sm:hidden">
                    {isListening
                      ? 'Stop'
                      : isTranscribing
                        ? 'Wait...'
                        : 'Voice'}
                  </span>
                </button>

                <div
                  className="min-h-[44px] md:min-h-0 inline-flex items-center p-0.5 rounded-xl border shrink-0"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                  role="group"
                  aria-label="Voice gender"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (activeVoiceGender !== 'girl') {
                        onStopSpeaking();
                        onSelectVoiceName(DEFAULT_VOICE_BY_GENDER.girl);
                      }
                    }}
                    className="min-h-[38px] md:min-h-0 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor:
                        activeVoiceGender === 'girl'
                          ? 'var(--accent-primary)'
                          : 'transparent',
                      color:
                        activeVoiceGender === 'girl'
                          ? 'var(--accent-fg)'
                          : 'var(--text-secondary)',
                    }}
                    title="Switch to Girl voice"
                  >
                    Girl
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeVoiceGender !== 'boy') {
                        onStopSpeaking();
                        onSelectVoiceName(DEFAULT_VOICE_BY_GENDER.boy);
                      }
                    }}
                    className="min-h-[38px] md:min-h-0 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor:
                        activeVoiceGender === 'boy'
                          ? 'var(--accent-primary)'
                          : 'transparent',
                      color:
                        activeVoiceGender === 'boy'
                          ? 'var(--accent-fg)'
                          : 'var(--text-secondary)',
                    }}
                    title="Switch to Boy voice"
                  >
                    Boy
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onToggleVoiceAutoSend}
                  className="min-h-[44px] md:min-h-0 px-2.5 py-2 rounded-xl text-xs border cursor-pointer transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: voiceAutoSend
                      ? 'var(--surface-bg)'
                      : 'transparent',
                    borderColor: voiceAutoSend
                      ? 'var(--accent-primary)'
                      : 'var(--surface-border)',
                    color: voiceAutoSend
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                  }}
                  title="Automatically send prompt when voice command finishes"
                >
                  <span className="hidden sm:inline">
                    {voiceAutoSend ? 'Auto-Send: On' : 'Auto-Send: Off'}
                  </span>
                  <span className="sm:hidden">
                    {voiceAutoSend ? 'Auto: On' : 'Auto: Off'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onOpenYouTube}
                  aria-label="Connect YouTube channel"
                  title="Connect YouTube channel"
                  className="sm:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                >
                  <Youtube className="w-4 h-4 text-red-500" />
                </button>

                <button
                  type="button"
                  onClick={onOpenAppearance}
                  aria-label="Language, Voice & Theme settings"
                  title="Language, Voice & Theme settings"
                  className="sm:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                >
                  <Palette className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {speakingId && (
                  <button
                    type="button"
                    onClick={onStopSpeaking}
                    aria-label="Stop Audio"
                    className="min-h-[44px] md:min-h-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--surface-bg)',
                      borderColor: 'var(--surface-border)',
                    }}
                  >
                    <Square className="w-3 h-3" />
                    <span className="hidden sm:inline">Stop Audio</span>
                  </button>
                )}

                {isGenerating ? (
                  <button
                    type="button"
                    onClick={onStopGeneration}
                    className="min-h-[44px] md:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                    }}
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!draftInput.trim() && !attachedVideo}
                    aria-label="Send message"
                    className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 inline-flex items-center justify-center gap-1.5 px-3.5 md:px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-opacity disabled:opacity-40 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-fg)',
                    }}
                  >
                    <Send className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                )}
              </div>
            </div>
          </form>

          <p
            className="hidden sm:block text-[11px] text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            Voice commands: &ldquo;New page&rdquo;, &ldquo;Switch to Hindi&rdquo;, &ldquo;English&rdquo;, &ldquo;Voice reply on/off&rdquo;, &ldquo;Boy/Girl voice&rdquo;, &ldquo;Open YouTube&rdquo;.
          </p>
        </div>
      </footer>
    </div>
  );
}
