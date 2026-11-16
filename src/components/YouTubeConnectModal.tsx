import { useState } from 'react';
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
  Youtube,
} from 'lucide-react';
import type { YouTubeChannel, YouTubeVideoItem } from '../lib/opportunities';

interface YouTubeConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: YouTubeChannel[];
  onConnectChannel: (channelInput: string) => Promise<void>;
  onDisconnectChannel: (channelId: string) => Promise<void>;
  onLaunchStrategy: (channel: YouTubeChannel) => Promise<void>;
  onAnalyzeVideo: (video: { title: string; url: string }) => Promise<void>;
}

function formatPublishedDate(raw: string): string {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function YouTubeConnectModal({
  isOpen,
  onClose,
  channels,
  onConnectChannel,
  onDisconnectChannel,
  onLaunchStrategy,
  onAnalyzeVideo,
}: YouTubeConnectModalProps) {
  const [channelInput, setChannelInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = channelInput.trim();
    if (!trimmed) {
      setError('Enter a YouTube @handle, channel URL, or UC channel ID.');
      return;
    }

    setError(null);
    setConnecting(true);
    try {
      await onConnectChannel(trimmed);
      setChannelInput('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to connect YouTube channel.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshChannel = async (channel: YouTubeChannel) => {
    setError(null);
    setRefreshingId(channel.channelId);
    try {
      await onConnectChannel(channel.handle || channel.channelId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to refresh channel feed.'
      );
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    setError(null);
    setDisconnectingId(channelId);
    try {
      await onDisconnectChannel(channelId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to disconnect channel.'
      );
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleAnalyzeCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = videoUrlInput.trim();
    if (!raw) return;

    const isValidYouTubeLink =
      /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(raw);
    if (!isValidYouTubeLink) {
      setError('Please enter a valid youtube.com or youtu.be video link.');
      return;
    }

    const normalizedUrl = raw.startsWith('http') ? raw : `https://${raw}`;
    setError(null);
    setVideoUrlInput('');
    onClose();
    await onAnalyzeVideo({
      title: 'YouTube Video Analysis',
      url: normalizedUrl,
    });
  };

  const handleAnalyzeRecent = async (video: YouTubeVideoItem) => {
    onClose();
    await onAnalyzeVideo({
      title: video.title,
      url: video.url,
    });
  };

  const handleLaunchCreatorStrategy = async (channel: YouTubeChannel) => {
    onClose();
    await onLaunchStrategy(channel);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90dvh] md:max-h-[88vh] overflow-y-auto rounded-t-3xl md:rounded-2xl border p-5 md:p-7 pb-safe space-y-6"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--surface-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden w-10 h-1.5 rounded-full mx-auto -mt-1 mb-1 opacity-30 bg-current" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: 'var(--surface-bg)',
                borderColor: 'var(--surface-border)',
              }}
            >
              <Youtube className="w-5 h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight">
                YouTube Channel Connect
              </h2>
              <p
                className="text-xs md:text-sm mt-0.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Connect your YouTube channel to pull recent uploads, brainstorm hooks, or analyze videos with AI.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close YouTube modal"
            className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-2 flex items-center justify-center rounded-xl md:rounded-lg cursor-pointer hover:opacity-75 shrink-0"
            style={{ backgroundColor: 'var(--surface-bg)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Connect Channel Form */}
        <form onSubmit={handleConnectSubmit} className="space-y-2.5">
          <label
            htmlFor="yt-channel-input"
            className="text-xs font-semibold block"
          >
            Connect a Channel (@handle, channel URL, or UC ID)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="yt-channel-input"
              type="text"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              placeholder="@YourChannel or https://youtube.com/@YourChannel"
              className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl border text-base md:text-sm outline-none"
              style={{
                backgroundColor: 'var(--surface-bg)',
                borderColor: 'var(--surface-border)',
              }}
            />
            <button
              type="submit"
              disabled={connecting}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-60 whitespace-nowrap"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-fg)',
              }}
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Youtube className="w-4 h-4" />
                  <span>Connect Channel</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl border text-xs sm:text-sm"
            style={{
              backgroundColor: 'var(--surface-bg)',
              borderColor: '#dc2626',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {/* Connected Channels List */}
        {channels.length > 0 ? (
          <div className="space-y-4">
            <div
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Connected Channels ({channels.length})
            </div>

            {channels.map((channel) => {
              const isRefreshing = refreshingId === channel.channelId;
              const isDisconnecting = disconnectingId === channel.channelId;
              const avatarBroken = failedAvatars[channel.channelId];

              return (
                <div
                  key={channel.channelId}
                  className="rounded-2xl border p-4 md:p-5 space-y-4"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderColor: 'var(--surface-border)',
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {channel.avatarUrl && !avatarBroken ? (
                        <img
                          src={channel.avatarUrl}
                          alt={channel.title}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedAvatars((prev) => ({
                              ...prev,
                              [channel.channelId]: true,
                            }))
                          }
                          className="w-12 h-12 rounded-full object-cover shrink-0 border"
                          style={{ borderColor: 'var(--surface-border)' }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-semibold text-base"
                          style={{
                            backgroundColor: 'var(--accent-primary)',
                            color: 'var(--accent-fg)',
                          }}
                        >
                          {channel.title.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm md:text-base truncate">
                            {channel.title}
                          </h3>
                          <a
                            href={channel.channelUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${channel.title} on YouTube`}
                            className="p-1 opacity-70 hover:opacity-100 shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <p
                          className="text-xs truncate"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {channel.handle || channel.channelId} ·{' '}
                          {channel.recentVideos.length} recent videos
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleLaunchCreatorStrategy(channel)}
                        className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer hover:opacity-90 whitespace-nowrap"
                        style={{
                          backgroundColor: 'var(--accent-primary)',
                          color: 'var(--accent-fg)',
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Channel Ideas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleRefreshChannel(channel)}
                        disabled={isRefreshing}
                        title="Refresh recent videos"
                        aria-label={`Refresh ${channel.title}`}
                        className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center px-2.5 py-2 rounded-xl text-xs border cursor-pointer hover:opacity-80 disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--surface-border)',
                        }}
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDisconnect(channel.channelId)}
                        disabled={isDisconnecting}
                        title="Disconnect channel"
                        aria-label={`Disconnect ${channel.title}`}
                        className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center px-2.5 py-2 rounded-xl text-xs border cursor-pointer hover:text-red-500 disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--surface-border)',
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {channel.description && (
                    <p
                      className="text-xs leading-relaxed line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {channel.description}
                    </p>
                  )}

                  {channel.recentVideos.length > 0 && (
                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
                      <div
                        className="text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Recent Uploads
                      </div>
                      <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
                        {channel.recentVideos.slice(0, 6).map((video) => (
                          <div
                            key={video.videoId}
                            className="py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex items-center gap-2.5">
                              <Play
                                className="w-3.5 h-3.5 shrink-0"
                                style={{ color: 'var(--accent-primary)' }}
                              />
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-medium truncate">
                                  {video.title}
                                </div>
                                {video.publishedAt && (
                                  <div
                                    className="text-[11px]"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    {formatPublishedDate(video.publishedAt)}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleAnalyzeRecent(video)}
                              className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer hover:opacity-85 shrink-0 whitespace-nowrap"
                              style={{
                                backgroundColor: 'var(--surface-elevated)',
                                borderColor: 'var(--surface-border)',
                              }}
                            >
                              <span>Analyze</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="rounded-2xl border p-5 text-center space-y-1.5"
            style={{
              backgroundColor: 'var(--surface-bg)',
              borderColor: 'var(--surface-border)',
            }}
          >
            <p className="text-sm font-medium">No YouTube channel connected yet</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Enter any public YouTube @handle (for example @GoogleDevelopers) or your own channel URL above.
            </p>
          </div>
        )}

        {/* Quick Analyze Any YouTube Video URL */}
        <form
          onSubmit={handleAnalyzeCustomUrl}
          className="pt-4 border-t space-y-2.5"
          style={{ borderColor: 'var(--surface-border)' }}
        >
          <label
            htmlFor="yt-video-url-input"
            className="text-xs font-semibold block"
          >
            Or Paste Any YouTube Video URL to Analyze
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="yt-video-url-input"
              type="url"
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl border text-base md:text-sm outline-none"
              style={{
                backgroundColor: 'var(--surface-bg)',
                borderColor: 'var(--surface-border)',
              }}
            />
            <button
              type="submit"
              disabled={!videoUrlInput.trim()}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium border cursor-pointer hover:opacity-85 disabled:opacity-45 whitespace-nowrap"
              style={{
                backgroundColor: 'var(--surface-bg)',
                borderColor: 'var(--surface-border)',
              }}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Analyze Video</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
