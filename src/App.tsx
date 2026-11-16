import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ChatWorkspace } from './components/ChatWorkspace';
import { LoginScreen } from './components/LoginScreen';
import { OpportunitiesModal } from './components/OpportunitiesModal';
import { Sidebar } from './components/Sidebar';
import { ThemeDrawer } from './components/ThemeDrawer';
import { YouTubeConnectModal } from './components/YouTubeConnectModal';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import {
  BUILT_IN_OPPORTUNITIES,
  getLanguageOption,
  type ChatMessage,
  type ChatPage,
  type LanguageCode,
  type OpportunityTemplate,
  type PageCategory,
  type UserProfile,
  type VideoAttachmentPayload,
  type VoiceName,
  type YouTubeChannel,
} from './lib/opportunities';
import { applyThemeToDocument, type ThemePresetId } from './lib/themes';

const LOCAL_THEME_KEY = 'aurora_theme_cache_v1';
const LOCAL_LANG_KEY = 'aurora_lang_cache_v1';

function getTimestampMillis(ts: unknown): number {
  if (!ts) return Date.now();
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts) {
    const fn = (ts as { toMillis?: () => number }).toMillis;
    if (typeof fn === 'function') return fn.call(ts);
  }
  return Date.now();
}

function readCachedTheme(): { preset: ThemePresetId; customHex: string } {
  try {
    const raw = localStorage.getItem(LOCAL_THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        preset?: ThemePresetId;
        customHex?: string;
      };
      return {
        preset: parsed.preset || 'alabaster',
        customHex: parsed.customHex || '#1E293B',
      };
    }
  } catch {
    // Ignore storage read failure
  }
  return { preset: 'alabaster', customHex: '#1E293B' };
}

function readCachedLanguage(): LanguageCode {
  try {
    const raw = localStorage.getItem(LOCAL_LANG_KEY);
    if (raw) return getLanguageOption(raw).id;
  } catch {
    // Ignore storage read failure
  }
  return 'auto';
}

