import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/card';
import { IconPicker } from '../ui/IconPicker';
import { X, Loader2, Save } from 'lucide-react';
import { DynamicIcon } from '../ui/DynamicIcon';
import api, { getErrorMessage } from '../../lib/api';
import { Group } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../lib/i18n';

interface ManageGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: Group | null; // If null, we are creating
  totalGroups?: number; // Total number of groups (for position clamping)
}

export const ManageGroupModal: React.FC<ManageGroupModalProps> = ({ isOpen, onClose, group, totalGroups = 0 }) => {
  const { t } = useI18n();
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
        // Display 1-based position to the user
        setOrder(group.order + 1);
        setIcon(group.icon || '');
      } else {
        setTitle('');
        // New group defaults to last position
        setOrder(totalGroups + 1);
        setIcon('');
      }
    }
  }, [isOpen, group, totalGroups]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Convert 1-based UI position to 0-based order, clamped to valid range
    const maxPosition = group ? totalGroups : totalGroups + 1;
    const clampedPosition = Math.max(1, Math.min(order, maxPosition));
    const zeroBasedOrder = clampedPosition - 1;

    try {
      if (group) {
        await api.put<Group>(`/groups/${group.id}`, { title, order: zeroBasedOrder, icon });
      } else {
        await api.post<Group>('/groups', { title, order: zeroBasedOrder, icon });
      }
      // Refetch dashboard data to get the fully normalized order from backend
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      onClose();
    } catch (error) {
      console.error('Failed to save group', error);
      alert(getErrorMessage(error, t('common.requestFailed')));
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
      <Card className="light-modal-card w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 relative z-10 rounded-3xl overflow-hidden bg-card/95 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--glass-border)/0.05)] pb-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/90">
            {group ? t('groups.editGroup') : t('groups.newGroup')}
          </h2>
          <button 
            onClick={onClose}
            type="button"
            title={t('groups.closeGroupModal')}
            aria-label={t('groups.closeGroupModal')}
            className="p-2 hover:bg-[hsl(var(--glass-highlight)/0.05)] rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <label className="modal-field-label text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">{t('common.icon')}</label>
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
                  className="light-modal-secondary flex-1 rounded-xl"
                >
                  {icon ? t('groups.changeIcon') : t('groups.selectIcon')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="modal-field-label text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">{t('common.title')}</label>
              <Input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('groups.groupTitle')}
                className="bg-background/50 border-input"
              />
            </div>

            <div className="space-y-2">
              <label className="modal-field-label text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">{t('groups.position')}</label>
              <Input
                type="number"
                min={1}
                max={group ? totalGroups : totalGroups + 1}
                value={order}
                onChange={(e) => setOrder(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-background/50 border-input w-24"
              />
              <p className="text-[10px] text-muted-foreground/50 pl-1">
                {t('groups.positionHint', { max: group ? totalGroups : totalGroups + 1 })}
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--glass-border)/0.05)]">
            <Button
               type="button"
               variant="outline"
               onClick={onClose}
               className="rounded-xl"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2 rounded-xl"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              {t('common.save')}
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
          <Card className="light-modal-card w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 relative z-10 rounded-3xl bg-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--glass-border)/0.05)] py-4 px-6">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/90">{t('groups.selectIcon')}</h3>
              <button 
                onClick={() => setShowIconPicker(false)}
                type="button"
                title={t('groups.closeIconPicker')}
                aria-label={t('groups.closeIconPicker')}
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
