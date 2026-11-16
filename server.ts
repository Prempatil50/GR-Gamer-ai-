import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: 'v1beta',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function cleanTextForSpeech(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, ' Code block omitted. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/[#>*_~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2800);
}

const LANGUAGE_DIRECTIVES: Record<string, { label: string; chatRule: string }> = {
  auto: {
    label: 'Auto (English, Hindi, or Hinglish)',
    chatRule:
      'Detect and respond in the language the user uses (including English, Hindi, or Hinglish).',
  },
  en: {
    label: 'English',
    chatRule: 'Always respond clearly in English.',
  },
  hi: {
    label: 'Hindi (हिन्दी)',
    chatRule:
      'Always respond clearly in Hindi (using Devanagari script, natural everyday Hindi). Keep code snippets in standard code syntax when writing code.',
  },
  hinglish: {
    label: 'Hinglish',
    chatRule:
      'Always respond in natural Hinglish (conversational Hindi written in Roman/English letters mixed with everyday English words, e.g., "Aap isko aise try kar sakte hain").',
  },
  bn: {
    label: 'Bengali (বাংলা)',
    chatRule: 'Always respond clearly and naturally in Bengali (বাংলা).',
  },
  mr: {
    label: 'Marathi (मराठी)',
    chatRule: 'Always respond clearly and naturally in Marathi (मराठी).',
  },
  ta: {
    label: 'Tamil (தமிழ்)',
    chatRule: 'Always respond clearly and naturally in Tamil (தமிழ்).',
  },
  te: {
    label: 'Telugu (తెలుగు)',
    chatRule: 'Always respond clearly and naturally in Telugu (తెలుగు).',
  },
  gu: {
    label: 'Gujarati (ગુજરાતી)',
    chatRule: 'Always respond clearly and naturally in Gujarati (ગુજરાતી).',
  },
  pa: {
    label: 'Punjabi (ਪੰਜਾਬੀ)',
    chatRule: 'Always respond clearly and naturally in Punjabi (ਪੰਜਾਬੀ).',
  },
  ur: {
    label: 'Urdu (اردو)',
    chatRule: 'Always respond clearly and naturally in Urdu (اردو).',
  },
  es: {
    label: 'Spanish (Español)',
    chatRule: 'Always respond clearly and naturally in Spanish.',
  },
  fr: {
    label: 'French (Français)',
    chatRule: 'Always respond clearly and naturally in French.',
  },
  ar: {
    label: 'Arabic (العربية)',
    chatRule: 'Always respond clearly and naturally in Arabic.',
  },
};

