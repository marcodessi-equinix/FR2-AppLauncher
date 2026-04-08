import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Group, Link } from '../types';
import api, { safeArray } from '../lib/api';

const CLIENT_ID_STORAGE_KEY = 'applauncher_client_id';
const CLIENT_FINGERPRINT_STORAGE_KEY = 'applauncher_client_fingerprint';

let initClientIdentityPromise: Promise<void> | null = null;
let fingerprintPromise: Promise<string> | null = null;

const getFingerprint = async () => {
  if (!fingerprintPromise) {
    fingerprintPromise = (async () => {
      const { getClientFingerprint } = await import('../lib/fingerprint');
      return getClientFingerprint();
    })();
  }

  return fingerprintPromise;
};

export type Theme = 'dark' | 'light';
export type PreferredLanguage = 'de' | 'en';
export type LanguagePreferenceSource = 'system' | 'manual';

interface PersistedAppState {
  theme: Theme;
  activeCategory: string | null;
  preferredLanguage: PreferredLanguage;
  languagePreferenceSource: LanguagePreferenceSource;
}

const detectSystemLanguage = (): PreferredLanguage => {
  if (typeof navigator === 'undefined') {
    return 'de';
  }

  const locale = navigator.languages?.[0] || navigator.language || 'de';
  return locale.toLowerCase().startsWith('de') ? 'de' : 'en';
};

interface AppState {
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  
  editMode: boolean;
  toggleEditMode: () => void;
  
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  groups: Group[];
  setGroups: (groups: Group[]) => void;

  theme: Theme;
  setTheme: (theme: Theme) => void;

  preferredLanguage: PreferredLanguage;
  languagePreferenceSource: LanguagePreferenceSource;
  setPreferredLanguage: (lang: PreferredLanguage) => void;
  syncPreferredLanguageWithSystem: () => void;
  
  reorderLinks: (groupId: number, newLinks: Link[]) => void;
  
  clientId: string | null;
  initClientIdentity: () => Promise<void>;
  
  favorites: number[];
  toggleFavorite: (linkId: number) => Promise<void>;

  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
}
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAdmin: false,
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      
      editMode: false,
      toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
      
      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      
      groups: [],
      setGroups: (groups) => set({ groups: Array.isArray(groups) ? groups : [] }),

      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      preferredLanguage: detectSystemLanguage(),
      languagePreferenceSource: 'system',
      setPreferredLanguage: (lang) => set({ preferredLanguage: lang, languagePreferenceSource: 'manual' }),
      syncPreferredLanguageWithSystem: () => {
        if (get().languagePreferenceSource !== 'system') {
          return;
        }

        set({ preferredLanguage: detectSystemLanguage() });
      },

      reorderLinks: (groupId: number, newLinks: Link[]) => set((state) => ({
        groups: state.groups.map((g) => 
          g.id === groupId ? { ...g, links: newLinks } : g
        ),
      })),

      clientId: null,
      
      initClientIdentity: async () => {
        const existingClientId = get().clientId;
        if (existingClientId) {
          return;
        }

        if (initClientIdentityPromise) {
          return initClientIdentityPromise;
        }

        initClientIdentityPromise = (async () => {
          try {
            const fingerprint = await getFingerprint();
            const cachedFingerprint = localStorage.getItem(CLIENT_FINGERPRINT_STORAGE_KEY);
            const cachedClientId = localStorage.getItem(CLIENT_ID_STORAGE_KEY);

            let clientId = cachedFingerprint === fingerprint ? cachedClientId : null;

            if (!clientId) {
              const res = await api.post('/clients/register', { fingerprint });
              const registeredId = typeof res.data?.id === 'string' ? res.data.id : null;
              if (!registeredId) {
                throw new Error('Client register response missing id.');
              }

              clientId = registeredId;
              localStorage.setItem(CLIENT_ID_STORAGE_KEY, registeredId);
              localStorage.setItem(CLIENT_FINGERPRINT_STORAGE_KEY, fingerprint);
            }

            set({ clientId });

            const favs = await api.get(`/favorites/${clientId}`);
            set({ favorites: safeArray<number>(favs.data) });
          } catch (e) {
            console.error('Failed to init client identity', e);
          } finally {
            initClientIdentityPromise = null;
          }
        })();

        return initClientIdentityPromise;
      },

      favorites: [],
      toggleFavorite: async (linkId: number) => {
        const { clientId, favorites } = get();
        if (!clientId) return;

        const isFav = favorites.includes(linkId);
        
        // Optimistic update
        set({
          favorites: isFav 
            ? favorites.filter(id => id !== linkId)
            : [...favorites, linkId]
        });

        try {
          if (isFav) {
             await api.delete(`/favorites/${clientId}/${linkId}`);
          } else {
             await api.post('/favorites', { clientId, linkId });
          }
        } catch (error) {
          // Rollback on error
          console.error('Failed to update favorite', error);
          set({ favorites }); // Revert to original state
        }
      },

      activeCategory: 'all',
      setActiveCategory: (category) => set({ activeCategory: category }),
    }),
    {
      name: 'applauncher-storage',
      version: 2,
      partialize: (state) => ({
        theme: state.theme,
        activeCategory: state.activeCategory,
        preferredLanguage: state.preferredLanguage,
        languagePreferenceSource: state.languagePreferenceSource,
      }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<PersistedAppState> | undefined;

        return {
          theme: state?.theme ?? 'dark',
          activeCategory: state?.activeCategory ?? 'all',
          preferredLanguage: detectSystemLanguage(),
          languagePreferenceSource: state?.languagePreferenceSource ?? 'system',
        };
      },
    }
  )
);
