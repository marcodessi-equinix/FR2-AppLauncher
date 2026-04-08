import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Save, ChevronDown, Check } from 'lucide-react';
import api from '../../lib/api';
import { Group, Link } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store/useStore';
import { upsertLinkInDashboard } from '../../lib/dashboardData';
import { IconPicker } from '../ui/IconPicker';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/card';
import { DynamicIcon } from '../ui/DynamicIcon';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

interface ManageLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link?: Link | null;
  initialGroupId?: number | null;
}

export const ManageLinkModal: React.FC<ManageLinkModalProps> = ({ isOpen, onClose, link, initialGroupId }) => {
  const { t } = useI18n();
  const groups = useStore((state) => state.groups);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [groupId, setGroupId] = useState<number>(0);
  const [order, setOrder] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isGroupPickerOpen, setIsGroupPickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (link) {
        setTitle(link.title);
        setUrl(link.url);
        setDescription(link.description || '');
        setIcon(link.icon || '');
        setGroupId(link.group_id);
        setOrder(link.order);
      } else {
        setTitle('');
        setUrl('');
        setDescription('');
        setIcon('');
        setGroupId(initialGroupId || (groups.length > 0 ? groups[0].id : 0));
        setOrder(0);
      }
    }
  }, [isOpen, link, initialGroupId, groups]);



// ... (inside component)

  if (!isOpen) return null;

  const selectedGroup = groups.find((group) => group.id === groupId) || groups[0] || null;

  const handleSubmit = async (e: React.FormEvent) => {
    // ... (keep existing logic)
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      group_id: groupId,
      title,
      url,
      description,
      icon,
      order
    };

    try {
      let savedLink: Link;
      if (link) {
        const response = await api.put<Link>(`/links/${link.id}`, payload);
        savedLink = response.data;
      } else {
        const response = await api.post<Link>('/links', payload);
        savedLink = response.data;
      }
      queryClient.setQueryData<Group[]>(['dashboardData'], (current = []) => upsertLinkInDashboard(current, savedLink));
      onClose();
    } catch (error) {
      console.error('Failed to save link', error);
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
      <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto flex flex-col relative z-10 rounded-3xl overflow-hidden bg-card/95 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--glass-border)/0.05)] pb-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/90">
            {link ? t('links.editLink') : t('links.newLink')}
          </h2>
          <button 
            onClick={onClose}
            type="button"
            title={t('links.closeLinkModal')}
            aria-label={t('links.closeLinkModal')}
            className="p-2 hover:bg-[hsl(var(--glass-highlight)/0.05)] rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <CardContent className="space-y-4 pt-5 flex-1">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">{t('common.group')}</label>
                <Popover open={isGroupPickerOpen} onOpenChange={setIsGroupPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      title={t('links.selectGroup')}
                      aria-label={t('links.selectGroup')}
                      className="w-full h-10 px-3 rounded-xl glass-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors duration-200 bg-background/50 border border-input flex items-center justify-between gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        {selectedGroup?.icon ? (
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--glass-highlight)/0.06)] overflow-hidden">
                            <DynamicIcon icon={selectedGroup.icon} className="h-4 w-4" />
                          </span>
                        ) : null}
                        <span className="truncate text-left">
                          {selectedGroup?.title || t('links.noGroup')}
                        </span>
                      </span>
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isGroupPickerOpen && 'rotate-180')} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-[260px] p-2 rounded-2xl border-white/10 bg-card/95 backdrop-blur-xl">
                    <div className="max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {groups.map((group) => {
                        const isSelected = group.id === groupId;

                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              setGroupId(group.id);
                              setIsGroupPickerOpen(false);
                            }}
                            className={cn(
                              'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                              isSelected
                                ? 'bg-accent/15 text-foreground border border-accent/20'
                                : 'border border-transparent text-muted-foreground hover:bg-[hsl(var(--glass-highlight)/0.05)] hover:text-foreground'
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              {group.icon ? (
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--glass-highlight)/0.06)] overflow-hidden">
                                  <DynamicIcon icon={group.icon} className="h-4 w-4" />
                                </span>
                              ) : (
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--glass-highlight)/0.04)] text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                                  {group.title.slice(0, 1)}
                                </span>
                              )}
                              <span className="truncate text-sm font-medium">{group.title}</span>
                            </span>
                            {isSelected ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">{t('common.order')}</label>
                <Input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">{t('common.title')}</label>
              <Input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('links.linkTitle')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">{t('common.url')}</label>
              <Input
                type="url"
                required
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">{t('links.descriptionOptional')}</label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('links.shortDescription')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">{t('common.icon')}</label>
              <div className="flex gap-3 items-center">
                {icon && (
                  <div className="h-10 w-10 rounded-xl glass-surface flex items-center justify-center overflow-hidden">
                    <DynamicIcon icon={icon} className="h-6 w-6" />
                  </div>
                )}
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={() => setShowIconPicker(true)}
                  className="flex-1 rounded-xl"
                >
                  {icon ? t('groups.changeIcon') : t('groups.selectIcon')}
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--glass-border)/0.05)] mt-auto">
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
          <Card className="w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 relative z-10 rounded-3xl bg-card border-white/10">
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
