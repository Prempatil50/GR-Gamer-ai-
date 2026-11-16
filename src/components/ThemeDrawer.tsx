import { Check, Languages, Mic, Palette, Volume2, X } from 'lucide-react';
import { THEME_PRESETS, type ThemePresetId } from '../lib/themes';
import {
  DEFAULT_VOICE_BY_GENDER,
  getLanguageOption,
  getVoiceGender,
  LANGUAGE_OPTIONS,
  VOICE_OPTIONS,
  type LanguageCode,
  type VoiceGender,
  type VoiceName,
} from '../lib/opportunities';

interface ThemeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  themePreset: ThemePresetId;
  customBgColor: string;
  preferredLanguage: LanguageCode;
  voiceReplyEnabled: boolean;
  voiceName: VoiceName;
  voiceAutoSend: boolean;
  onSelectTheme: (preset: ThemePresetId, customHex?: string) => void;
  onSelectLanguage: (lang: LanguageCode) => void;
  onToggleVoiceReply: (enabled: boolean) => void;
  onSelectVoiceName: (voice: VoiceName) => void;
  onToggleVoiceAutoSend: (enabled: boolean) => void;
  onStartVoiceCommand: () => void;
  onTestVoice: (voice: VoiceName) => void;
}

export function ThemeDrawer({
  isOpen,
  onClose,
  themePreset,
  customBgColor,
  preferredLanguage,
  voiceReplyEnabled,
  voiceName,
  voiceAutoSend,
  onSelectTheme,
  onSelectLanguage,
  onToggleVoiceReply,
  onSelectVoiceName,
  onToggleVoiceAutoSend,
  onStartVoiceCommand,
  onTestVoice,
}: ThemeDrawerProps) {
  if (!isOpen) return null;

  const activeGender: VoiceGender = getVoiceGender(voiceName);
  const currentLang = getLanguageOption(preferredLanguage);

  const handleSelectGender = (gender: VoiceGender) => {
    const currentMatches = getVoiceGender(voiceName) === gender;
    if (!currentMatches) {
      onSelectVoiceName(DEFAULT_VOICE_BY_GENDER[gender]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-stretch justify-center md:justify-end bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <aside
        className="w-full md:max-w-md max-h-[88dvh] md:max-h-none md:h-full overflow-y-auto p-5 md:p-6 pb-safe rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l flex flex-col justify-between"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--surface-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-7">
          <div className="md:hidden w-10 h-1.5 rounded-full mx-auto -mt-1 mb-1 opacity-30 bg-current" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Palette className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <h2 className="text-lg font-semibold">Language, Voice & Theme</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close settings"
              className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-2 flex items-center justify-center rounded-xl md:rounded-lg transition-colors hover:opacity-75 cursor-pointer"
              style={{ backgroundColor: 'var(--surface-bg)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Language Option */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="text-sm font-semibold">Language</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Applies to AI replies, voice commands, and spoken voice replies.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((lang) => {
                const selected = preferredLanguage === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => onSelectLanguage(lang.id)}
                    className="min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-bg)',
                      borderColor: selected
                        ? 'var(--accent-primary)'
                        : 'var(--surface-border)',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {lang.nativeLabel}
                      </div>
                      <div
                        className="text-[11px] truncate"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {lang.label}
                      </div>
                    </div>
                    {selected && (
                      <Check
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: 'var(--accent-primary)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Voice Reply Option */}
          <section className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <h3 className="text-sm font-semibold">Voice Reply</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Automatically speak AI replies aloud ({currentLang.nativeLabel})
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={voiceReplyEnabled}
                onClick={() => onToggleVoiceReply(!voiceReplyEnabled)}
                className="w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0"
                style={{
                  backgroundColor: voiceReplyEnabled
                    ? 'var(--accent-primary)'
                    : 'var(--surface-border)',
                }}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    voiceReplyEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-medium block" style={{ color: 'var(--text-secondary)' }}>
                Voice Style (Girl / Boy)
              </label>
              <div
                className="grid grid-cols-2 gap-1 p-1 rounded-xl border"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  borderColor: 'var(--surface-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSelectGender('girl')}
                  className="min-h-[44px] md:min-h-0 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor:
                      activeGender === 'girl'
                        ? 'var(--accent-primary)'
                        : 'transparent',
                    color:
                      activeGender === 'girl'
                        ? 'var(--accent-fg)'
                        : 'var(--text-secondary)',
                  }}
                >
                  Girl Voice
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectGender('boy')}
                  className="min-h-[44px] md:min-h-0 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor:
                      activeGender === 'boy'
                        ? 'var(--accent-primary)'
                        : 'transparent',
                    color:
                      activeGender === 'boy'
                        ? 'var(--accent-fg)'
                        : 'var(--text-secondary)',
                  }}
                >
                  Boy Voice
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium block" style={{ color: 'var(--text-secondary)' }}>
                Voice Persona
              </label>
              <div className="grid grid-cols-1 gap-2">
                {VOICE_OPTIONS.filter((v) => v.gender === activeGender).map((v) => {
                  const selected = voiceName === v.id;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
                      style={{
                        backgroundColor: 'var(--surface-bg)',
                        borderColor: selected
                          ? 'var(--accent-primary)'
                          : 'var(--surface-border)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectVoiceName(v.id)}
                        className="flex-1 text-left cursor-pointer"
                      >
                        <div className="text-sm font-medium">
                          {v.label}{' '}
                          <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                            · {v.gender === 'girl' ? 'Girl' : 'Boy'}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {v.tone}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectVoiceName(v.id);
                          onTestVoice(v.id);
                        }}
                        className="min-h-[44px] md:min-h-[36px] px-3 py-1 rounded-lg md:rounded-md text-xs font-medium border cursor-pointer hover:opacity-80"
                        style={{ borderColor: 'var(--surface-border)' }}
                      >
                        Preview
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Voice Command Option */}
          <section className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <h3 className="text-sm font-semibold">Voice Command</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Auto-send spoken prompts right after you stop speaking
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={voiceAutoSend}
                onClick={() => onToggleVoiceAutoSend(!voiceAutoSend)}
                className="w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0"
                style={{
                  backgroundColor: voiceAutoSend
                    ? 'var(--accent-primary)'
                    : 'var(--surface-border)',
                }}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    voiceAutoSend ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div
              className="p-3 rounded-xl border space-y-2"
              style={{
                backgroundColor: 'var(--surface-bg)',
                borderColor: 'var(--surface-border)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">Supported Voice Commands</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartVoiceCommand();
                  }}
                  className="min-h-[44px] md:min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-fg)',
                  }}
                >
                  <Mic className="w-3 h-3" />
                  <span>Speak Now</span>
                </button>
              </div>
              <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <div>&ldquo;New page&rdquo; / &ldquo;Naya page&rdquo; — Create a new chat page</div>
                <div>&ldquo;Switch to Hindi&rdquo; / &ldquo;English&rdquo; / &ldquo;Hinglish&rdquo; — Change language</div>
                <div>&ldquo;Voice reply on&rdquo; / &ldquo;Voice reply off&rdquo; — Toggle spoken answers</div>
                <div>&ldquo;Girl voice&rdquo; / &ldquo;Boy voice&rdquo; — Switch AI voice style</div>
                <div>&ldquo;Open YouTube&rdquo; / &ldquo;Open opportunities&rdquo; — Open tools</div>
                <div>&ldquo;Dark background&rdquo; / &ldquo;Light background&rdquo; — Switch theme</div>
              </div>
            </div>
          </section>

          {/* Background Color Presets */}
          <section className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--surface-border)' }}>
            <div>
              <h3 className="text-sm font-semibold">Background Color Presets</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Contrast and ink tone adjust automatically for readability.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const active = themePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectTheme(preset.id)}
                    className="flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-bg)',
                      borderColor: active
                        ? 'var(--accent-primary)'
                        : 'var(--surface-border)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-lg border shrink-0"
                        style={{
                          backgroundColor: preset.bgHex,
                          borderColor: 'rgba(128,128,128,0.35)',
                        }}
                      />
                      <div>
                        <div className="text-sm font-medium">{preset.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {preset.description}
                        </div>
                      </div>
                    </div>
                    {active && (
                      <Check
                        className="w-4 h-4 shrink-0"
                        style={{ color: 'var(--accent-primary)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
            <div>
              <h3 className="text-sm font-semibold">Custom Background Color</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Pick any background hex color you prefer.
              </p>
            </div>

            <div
              className="flex items-center justify-between gap-3 p-3 rounded-xl border"
              style={{
                backgroundColor: 'var(--surface-bg)',
                borderColor:
                  themePreset === 'custom'
                    ? 'var(--accent-primary)'
                    : 'var(--surface-border)',
              }}
            >
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input
                  type="color"
                  value={customBgColor}
                  onChange={(e) => onSelectTheme('custom', e.target.value)}
                  className="w-9 h-9 rounded-lg border-0 bg-transparent cursor-pointer"
                />
                <div>
                  <div className="text-sm font-medium">Custom Color</div>
                  <div
                    className="text-xs font-mono uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {customBgColor}
                  </div>
                </div>
              </label>
              <button
                type="button"
                onClick={() => onSelectTheme('custom', customBgColor)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-fg)',
                }}
              >
                Apply
              </button>
            </div>
          </section>
        </div>

        <div className="pt-6 mt-6 border-t text-xs" style={{ borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}>
          Language, voice, and theme preferences sync automatically to Firebase.
        </div>
      </aside>
    </div>
  );
}
