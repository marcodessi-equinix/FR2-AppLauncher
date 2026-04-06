import React, { useState } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useStore } from '../../store/useStore';

interface LoginErrorResponse {
  response?: {
    status?: number;
    data?: {
      error?: string;
    };
  };
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setIsAdmin = useStore((state) => state.setIsAdmin);

  React.useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/auth/login', { password });
      setIsAdmin(true);
      onClose();
    } catch (err) {
      const errorResponse = err as LoginErrorResponse;
      if (errorResponse.response?.status === 403) {
        setError(errorResponse.response.data?.error || 'Another staff member is currently logged in. Please wait until they are finished before making changes.');
      } else if (errorResponse.response?.status === 429) {
        setError(errorResponse.response.data?.error || 'Too many attempts. Please try again later.');
      } else {
        setError('Invalid password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="glass-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 relative z-10 border border-[hsl(var(--glass-border)/0.1)]">
        
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-[hsl(var(--glass-border)/0.05)]">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary/60" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/90">Admin Login</h2>
          </div>
          <button 
            onClick={onClose}
            type="button"
            title="Close login modal"
            aria-label="Close login modal"
            className="p-2 hover:bg-[hsl(var(--glass-highlight)/0.05)] rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <input
              type="password"
              placeholder="Enter Admin Password"
              className="w-full h-12 rounded-xl glass-input px-4 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="text-destructive text-xs mt-2 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Login
          </button>
        </form>
      </div>
    </div>
  );
};