function parseGeminiError(error: unknown): {
  isRateLimit: boolean;
  isDailyQuota: boolean;
  isBadRequest: boolean;
  retryDelayMs: number | null;
  friendlyMessage: string;
} {
  const raw = error instanceof Error ? error.message : String(error || 'Unknown AI error.');
  let extracted = raw;

  // Unwrap nested JSON error payloads returned by @google/genai
  for (let depth = 0; depth < 3; depth++) {
    const trimmed = extracted.trim();
    if (!trimmed.startsWith('{')) break;
    try {
      const parsed = JSON.parse(trimmed) as { error?: { message?: string }; message?: string };
      const inner = parsed?.error?.message || parsed?.message;
      if (typeof inner === 'string' && inner.trim()) {
        extracted = inner;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  const lower = `${raw} ${extracted}`.toLowerCase();
  const isRateLimit =
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests');
  const isDailyQuota =
    lower.includes('perday') ||
    lower.includes('per day') ||
    lower.includes('requests_per_day') ||
    /retry in \d+h/i.test(extracted);
  const isBadRequest =
    lower.includes('400') ||
    lower.includes('invalid_argument') ||
    lower.includes('not supported');

  let retryDelayMs: number | null = null;
  const secMatch =
    extracted.match(/retry in (\d+(?:\.\d+)?)s\b/i) ||
    raw.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
  if (secMatch?.[1]) {
    const secs = Number(secMatch[1]);
    if (Number.isFinite(secs) && secs > 0) {
      retryDelayMs = Math.ceil(secs * 1000);
    }
  }

  if (isRateLimit) {
    const retryMatch = extracted.match(/Please retry in ([^.\n]+)/i);
    const retryHint = retryMatch?.[1] ? ` Retry in ${retryMatch[1].replace(/\.\d+s/, 's')}.` : '';
    return {
      isRateLimit: true,
      isDailyQuota,
      isBadRequest: false,
      retryDelayMs,
      friendlyMessage: isDailyQuota
        ? `Free Tier daily request limit reached.${retryHint} Switch to a billing-enabled API key in Settings > Secrets for higher limits, or try again later.`
        : `AI service is temporarily busy due to rate limits.${retryHint} Please wait a few seconds and try again.`,
    };
  }

  if (lower.includes('permission_denied') || lower.includes('api_key_invalid') || lower.includes('403')) {
    return {
      isRateLimit: false,
      isDailyQuota: false,
      isBadRequest: false,
      retryDelayMs: null,
      friendlyMessage: 'Gemini API key is missing or invalid. Please check GEMINI_API_KEY in Settings > Secrets.',
    };
  }

  return {
    isRateLimit: false,
    isDailyQuota: false,
    isBadRequest,
    retryDelayMs: null,
    friendlyMessage: extracted.split('\n')[0].slice(0, 260) || 'Failed to generate AI response.',
  };
}

function compactChatHistory(
  messages: Array<{ role: 'user' | 'model'; content: string }>
): Array<{ role: 'user' | 'model'; content: string }> {
  const recent = messages
    .filter((m) => typeof m.content === 'string' && m.content.trim().length > 0)
    .slice(-14);

  if (recent.length <= 2) return recent;

  const totalOlderBudget = 20_000;
  let usedOlderChars = 0;
  const result: Array<{ role: 'user' | 'model'; content: string }> = [];

  // Always preserve the latest 2 turns cleanly, trim older turns to avoid TPM spikes
  const splitIdx = Math.max(0, recent.length - 2);
  const olderReversed = recent.slice(0, splitIdx).reverse();
  const keptOlder: Array<{ role: 'user' | 'model'; content: string }> = [];

  for (const msg of olderReversed) {
    const trimmed = msg.content.trim().slice(0, 3000);
    if (usedOlderChars + trimmed.length > totalOlderBudget && keptOlder.length > 0) {
      break;
    }
    usedOlderChars += trimmed.length;
    keptOlder.push({ role: msg.role, content: trimmed });
  }

  result.push(...keptOlder.reverse(), ...recent.slice(splitIdx));
  return result;
}

async function sleepWithAbort(ms: number, isClosed: () => boolean, onTick?: () => void) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (isClosed()) return;
    const chunk = Math.min(1500, deadline - Date.now());
    await new Promise((r) => setTimeout(r, chunk));
    onTick?.();
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  const chatModelCooldownUntil = new Map<string, number>();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  const rawVideoParser = express.raw({
    type: ['video/*', 'application/octet-stream'],
    limit: '105mb',
  });

  app.post(
    '/api/video/upload',
    (req, res, next) => {
      rawVideoParser(req, res, (err) => {
        if (err) {
          const status = (err as { status?: number }).status;
          const type = (err as { type?: string }).type;
          if (status === 413 || type === 'entity.too.large') {
            res.status(413).json({
              error: 'Video file is too large. Please upload a video smaller than 100MB.',
            });
            return;
          }
          res.status(400).json({
            error: err instanceof Error ? err.message : 'Invalid video upload payload.',
          });
          return;
        }
        next();
      });
    },
    async (req, res) => {
      let clientClosed = false;
      res.on('close', () => {
        if (!res.writableEnded) {
          clientClosed = true;
        }
      });

      const ai = getGeminiClient();
      let uploadedFileName: string | null = null;

      try {
        const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        if (buffer.length === 0) {
          res.status(400).json({ error: 'No video file data received.' });
          return;
        }

        const maxBytes = 100 * 1024 * 1024;
        if (buffer.length > maxBytes) {
          res.status(413).json({
            error: 'Video file is too large. Please upload a video smaller than 100MB.',
          });
          return;
        }

        const rawContentType =
          typeof req.headers['content-type'] === 'string'
            ? req.headers['content-type'].split(';')[0].trim()
            : '';
        const safeMime = rawContentType.startsWith('video/') ? rawContentType : 'video/mp4';

        const rawFileNameHeader =
          typeof req.headers['x-file-name'] === 'string' ? req.headers['x-file-name'] : '';
        let decodedName = 'uploaded-video.mp4';
        if (rawFileNameHeader) {
          try {
            decodedName = decodeURIComponent(rawFileNameHeader);
          } catch {
            decodedName = rawFileNameHeader;
          }
        }
        const displayName = decodedName.slice(0, 120) || 'uploaded-video.mp4';

        const videoBlob = new Blob([buffer as unknown as BlobPart], { type: safeMime });
        let uploaded = await ai.files.upload({
          file: videoBlob,
          config: {
            mimeType: safeMime,
            displayName,
          },
        });

        uploadedFileName = uploaded.name || null;
        let attempts = 0;
        while (uploaded.state === 'PROCESSING' && attempts < 80 && uploaded.name && !clientClosed) {
          await new Promise((r) => setTimeout(r, 1500));
          if (clientClosed) break;
          uploaded = await ai.files.get({ name: uploaded.name });
          attempts++;
        }

        if (clientClosed) {
          if (uploadedFileName) {
            ai.files.delete({ name: uploadedFileName }).catch(() => {});
          }
          return;
        }

        if (uploaded.state === 'PROCESSING') {
          if (uploadedFileName) {
            ai.files.delete({ name: uploadedFileName }).catch(() => {});
          }
          res.status(504).json({
            error: 'Video processing took too long. Please try a shorter or smaller clip.',
          });
          return;
        }

        if (uploaded.state === 'FAILED' || !uploaded.uri) {
          if (uploadedFileName) {
            ai.files.delete({ name: uploadedFileName }).catch(() => {});
          }
          res.status(422).json({
            error: 'Video processing failed. Please try a different MP4 or WebM clip.',
          });
          return;
        }

        res.json({
          fileUri: uploaded.uri,
          fileName: uploaded.name,
          mimeType: uploaded.mimeType || safeMime,
        });
      } catch (error) {
        if (uploadedFileName) {
          ai.files.delete({ name: uploadedFileName }).catch(() => {});
        }
        const info = parseGeminiError(error);
        if (!clientClosed) {
          res.status(info.isRateLimit ? 429 : 500).json({ error: info.friendlyMessage });
        }
      }
    }
  );

  app.post('/api/chat/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let clientClosed = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        clientClosed = true;
      }
    });

    let uploadedFileName: string | null = null;
    const ai = getGeminiClient();

    try {
      const {
        messages,
        systemInstruction,
        uploadedVideo,
        videoAttachment,
        enableUrlContext,
        preferredLanguage,
      } = req.body as {
        messages?: Array<{ role: 'user' | 'model'; content: string }>;
        systemInstruction?: string;
        uploadedVideo?: { fileUri: string; fileName?: string; mimeType?: string };
        videoAttachment?: { base64: string; mimeType: string; fileName?: string };
        enableUrlContext?: boolean;
        preferredLanguage?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.write(`data: ${JSON.stringify({ error: 'Messages array is required.' })}\n\n`);
        res.end();
        return;
      }

      const validMessages = compactChatHistory(messages);
      if (validMessages.length === 0) {
        res.write(`data: ${JSON.stringify({ error: 'Please enter a message.' })}\n\n`);
        res.end();
        return;
      }

      const contents: Array<{
        role: string;
        parts: Array<{
          text?: string;
          fileData?: { fileUri: string; mimeType: string };
          inlineData?: { data: string; mimeType: string };
        }>;
      }> = validMessages.map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      if (uploadedVideo?.fileUri && contents.length > 0) {
        uploadedFileName = uploadedVideo.fileName || null;
        const lastIdx = contents.length - 1;
        contents[lastIdx] = {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: uploadedVideo.fileUri,
                mimeType: uploadedVideo.mimeType || 'video/mp4',
              },
            },
            ...contents[lastIdx].parts,
          ],
        };
      } else if (videoAttachment?.base64 && videoAttachment?.mimeType && contents.length > 0) {
        const cleanBase64 = videoAttachment.base64.includes(',')
          ? videoAttachment.base64.split(',')[1]
          : videoAttachment.base64;
        const buffer = Buffer.from(cleanBase64, 'base64');

        if (buffer.length > 100 * 1024 * 1024) {
          res.write(
            `data: ${JSON.stringify({ error: 'Video file is too large. Please upload a video smaller than 100MB.' })}\n\n`
          );
          res.end();
          return;
        }

        const safeMime = videoAttachment.mimeType.split(';')[0] || 'video/mp4';
        const videoBlob = new Blob([buffer], { type: safeMime });
        let uploaded = await ai.files.upload({
          file: videoBlob,
          config: {
            mimeType: safeMime,
            displayName: (videoAttachment.fileName || 'uploaded-video.mp4').slice(0, 120),
          },
        });

        uploadedFileName = uploaded.name || null;
        let attempts = 0;
        while (uploaded.state === 'PROCESSING' && attempts < 80 && uploaded.name) {
          await new Promise((r) => setTimeout(r, 1500));
          uploaded = await ai.files.get({ name: uploaded.name });
          attempts++;
        }

        if (uploaded.state === 'FAILED' || !uploaded.uri) {
          throw new Error('Video processing failed. Please try a shorter MP4 or WebM clip.');
        }

        const lastIdx = contents.length - 1;
        contents[lastIdx] = {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: uploaded.uri,
                mimeType: uploaded.mimeType || safeMime,
              },
            },
            ...contents[lastIdx].parts,
          ],
        };
      }

      const defaultInstruction =
        'You are Aurora, a helpful, intelligent, and clear conversational AI assistant. Respond concisely and accurately. Format structured explanations cleanly with Markdown.';
      const baseInstruction =
        systemInstruction && systemInstruction.trim().length > 0
          ? systemInstruction.trim()
          : defaultInstruction;
      const langDirective =
        LANGUAGE_DIRECTIVES[preferredLanguage || 'auto']?.chatRule ||
        LANGUAGE_DIRECTIVES.auto.chatRule;

      const fullSystemInstruction = `${baseInstruction}\n\nLanguage preference: ${langDirective}`;

      type ToolSet = Array<{ urlContext?: Record<string, never>; googleSearch?: Record<string, never> }>;
      const toolProfiles: Array<ToolSet | undefined> = enableUrlContext
        ? [[{ urlContext: {} }, { googleSearch: {} }], [{ urlContext: {} }], undefined]
        : [undefined];

      const chatModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
      const now = Date.now();
      let sentAnyChunk = false;
      let lastErrorInfo: ReturnType<typeof parseGeminiError> | null = null;

      const runModelStream = async (model: string, tools?: ToolSet) => {
        const modelConfig: {
          systemInstruction: string;
          tools?: ToolSet;
          thinkingConfig?: { thinkingLevel: ThinkingLevel };
        } = {
          systemInstruction: fullSystemInstruction,
        };
        if (model === 'gemini-4-hydrogen') {
          modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }
        if (tools) {
          modelConfig.tools = tools;
        }

        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: modelConfig,
        });

        for await (const chunk of stream) {
          if (clientClosed) return;
          if (chunk.text) {
            sentAnyChunk = true;
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
      };

      const attemptModelWithToolFallback = async (model: string) => {
        let modelLastErr: unknown = null;
        for (const tools of toolProfiles) {
          if (clientClosed) return;
          try {
            await runModelStream(model, tools);
            return;
          } catch (err) {
            modelLastErr = err;
            const info = parseGeminiError(err);
            // Never retry lighter tools on a model whose daily quota is exhausted
            if (info.isDailyQuota) {
              throw err;
            }
            // On primary model rate-limit, fail over to the next model with tools intact first
            if (info.isRateLimit && model !== 'gemini-3.1-flash-lite') {
              throw err;
            }
            // On 400 or fallback-model tool rate-limit before streaming, try lighter tool profile
            if (tools && !sentAnyChunk && (info.isBadRequest || info.isRateLimit)) {
              continue;
            }
            throw err;
          }
        }
        throw modelLastErr;
      };

      // Build ordered execution plan: try non-cooled models first, then retry fallback model with backoff if needed
      const activeModels = chatModels.filter((m) => now >= (chatModelCooldownUntil.get(m) || 0));
      const candidateModels: string[] =
        activeModels.length > 0 ? [...activeModels] : ['gemini-3.1-flash-lite'];

      for (const model of candidateModels) {
        if (clientClosed) break;

        // Allow up to 2 short automatic retries on gemini-3.1-flash-lite for transient RPM bursts
        const maxAttempts = model === 'gemini-3.1-flash-lite' ? 3 : 1;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          if (clientClosed) break;
          try {
            await attemptModelWithToolFallback(model);
            if (!clientClosed) {
              res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
              res.end();
            }
            return;
          } catch (modelErr) {
            const info = parseGeminiError(modelErr);
            lastErrorInfo = info;

            if (!sentAnyChunk && info.isRateLimit) {
              if (info.isDailyQuota) {
                chatModelCooldownUntil.set(model, Date.now() + 10 * 60_000);
                break; // Switch to next model immediately
              }

              if (attempt < maxAttempts) {
                const defaultBackoff = attempt === 1 ? 1800 : 3800;
                const waitMs =
                  info.retryDelayMs && info.retryDelayMs <= 12_000
                    ? Math.max(1200, info.retryDelayMs + 400)
                    : defaultBackoff;

                if (!clientClosed) {
                  res.write(
                    `data: ${JSON.stringify({
                      status: `AI service is busy, retrying automatically in ${Math.ceil(waitMs / 1000)}s...`,
                    })}\n\n`
                  );
                }

                await sleepWithAbort(waitMs, () => clientClosed, () => {
                  if (!clientClosed) res.write(': keepalive\n\n');
                });
                continue;
              }

              // Short 15s cooldown only for primary model when transient burst happens
              if (model !== 'gemini-3.1-flash-lite') {
                chatModelCooldownUntil.set(model, Date.now() + 15_000);
              }
              break;
            }

            throw modelErr;
          }
        }
      }

      if (!clientClosed) {
        res.write(
          `data: ${JSON.stringify({
            error:
              lastErrorInfo?.friendlyMessage ||
              'AI service is temporarily busy due to rate limits. Please wait a few seconds and try again.',
          })}\n\n`
        );
        res.end();
      }
    } catch (error) {
      const info = parseGeminiError(error);
      if (!clientClosed) {
        res.write(`data: ${JSON.stringify({ error: info.friendlyMessage })}\n\n`);
        res.end();
      }
    } finally {
      if (uploadedFileName) {
        ai.files.delete({ name: uploadedFileName }).catch(() => {});
      }
    }
  });

  const ttsCache = new Map<string, string>();
  const modelCooldownUntil = new Map<string, number>();

  const VOICE_STYLE_MAP: Record<string, string> = {
    Charon: 'Natural, warm, clear young adult male speaker with an authentic human voice',
    Puck: 'Natural, energetic, friendly young male speaker with an authentic human voice',
    Fenrir: 'Deep, calm, confident male speaker with a natural human voice',
    Orus: 'Crisp, steady, natural male conversational speaker',
    Kore: 'Warm, clear, natural female speaker with an authentic human voice',
    Zephyr: 'Bright, friendly, conversational female speaker with a natural human voice',
  };

  app.post('/api/audio/tts', async (req, res) => {
    try {
      const { text, voiceName, preferredLanguage } = req.body as {
        text?: string;
        voiceName?: string;
        preferredLanguage?: string;
      };
      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Text is required for speech synthesis.' });
        return;
      }

      const allowedVoices = ['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir', 'Orus'];
      const selectedVoice = allowedVoices.includes(voiceName || '') ? voiceName! : 'Kore';
      const selectedLang = LANGUAGE_DIRECTIVES[preferredLanguage || 'auto']
        ? (preferredLanguage as string)
        : 'auto';
      const spokenText = cleanTextForSpeech(text);
      if (!spokenText) {
        res.status(400).json({ error: 'No speakable text found.' });
        return;
      }

      const cacheKey = `${selectedVoice}::${selectedLang}::${spokenText}`;
      const cachedAudio = ttsCache.get(cacheKey);
      if (cachedAudio) {
        res.json({ audioBase64: cachedAudio, mimeType: 'audio/wav', cached: true, source: 'gemini' });
        return;
      }

      const ai = getGeminiClient();
      const ttsModels = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
      const now = Date.now();
      let lastRateLimit = false;
      const langLabel = LANGUAGE_DIRECTIVES[selectedLang]?.label || 'the spoken text language';

      for (const model of ttsModels) {
        const cooldown = modelCooldownUntil.get(model) || 0;
        if (now < cooldown) {
          lastRateLimit = true;
          continue;
        }

        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: spokenText,
                    speechMetadata: {
                      style: `${
                        VOICE_STYLE_MAP[selectedVoice] ||
                        'Clear, natural, authentic human conversational voice'
                      }, speaking naturally in ${langLabel}`,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedVoice },
                },
              },
            },
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            if (ttsCache.size >= 100) {
              const oldestKey = ttsCache.keys().next().value;
              if (oldestKey) ttsCache.delete(oldestKey);
            }
            ttsCache.set(cacheKey, base64Audio);
            res.json({
              audioBase64: base64Audio,
              mimeType: 'audio/wav',
              model,
              source: 'gemini',
            });
            return;
          }
        } catch (modelErr) {
          const msg = modelErr instanceof Error ? modelErr.message : String(modelErr);
          const isRateLimit =
            msg.includes('429') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.toLowerCase().includes('quota');

          if (isRateLimit) {
            lastRateLimit = true;
            modelCooldownUntil.set(model, Date.now() + 36_000);
            continue;
          }
        }
      }

      res.json({
        fallback: true,
        rateLimited: lastRateLimit,
        source: 'browser',
      });
    } catch {
      res.json({ fallback: true, source: 'browser' });
    }
  });

  app.post('/api/audio/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType, preferredLanguage } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        preferredLanguage?: string;
      };
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json({ error: 'Audio data is required.' });
        return;
      }

      const langLabel =
        LANGUAGE_DIRECTIVES[preferredLanguage || 'auto']?.label ||
        'English, Hindi, or Hinglish';

      const ai = getGeminiClient();
      const transcribeModels = ['gemini-3.5-transcribe', 'gemini-3.1-flash-lite'];
      let lastTranscribeError: ReturnType<typeof parseGeminiError> | null = null;

      for (const model of transcribeModels) {
        const maxAttempts = model === 'gemini-3.1-flash-lite' ? 2 : 1;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType || 'audio/webm',
                      data: audioBase64,
                    },
                  },
                  {
                    text: `Transcribe this spoken audio accurately. Expected language: ${langLabel}. Return only the spoken words without extra commentary.`,
                  },
                ],
              },
            });

            res.json({ transcript: (response.text || '').trim() });
            return;
          } catch (modelErr) {
            const info = parseGeminiError(modelErr);
            lastTranscribeError = info;
            if (info.isRateLimit) {
              if (!info.isDailyQuota && attempt < maxAttempts) {
                const waitMs =
                  info.retryDelayMs && info.retryDelayMs <= 6000
                    ? Math.max(1000, info.retryDelayMs + 300)
                    : 1800;
                await new Promise((r) => setTimeout(r, waitMs));
                continue;
              }
              break;
            }
            throw modelErr;
          }
        }
      }

      res.status(429).json({
        error: lastTranscribeError?.friendlyMessage || 'Voice transcription temporarily unavailable.',
      });
    } catch (error) {
      const info = parseGeminiError(error);
      res.status(info.isRateLimit ? 429 : 500).json({ error: info.friendlyMessage });
    }
  });

  app.post('/api/youtube/connect', async (req, res) => {
    try {
      const { channelInput } = req.body as { channelInput?: string };
      const raw = (channelInput || '').trim();
      if (!raw) {
        res.status(400).json({ error: 'Please enter a YouTube @handle, channel URL, or channel ID.' });
        return;
      }

      let targetUrl = '';
      let directChannelId = '';
      let parsedHandle = '';

      if (/^UC[a-zA-Z0-9_-]{20,}$/.test(raw)) {
        directChannelId = raw;
        targetUrl = `https://www.youtube.com/channel/${raw}`;
      } else if (/^@?[a-zA-Z0-9._-]{3,80}$/.test(raw) && !raw.includes('http')) {
        parsedHandle = raw.startsWith('@') ? raw : `@${raw}`;
        targetUrl = `https://www.youtube.com/${parsedHandle}`;
      } else {
        try {
          const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
          const host = parsed.hostname.toLowerCase();
          if (host !== 'youtube.com' && host !== 'www.youtube.com' && host !== 'm.youtube.com') {
            res.status(400).json({ error: 'Please enter a valid youtube.com channel URL or @handle.' });
            return;
          }
          const channelMatch = parsed.pathname.match(/^\/channel\/(UC[a-zA-Z0-9_-]{20,})/);
          if (channelMatch) {
            directChannelId = channelMatch[1];
          }
          const handleMatch = parsed.pathname.match(/^\/(@[a-zA-Z0-9._-]+)/);
          if (handleMatch) {
            parsedHandle = handleMatch[1];
          }
          targetUrl = `https://www.youtube.com${parsed.pathname}`;
        } catch {
          res.status(400).json({ error: 'Invalid YouTube channel URL or @handle.' });
          return;
        }
      }

      const decodeHtml = (s: string) =>
        s
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');

      const pageResp = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!pageResp.ok) {
        res.status(404).json({ error: 'YouTube channel not found. Check the @handle or URL and try again.' });
        return;
      }

      const html = await pageResp.text();
      const idMatch =
        html.match(/"externalId":"(UC[a-zA-Z0-9_-]{20,})"/) ||
        html.match(/channel_id=(UC[a-zA-Z0-9_-]{20,})/) ||
        html.match(/"browseId":"(UC[a-zA-Z0-9_-]{20,})"/);

      const channelId = directChannelId || idMatch?.[1] || '';
      if (!channelId) {
        res.status(404).json({ error: 'Could not resolve channel ID from that YouTube page.' });
        return;
      }

      const titleMatch =
        html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
        html.match(/<title>([^<]+)<\/title>/i);
      const avatarMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
      const handleInHtml = html.match(/"vanityChannelUrl":"https?:\/\/www\.youtube\.com\/(@[^"]+)"/);

      let title = decodeHtml((titleMatch?.[1] || '').replace(/ - YouTube$/i, '').trim()) || channelId;
      const avatarUrl = (avatarMatch?.[1] || '').slice(0, 500);
      const description = decodeHtml((descMatch?.[1] || '').trim()).slice(0, 1000);
      const handle = (parsedHandle || handleInHtml?.[1] || '').slice(0, 100);
      const channelUrl = `https://www.youtube.com/channel/${channelId}`;

      const recentVideos: Array<{
        videoId: string;
        title: string;
        url: string;
        publishedAt: string;
      }> = [];

      try {
        const feedResp = await fetch(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`
        );
        if (feedResp.ok) {
          const xml = await feedResp.text();
          const feedAuthor = xml.match(/<author>\s*<name>([^<]+)<\/name>/);
          if (feedAuthor && title === channelId) {
            title = decodeHtml(feedAuthor[1].trim());
          }
          const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
          for (const entry of entries.slice(0, 10)) {
            const vid = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
            const vTitle = entry.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
            const vPub = entry.match(/<published>([^<]+)<\/published>/)?.[1]?.trim();
            if (vid && vTitle) {
              recentVideos.push({
                videoId: vid,
                title: decodeHtml(vTitle).slice(0, 160),
                url: `https://www.youtube.com/watch?v=${vid}`,
                publishedAt: vPub || '',
              });
            }
          }
        }
      } catch {
        // RSS feed fetch optional
      }

      res.json({
        channel: {
          channelId,
          title: title.slice(0, 160),
          handle,
          channelUrl: channelUrl.slice(0, 500),
          avatarUrl,
          description,
          recentVideos,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect YouTube channel.';
      console.error('YouTube connect error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurora AI Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
