import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/card';
import { IconPicker } from '../ui/IconPicker';
import { X, Loader2, Save } from 'lucide-react';
import { DynamicIcon } from '../ui/DynamicIcon';
import api from '../../lib/api';
import { Group } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { upsertGroupInDashboard } from '../../lib/dashboardData';

interface ManageGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: Group | null; // If null, we are creating
}

export const ManageGroupModal: React.FC<ManageGroupModalProps> = ({ isOpen, onClose, group }) => {
  const [title, setTitle] = useState('');
  const [order, setOrder] = useState(0);
  const [icon, setIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      if (group) {
        setTitle(group.title);
        setOrder(group.order);
        setIcon(group.icon || '');
      } else {
        setTitle('');
        setOrder(0);
        setIcon('');
      }
    }
  }, [isOpen, group]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let savedGroup: Group;
      if (group) {
        const response = await api.put<Group>(`/groups/${group.id}`, { title, order, icon });
        savedGroup = response.data;
      } else {
        const response = await api.post<Group>('/groups', { title, order, icon });
        savedGroup = response.data;
      }
      queryClient.setQueryData<Group[]>(['dashboardData'], (current = []) => upsertGroupInDashboard(current, savedGroup));
      onClose();
    } catch (error) {
      console.error('Failed to save group', error);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-foreground">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 relative z-10 rounded-3xl overflow-hidden bg-card/95 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--glass-border)/0.05)] pb-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/90">
            {group ? 'Edit Group' : 'New Group'}
          </h2>
          <button 
            onClick={onClose}
            type="button"
            title="Close group modal"
            aria-label="Close group modal"
            className="p-2 hover:bg-[hsl(var(--glass-highlight)/0.05)] rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">Icon</label>
              <div className="flex gap-3 items-center">
                {icon && (
                  <div className="h-10 w-10 rounded-xl glass-surface flex items-center justify-center">
                     <DynamicIcon icon={icon} className="h-6 w-6" />
                  </div>
                )}
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={() => setShowIconPicker(true)}
                  className="flex-1 rounded-xl"
                >
                  {icon ? 'Change Icon' : 'Select Icon'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">Title</label>
              <Input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Group Title"
                className="bg-background/50 border-input"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--glass-border)/0.05)]">
            <Button
               type="button"
               variant="outline"
               onClick={onClose}
               className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2 rounded-xl"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Save
            </Button>
          </CardFooter>
        </form>
      </Card>

      {showIconPicker && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setShowIconPicker(false)}
          />
          <Card className="w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 relative z-10 rounded-3xl bg-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--glass-border)/0.05)] py-4 px-6">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/90">Icon auswählen</h3>
              <button 
                onClick={() => setShowIconPicker(false)}
                type="button"
                title="Close icon picker"
                aria-label="Close icon picker"
                className="p-2 hover:bg-[hsl(var(--glass-highlight)/0.05)] rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <div className="p-0 flex-1 overflow-hidden bg-background">
               <IconPicker 
                 value={icon}
                 onChange={(val) => setIcon(val)}
                 onClose={() => setShowIconPicker(false)}
               />
            </div>
          </Card>
        </div>
      )}
    </div>,
    document.body
  );
};