export default function App() {
  const initialTheme = useMemo(() => readCachedTheme(), []);
  const initialLang = useMemo(() => readCachedLanguage(), []);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [themePreset, setThemePreset] = useState<ThemePresetId>(initialTheme.preset);
  const [customBgColor, setCustomBgColor] = useState<string>(initialTheme.customHex);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState<boolean>(false);
  const [voiceName, setVoiceName] = useState<VoiceName>('Kore');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>(initialLang);

  const [pages, setPages] = useState<ChatPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customOpportunities, setCustomOpportunities] = useState<OpportunityTemplate[]>([]);
  const [youtubeChannels, setYoutubeChannels] = useState<YouTubeChannel[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [opportunitiesOpen, setOpportunitiesOpen] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);

  const [draftInput, setDraftInput] = useState('');
  const [voiceAutoSend, setVoiceAutoSend] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activePageRef = useRef<ChatPage | null>(null);

  useEffect(() => {
    applyThemeToDocument(themePreset, customBgColor);
    try {
      localStorage.setItem(
        LOCAL_THEME_KEY,
        JSON.stringify({ preset: themePreset, customHex: customBgColor })
      );
    } catch {
      // Ignore storage write failure
    }
  }, [themePreset, customBgColor]);

  // Listen for Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setUserProfile(null);
        setPages([]);
        setActivePageId(null);
        setMessages([]);
        setCustomOpportunities([]);
        setYoutubeChannels([]);
      }
    });
    return () => unsub();
  }, []);

  // Sync UserProfile document on sign-in
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const uid = firebaseUser.uid;
    const userDocRef = doc(db, 'users', uid);

    let cancelled = false;
    async function ensureUserProfile() {
      try {
        const snap = await getDoc(userDocRef);
        if (cancelled) return;

        if (!snap.exists()) {
          const cached = readCachedTheme();
          const newProfile: UserProfile = {
            uid,
            displayName: (firebaseUser!.displayName || 'User').slice(0, 120),
            email: (firebaseUser!.email || 'user@example.com').slice(0, 254),
            photoURL: (firebaseUser!.photoURL || '').slice(0, 500),
            themePreset: cached.preset,
            customBgColor: /^#[0-9a-fA-F]{6}$/.test(cached.customHex)
              ? cached.customHex
              : '#1E293B',
            voiceReplyEnabled: false,
            voiceName: 'Kore',
            preferredLanguage: readCachedLanguage(),
            voiceAutoSend: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newProfile);
        } else {
          const data = snap.data() as UserProfile;
          const nextName = (firebaseUser!.displayName || data.displayName || 'User').slice(0, 120);
          const nextEmail = (firebaseUser!.email || data.email || 'user@example.com').slice(0, 254);
          const nextPhoto = (firebaseUser!.photoURL || data.photoURL || '').slice(0, 500);
          if (
            nextName !== data.displayName ||
            nextEmail !== data.email ||
            nextPhoto !== data.photoURL
          ) {
            await updateDoc(userDocRef, {
              displayName: nextName,
              email: nextEmail,
              photoURL: nextPhoto,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }
    }

    ensureUserProfile();

    const unsub = onSnapshot(
      userDocRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as UserProfile;
        setUserProfile(data);
        setThemePreset(data.themePreset || 'alabaster');
        setCustomBgColor(data.customBgColor || '#1E293B');
        setVoiceReplyEnabled(Boolean(data.voiceReplyEnabled));
        setVoiceName(data.voiceName || 'Kore');
        if (data.preferredLanguage) {
          setPreferredLanguage(getLanguageOption(data.preferredLanguage).id);
        }
        if (typeof data.voiceAutoSend === 'boolean') {
          setVoiceAutoSend(data.voiceAutoSend);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [authReady, firebaseUser]);

  // Listen to user's ChatPages
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;
    const pagesPath = `users/${uid}/pages`;
    const q = query(collection(db, pagesPath), where('ownerId', '==', uid));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatPage[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatPage, 'id'>),
        }));
        list.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return getTimestampMillis(b.updatedAt) - getTimestampMillis(a.updatedAt);
        });
        setPages(list);
        setActivePageId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev;
          return list.length > 0 ? list[0].id : null;
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, pagesPath);
      }
    );

    return () => unsub();
  }, [authReady, firebaseUser]);

  // Listen to user's Custom Opportunities
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;
    const oppsPath = `users/${uid}/opportunities`;
    const q = query(collection(db, oppsPath), where('ownerId', '==', uid));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: OpportunityTemplate[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<OpportunityTemplate, 'id'>),
        }));
        list.sort(
          (a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt)
        );
        setCustomOpportunities(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, oppsPath);
      }
    );

    return () => unsub();
  }, [authReady, firebaseUser]);

  // Listen to user's Connected YouTube Channels
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;
    const ytPath = `users/${uid}/youtubeChannels`;
    const q = query(collection(db, ytPath), where('ownerId', '==', uid));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: YouTubeChannel[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<YouTubeChannel, 'id'>),
        }));
        list.sort(
          (a, b) => getTimestampMillis(b.updatedAt) - getTimestampMillis(a.updatedAt)
        );
        setYoutubeChannels(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, ytPath);
      }
    );

    return () => unsub();
  }, [authReady, firebaseUser]);

  // Listen to Messages for activePageId
  useEffect(() => {
    if (!authReady || !firebaseUser || !activePageId) {
      setMessages([]);
      return;
    }

    const uid = firebaseUser.uid;
    const msgPath = `users/${uid}/pages/${activePageId}/messages`;
    const q = query(collection(db, msgPath), where('ownerId', '==', uid));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatMessage, 'id'>),
        }));
        list.sort(
          (a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt)
        );
        setMessages(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, msgPath);
      }
    );

    return () => unsub();
  }, [authReady, firebaseUser, activePageId]);

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId) || null,
    [pages, activePageId]
  );

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google Sign-In failed. Please try again.';
      setAuthError(msg);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleSelectTheme = useCallback(
    async (preset: ThemePresetId, customHex?: string) => {
      const nextCustomHex =
        customHex && /^#[0-9a-fA-F]{6}$/.test(customHex)
          ? customHex
          : customBgColor;

      setThemePreset(preset);
      if (customHex) setCustomBgColor(nextCustomHex);

      if (!firebaseUser) return;
      const uid = firebaseUser.uid;
      try {
        await updateDoc(doc(db, 'users', uid), {
          themePreset: preset,
          customBgColor: nextCustomHex,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    },
    [customBgColor, firebaseUser]
  );

  const handleToggleVoiceReply = useCallback(
    async (enabled: boolean) => {
      setVoiceReplyEnabled(enabled);
      if (!firebaseUser) return;
      const uid = firebaseUser.uid;
      try {
        await updateDoc(doc(db, 'users', uid), {
          voiceReplyEnabled: enabled,
          voiceName,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    },
    [firebaseUser, voiceName]
  );

  const handleSelectVoiceName = useCallback(
    async (voice: VoiceName) => {
      setVoiceName(voice);
      if (!firebaseUser) return;
      const uid = firebaseUser.uid;
      try {
        await updateDoc(doc(db, 'users', uid), {
          voiceReplyEnabled,
          voiceName: voice,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    },
    [firebaseUser, voiceReplyEnabled]
  );

  const handleSelectLanguage = useCallback(
    async (lang: LanguageCode) => {
      setPreferredLanguage(lang);
      try {
        localStorage.setItem(LOCAL_LANG_KEY, lang);
      } catch {
        // Ignore storage write failure
      }
      if (!firebaseUser) return;
      const uid = firebaseUser.uid;
      try {
        await updateDoc(doc(db, 'users', uid), {
          preferredLanguage: lang,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    },
    [firebaseUser]
  );

  const handleToggleVoiceAutoSend = useCallback(
    async (enabled: boolean) => {
      setVoiceAutoSend(enabled);
      if (!firebaseUser) return;
      const uid = firebaseUser.uid;
      try {
        await updateDoc(doc(db, 'users', uid), {
          voiceAutoSend: enabled,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    },
    [firebaseUser]
  );

  const createPage = useCallback(
    async (opts?: {
      title?: string;
      category?: PageCategory;
      systemInstruction?: string;
    }): Promise<ChatPage | null> => {
      if (!firebaseUser) return null;
      const uid = firebaseUser.uid;
      const pagesPath = `users/${uid}/pages`;

      const pagePayload = {
        ownerId: uid,
        title: (opts?.title || 'New Page').slice(0, 140),
        category: opts?.category || ('general' as PageCategory),
        systemInstruction: (
          opts?.systemInstruction ||
          BUILT_IN_OPPORTUNITIES[0].systemInstruction
        ).slice(0, 4000),
        pinned: false,
        messageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        const docRef = await addDoc(collection(db, pagesPath), pagePayload);
        const createdPage: ChatPage = {
          id: docRef.id,
          ...pagePayload,
        };
        activePageRef.current = createdPage;
        setActivePageId(docRef.id);
        setWorkspaceError(null);
        return createdPage;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, pagesPath);
      }
    },
    [firebaseUser]
  );

  const handleRenamePage = async (pageId: string, newTitle: string) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const path = `users/${uid}/pages/${pageId}`;
    try {
      await updateDoc(doc(db, path), {
        title: newTitle.trim().slice(0, 140),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleTogglePinPage = async (pageId: string, pinned: boolean) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const path = `users/${uid}/pages/${pageId}`;
    try {
      await updateDoc(doc(db, path), {
        pinned,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const msgPath = `users/${uid}/pages/${pageId}/messages`;
    const pagePath = `users/${uid}/pages/${pageId}`;

    try {
      const snap = await getDocs(
        query(collection(db, msgPath), where('ownerId', '==', uid))
      );
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, pagePath));
      if (activePageId === pageId) {
        const remaining = pages.filter((p) => p.id !== pageId);
        setActivePageId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, pagePath);
    }
  };

  const handleCreateCustomOpportunity = async (data: {
    title: string;
    description: string;
    category: Exclude<PageCategory, 'general'>;
    systemInstruction: string;
    starterPrompt: string;
  }) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const oppsPath = `users/${uid}/opportunities`;
    try {
      await addDoc(collection(db, oppsPath), {
        ownerId: uid,
        title: data.title.slice(0, 100),
        description: data.description.slice(0, 400),
        category: data.category,
        systemInstruction: data.systemInstruction.slice(0, 4000),
        starterPrompt: data.starterPrompt.slice(0, 1000),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, oppsPath);
    }
  };

  const handleDeleteCustomOpportunity = async (id: string) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const path = `users/${uid}/opportunities/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Voice assistant hook (declared after send handler ref so callbacks stay fresh)
  const sendMessageRef = useRef<
    ((
      content: string,
      usedVoice?: boolean,
      videoAttachment?: VideoAttachmentPayload,
      enableUrlContext?: boolean,
      pageOverride?: ChatPage
    ) => Promise<void>) | null
  >(null);

  const handleVoiceTranscript = useCallback(
    (transcript: string, autoSend: boolean) => {
      const normalized = transcript.trim().toLowerCase();

      if (/^(new page|create new page|naya page|new chat)$/.test(normalized)) {
        void createPage();
        return;
      }
      if (/^(open opportunities|new opportunities|opportunities)$/.test(normalized)) {
        setOpportunitiesOpen(true);
        return;
      }
      if (/^(open youtube|connect youtube|youtube channel)$/.test(normalized)) {
        setYoutubeOpen(true);
        return;
      }
      if (/^(dark background|dark mode|dark theme)$/.test(normalized)) {
        void handleSelectTheme('obsidian');
        return;
      }
      if (/^(light background|light mode|light theme)$/.test(normalized)) {
        void handleSelectTheme('alabaster');
        return;
      }
      if (/^(boy voice|switch to boy voice|male voice)$/.test(normalized)) {
        void handleSelectVoiceName('Charon');
        return;
      }
      if (/^(girl voice|switch to girl voice|female voice)$/.test(normalized)) {
        void handleSelectVoiceName('Kore');
        return;
      }
      if (/^(voice reply on|turn on voice reply|enable voice reply|awaz chalu karo)$/.test(normalized)) {
        void handleToggleVoiceReply(true);
        return;
      }
      if (/^(voice reply off|turn off voice reply|disable voice reply|awaz band karo)$/.test(normalized)) {
        void handleToggleVoiceReply(false);
        return;
      }
      if (/^(open settings|open language|language settings|voice settings)$/.test(normalized)) {
        setAppearanceOpen(true);
        return;
      }
      if (/^(switch to hindi|hindi language|hindi me bolo|hindi)$/.test(normalized)) {
        void handleSelectLanguage('hi');
        return;
      }
      if (/^(switch to english|english language|english)$/.test(normalized)) {
        void handleSelectLanguage('en');
        return;
      }
      if (/^(switch to hinglish|hinglish language|hinglish)$/.test(normalized)) {
        void handleSelectLanguage('hinglish');
        return;
      }
      if (/^(auto language|switch to auto)$/.test(normalized)) {
        void handleSelectLanguage('auto');
        return;
      }

      if (autoSend && sendMessageRef.current) {
        void sendMessageRef.current(transcript, true);
      } else {
        setDraftInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    },
    [createPage, handleSelectLanguage, handleSelectTheme, handleSelectVoiceName, handleToggleVoiceReply]
  );

  const {
    isListening,
    isTranscribing,
    interimText,
    speakingId,
    loadingSpeechId,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  } = useVoiceAssistant({
    voiceName,
    preferredLanguage,
    onTranscriptReady: handleVoiceTranscript,
    onError: (msg) => setWorkspaceError(msg),
  });

  const handleSendMessage = useCallback(
    async (
      rawContent: string,
      usedVoice = false,
      videoAttachment?: VideoAttachmentPayload,
      enableUrlContext = false,
      pageOverride?: ChatPage,
      skipUserSave = false
    ) => {
      if (!firebaseUser) return;
      const content = rawContent.trim().slice(0, 31000);
      if (!content || isGenerating) return;

      setWorkspaceError(null);
      stopSpeaking();

      const uid = firebaseUser.uid;
      let targetPage = pageOverride || activePageRef.current;
      const isFreshPage = Boolean(pageOverride) || !targetPage;

      if (!targetPage) {
        targetPage = await createPage({
          title: videoAttachment
            ? `Video: ${videoAttachment.fileName}`.slice(0, 48)
            : content.slice(0, 48),
          category: 'general',
        });
        if (!targetPage) return;
      }

      const pageId = targetPage.id;
      const messagesPath = `users/${uid}/pages/${pageId}/messages`;
      const pagePath = `users/${uid}/pages/${pageId}`;
      const savedUserText = videoAttachment
        ? `[Video uploaded: ${videoAttachment.fileName}]\n\n${content}`.slice(0, 32000)
        : content;

      if (!skipUserSave) {
        try {
          await addDoc(collection(db, messagesPath), {
            ownerId: uid,
            pageId,
            role: 'user',
            content: savedUserText,
            usedVoice,
            createdAt: serverTimestamp(),
          });

          const nextCount = (targetPage.messageCount || 0) + 1;
          const shouldAutoTitle =
            targetPage.title === 'New Page' || targetPage.messageCount === 0;
          const autoTitle = (videoAttachment
            ? `Video: ${videoAttachment.fileName}`
            : content
          )
            .replace(/\s+/g, ' ')
            .slice(0, 48)
            .trim();

          if (shouldAutoTitle && autoTitle) {
            await updateDoc(doc(db, pagePath), {
              title: autoTitle,
              messageCount: nextCount,
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(doc(db, pagePath), {
              messageCount: nextCount,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, messagesPath);
        }
      }

      // Stream response from server-side Gemini endpoint
      setIsGenerating(true);
      setStreamingContent('');
      setRetryStatus(null);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const baseHistory = isFreshPage
        ? []
        : messages.map((m) => ({ role: m.role, content: m.content }));
      const historyForApi = skipUserSave
        ? baseHistory.length > 0
          ? baseHistory
          : [{ role: 'user' as const, content }]
        : [...baseHistory, { role: 'user' as const, content }];

      let fullReply = '';
      try {
        let uploadedVideo:
          | { fileUri: string; fileName?: string; mimeType: string }
          | undefined;

        if (videoAttachment?.file) {
          setRetryStatus('Uploading & processing video...');
          const uploadResponse = await fetch('/api/video/upload', {
            method: 'POST',
            headers: {
              'Content-Type': videoAttachment.mimeType || 'video/mp4',
              'X-File-Name': encodeURIComponent(videoAttachment.fileName),
            },
            body: videoAttachment.file,
            signal: controller.signal,
          });

          if (!uploadResponse.ok) {
            let errMsg = 'Failed to upload video.';
            try {
              const errJson = (await uploadResponse.json()) as { error?: string };
              if (errJson?.error) errMsg = errJson.error;
            } catch {
              // Ignore non-JSON error body
            }
            throw new Error(errMsg);
          }

          uploadedVideo = (await uploadResponse.json()) as {
            fileUri: string;
            fileName?: string;
            mimeType: string;
          };
          setRetryStatus('Analyzing video...');
        }

        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: historyForApi,
            systemInstruction: targetPage.systemInstruction,
            preferredLanguage,
            uploadedVideo,
            videoAttachment:
              !uploadedVideo && videoAttachment?.base64
                ? {
                    base64: videoAttachment.base64,
                    mimeType: videoAttachment.mimeType,
                    fileName: videoAttachment.fileName,
                  }
                : undefined,
            enableUrlContext,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error('Failed to connect to AI server.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;
            try {
              const payload = JSON.parse(jsonStr) as {
                text?: string;
                status?: string;
                done?: boolean;
                error?: string;
              };
              if (payload.error) {
                throw new Error(payload.error);
              }
              if (payload.status) {
                setRetryStatus(payload.status);
              }
              if (payload.text) {
                setRetryStatus(null);
                fullReply += payload.text;
                setStreamingContent(fullReply);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
                throw parseErr;
              }
            }
          }
        }

        if (fullReply.trim()) {
          const savedReply = fullReply.trim().slice(0, 32000);
          try {
            const replyRef = await addDoc(collection(db, messagesPath), {
              ownerId: uid,
              pageId,
              role: 'model',
              content: savedReply,
              usedVoice: false,
              createdAt: serverTimestamp(),
            });

            await updateDoc(doc(db, pagePath), {
              messageCount: (targetPage.messageCount || 0) + 2,
              updatedAt: serverTimestamp(),
            });

            if (voiceReplyEnabled || usedVoice) {
              void speakText(replyRef.id, savedReply);
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, messagesPath);
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          if (fullReply.trim()) {
            try {
              await addDoc(collection(db, messagesPath), {
                ownerId: uid,
                pageId,
                role: 'model',
                content: fullReply.trim().slice(0, 32000),
                usedVoice: false,
                createdAt: serverTimestamp(),
              });
            } catch (saveErr) {
              handleFirestoreError(saveErr, OperationType.CREATE, messagesPath);
            }
          }
        } else {
          setWorkspaceError(
            err instanceof Error ? err.message : 'Unable to get AI response.'
          );
        }
      } finally {
        abortControllerRef.current = null;
        setStreamingContent('');
        setRetryStatus(null);
        setIsGenerating(false);
      }
    },
    [
      createPage,
      firebaseUser,
      isGenerating,
      messages,
      preferredLanguage,
      speakText,
      stopSpeaking,
      voiceReplyEnabled,
    ]
  );

  useEffect(() => {
    sendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const handleRegenerateLast = async () => {
    if (isGenerating || messages.length === 0) return;
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.role === 'user') {
      await handleSendMessage(
        latestMessage.content,
        latestMessage.usedVoice,
        undefined,
        /https?:\/\/\S+/i.test(latestMessage.content),
        undefined,
        true
      );
      return;
    }

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      await handleSendMessage(
        lastUser.content,
        false,
        undefined,
        /https?:\/\/\S+/i.test(lastUser.content)
      );
    }
  };

  const handleLaunchOpportunity = async (template: OpportunityTemplate) => {
    const newPage = await createPage({
      title: template.title,
      category: template.category,
      systemInstruction: template.systemInstruction,
    });
    if (newPage && template.starterPrompt.trim()) {
      setDraftInput(template.starterPrompt);
    }
  };

  const handleConnectYouTube = async (channelInput: string) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const resp = await fetch('/api/youtube/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelInput }),
    });
    const data = (await resp.json()) as {
      error?: string;
      channel?: {
        channelId: string;
        title: string;
        handle: string;
        channelUrl: string;
        avatarUrl: string;
        description: string;
        recentVideos: Array<{
          videoId: string;
          title: string;
          url: string;
          publishedAt: string;
        }>;
      };
    };

    if (!resp.ok || !data.channel) {
      throw new Error(data.error || 'Could not connect YouTube channel.');
    }

    const ch = data.channel;
    const ytDocPath = `users/${uid}/youtubeChannels/${ch.channelId}`;
    const ytDocRef = doc(db, ytDocPath);

    const sanitizedPayload = {
      title: (ch.title || ch.channelId).slice(0, 160),
      handle: (ch.handle || '').slice(0, 100),
      channelUrl: (ch.channelUrl || `https://www.youtube.com/channel/${ch.channelId}`).slice(0, 500),
      avatarUrl: (ch.avatarUrl || '').slice(0, 500),
      description: (ch.description || '').slice(0, 1000),
      recentVideos: (ch.recentVideos || []).slice(0, 15).map((v) => ({
        videoId: String(v.videoId || '').slice(0, 64),
        title: String(v.title || '').slice(0, 160),
        url: String(v.url || '').slice(0, 300),
        publishedAt: String(v.publishedAt || '').slice(0, 64),
      })),
    };

    let existsAlready = youtubeChannels.some((c) => c.channelId === ch.channelId);
    if (!existsAlready) {
      try {
        const existingSnap = await getDoc(ytDocRef);
        existsAlready = existingSnap.exists();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, ytDocPath);
      }
    }

    if (existsAlready) {
      try {
        await updateDoc(ytDocRef, {
          ...sanitizedPayload,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, ytDocPath);
      }
    } else {
      try {
        await setDoc(ytDocRef, {
          ownerId: uid,
          channelId: ch.channelId,
          ...sanitizedPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, ytDocPath);
      }
    }
  };

  const handleDisconnectYouTube = async (channelId: string) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const path = `users/${uid}/youtubeChannels/${channelId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleLaunchYouTubeStrategy = async (channel: YouTubeChannel) => {
    const recentTitles = channel.recentVideos
      .slice(0, 6)
      .map((v, i) => `${i + 1}. ${v.title}`)
      .join('\n');

    const newPage = await createPage({
      title: `${channel.title.slice(0, 35)} · YouTube`,
      category: 'writing',
      systemInstruction: `You are an expert YouTube growth strategist and scriptwriter assisting the creator of "${channel.title}" (${channel.handle || channel.channelUrl}). Channel description: ${channel.description || 'N/A'}. Recent uploads:\n${recentTitles || 'None listed'}. Give specific, actionable video ideas, clickable titles, thumbnail concepts, and hooks tailored to this channel.`,
    });

    if (newPage) {
      await handleSendMessage(
        `Review my connected YouTube channel "${channel.title}" (${channel.handle || channel.channelUrl}) and my recent uploads. Suggest 5 high-CTR next video ideas with catchy titles, thumbnail concepts, and 15-second opening hooks.`,
        false,
        undefined,
        false,
        newPage
      );
    }
  };

  const handleAnalyzeYouTubeVideo = async (video: { title: string; url: string }) => {
    const newPage = await createPage({
      title: `YT: ${video.title.slice(0, 38)}`,
      category: 'general',
      systemInstruction:
        'You are Aurora, a helpful AI video analyst. Summarize YouTube videos clearly with key takeaways, structured timestamps/sections when available, and actionable insights in the user’s preferred language.',
    });

    if (newPage) {
      await handleSendMessage(
        `Please analyze this YouTube video and give me a clear summary, main takeaways, and key highlights: ${video.url}`,
        false,
        undefined,
        true,
        newPage
      );
    }
  };

  if (!authReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm"
        style={{
          backgroundColor: 'var(--canvas-bg)',
          color: 'var(--text-secondary)',
        }}
      >
        Loading Aurora AI Studio...
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <LoginScreen onGoogleLogin={handleGoogleLogin} authError={authError} />
    );
  }

  const effectiveProfile: UserProfile = userProfile || {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || '',
    themePreset,
    customBgColor,
    voiceReplyEnabled,
    voiceName,
  };

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden flex"
      style={{
        backgroundColor: 'var(--canvas-bg)',
        color: 'var(--text-primary)',
      }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        onCloseMobile={() => {
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        user={effectiveProfile}
        pages={pages}
        activePageId={activePageId}
        onSelectPage={(id) => {
          setActivePageId(id);
          setWorkspaceError(null);
        }}
        onCreateNewPage={() => void createPage()}
        onOpenOpportunities={() => setOpportunitiesOpen(true)}
        onRenamePage={handleRenamePage}
        onTogglePinPage={handleTogglePinPage}
        onDeletePage={handleDeletePage}
        onOpenAppearance={() => setAppearanceOpen(true)}
        onOpenYouTube={() => setYoutubeOpen(true)}
        connectedYouTubeCount={youtubeChannels.length}
        primaryChannelLabel={
          youtubeChannels[0]?.title || youtubeChannels[0]?.handle
        }
        onSignOut={handleSignOut}
      />

      <ChatWorkspace
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        activePage={activePage}
        messages={messages}
        streamingContent={streamingContent}
        retryStatus={retryStatus}
        isGenerating={isGenerating}
        voiceReplyEnabled={voiceReplyEnabled}
        isListening={isListening}
        isTranscribing={isTranscribing}
        interimText={interimText}
        speakingId={speakingId}
        loadingSpeechId={loadingSpeechId}
        voiceAutoSend={voiceAutoSend}
        onToggleVoiceAutoSend={() => void handleToggleVoiceAutoSend(!voiceAutoSend)}
        onStartListening={() => startListening(voiceAutoSend)}
        onStopListening={stopListening}
        onSpeakMessage={speakText}
        onStopSpeaking={stopSpeaking}
        onToggleVoiceReply={() => void handleToggleVoiceReply(!voiceReplyEnabled)}
        voiceName={voiceName}
        onSelectVoiceName={(voice) => void handleSelectVoiceName(voice)}
        preferredLanguage={preferredLanguage}
        onSelectLanguage={(lang) => void handleSelectLanguage(lang)}
        onSendMessage={handleSendMessage}
        onStopGeneration={handleStopGeneration}
        onRegenerateLast={handleRegenerateLast}
        onOpenAppearance={() => setAppearanceOpen(true)}
        onOpenOpportunities={() => setOpportunitiesOpen(true)}
        onOpenYouTube={() => setYoutubeOpen(true)}
        connectedYouTubeCount={youtubeChannels.length}
        onCreateNewPage={() => void createPage()}
        draftInput={draftInput}
        onDraftInputChange={setDraftInput}
        errorMessage={workspaceError}
        onDismissError={() => setWorkspaceError(null)}
      />

      <ThemeDrawer
        isOpen={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        themePreset={themePreset}
        customBgColor={customBgColor}
        preferredLanguage={preferredLanguage}
        voiceReplyEnabled={voiceReplyEnabled}
        voiceName={voiceName}
        voiceAutoSend={voiceAutoSend}
        onSelectTheme={handleSelectTheme}
        onSelectLanguage={(lang) => void handleSelectLanguage(lang)}
        onToggleVoiceReply={handleToggleVoiceReply}
        onSelectVoiceName={handleSelectVoiceName}
        onToggleVoiceAutoSend={(enabled) => void handleToggleVoiceAutoSend(enabled)}
        onStartVoiceCommand={() => startListening(voiceAutoSend)}
        onTestVoice={(voice) => {
          void speakText(
            'preview',
            getLanguageOption(preferredLanguage).samplePreview,
            voice
          );
        }}
      />

      <OpportunitiesModal
        isOpen={opportunitiesOpen}
        onClose={() => setOpportunitiesOpen(false)}
        customOpportunities={customOpportunities}
        onLaunchOpportunity={handleLaunchOpportunity}
        onCreateCustomOpportunity={handleCreateCustomOpportunity}
        onDeleteCustomOpportunity={handleDeleteCustomOpportunity}
      />

      <YouTubeConnectModal
        isOpen={youtubeOpen}
        onClose={() => setYoutubeOpen(false)}
        channels={youtubeChannels}
        onConnectChannel={handleConnectYouTube}
        onDisconnectChannel={handleDisconnectYouTube}
        onLaunchStrategy={handleLaunchYouTubeStrategy}
        onAnalyzeVideo={handleAnalyzeYouTubeVideo}
      />
    </div>
  );
}
