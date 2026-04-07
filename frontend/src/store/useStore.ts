import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Group, Link } from '../types';
import api, { safeArray } from '../lib/api';

export type Theme = 'dark' | 'light';
export type PreferredLanguage = 'de' | 'en';

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
  setPreferredLanguage: (lang: PreferredLanguage) => void;
  
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

      preferredLanguage: 'de',
      setPreferredLanguage: (lang) => set({ preferredLanguage: lang }),

      reorderLinks: (groupId: number, newLinks: Link[]) => set((state) => ({
        groups: state.groups.map((g) => 
          g.id === groupId ? { ...g, links: newLinks } : g
        ),
      })),

      clientId: null,
      
      initClientIdentity: async () => {
        // New Client Identity Logic
        try {
            // 1. Get Fingerprint
            const { getClientFingerprint } = await import('../lib/fingerprint');
            const fingerprint = await getClientFingerprint();
            
            // 2. Register with Backend
            const res = await api.post('/clients/register', { fingerprint });
            const id = typeof res.data?.id === 'string' ? res.data.id : null;
            if (!id) {
              throw new Error('Client register response missing id.');
            }
            
            set({ clientId: id });
            
            // 3. Fetch Favorites for this Client
            const favs = await api.get(`/favorites/${id}`);
            set({ favorites: safeArray<number>(favs.data) });
            
        } catch (e) {
            console.error('Failed to init client identity', e);
        }
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
      partialize: (state) => ({ theme: state.theme, activeCategory: state.activeCategory, preferredLanguage: state.preferredLanguage }),
    }
  )
);
