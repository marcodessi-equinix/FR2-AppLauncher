import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Link } from '@tiptap/extension-link';
import FontFamily from '@tiptap/extension-font-family';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Palette,
  Type,
  Smile,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { useI18n } from '../../lib/i18n';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

interface EditorSelectionRange {
  from: number;
  to: number;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, active, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      'h-7 w-7 flex items-center justify-center rounded-lg transition-colors duration-150',
      'hover:bg-secondary text-muted-foreground/60 hover:text-foreground',
      active && 'bg-primary/15 text-primary'
    )}
  >
    {children}
  </button>
);

const Separator = () => (
  <div className="w-[1px] h-5 bg-[hsl(var(--glass-border)/0.08)] mx-0.5" />
);

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange }) => {
  const { t } = useI18n();
  // 1. Hooks first (Always consistent order)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const [isColorPopoverOpen, setIsColorPopoverOpen] = React.useState(false);
  const [isFontPopoverOpen, setIsFontPopoverOpen] = React.useState(false);
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = React.useState(false);
  const selectionRef = React.useRef<EditorSelectionRange | null>(null);

  // 2. Editor hook
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontFamily,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[120px] p-4 text-foreground/85 text-sm leading-relaxed',
      },
    },
  });

  // Sync external content changes (e.g., auto-translation result from parent)
  React.useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content && content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // 3. Conditional return AFTER hooks
  if (!editor) return null;

  const PRESET_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#FFFFFF', // White
    '#9CA3AF', // Gray
    '#000000', // Black
  ];

  const PRESET_FONTS = [
    { name: 'Default', value: 'Inter, sans-serif' },
    { name: 'Serif', value: 'Georgia, serif' },
    { name: 'Mono', value: 'monospace' },
    { name: 'Cursive', value: 'cursive' },
  ];

  // PRESET_EMOJIS removed in favor of emoji-picker-react

  const handleLinkClick = () => {
    // If active, unset link
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    // Otherwise open dialog
    setLinkUrl('');
    setIsLinkDialogOpen(true);
  };

  const handleLinkSubmit = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setIsLinkDialogOpen(false);
  };

  const handleColorPreset = (color: string) => {
    // Basic hex validation
    let hex = color;
    if (!hex.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(hex)) {
        hex = '#' + hex;
    }
    
    if (/^#[0-9A-Fa-f]{6}$/.test(hex) || /^#[0-9A-Fa-f]{3}$/.test(hex)) {
        editor.chain().focus().setColor(hex).run();
        setIsColorPopoverOpen(false);
    }
  };

  const handleFontSelect = (font: string) => {
    if (font === 'Inter, sans-serif') {
        editor.chain().focus().unsetFontFamily().run();
    } else {
        editor.chain().focus().setFontFamily(font).run();
    }
    setIsFontPopoverOpen(false);
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    if (selectionRef.current) {
        editor.commands.setTextSelection(selectionRef.current);
    }
    editor.chain().focus().insertContent(emojiData.emoji).run();
    setIsEmojiPopoverOpen(false);
    selectionRef.current = null;
  };

  return (
    <>
      <div className="rounded-xl glass-surface overflow-hidden border border-white/5">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 flex-wrap bg-black/40">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title={t('editor.bold')}
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title={t('editor.italic')}
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title={t('editor.underline')}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Separator />
          
          {/* Font Family Popover */}
          <Popover open={isFontPopoverOpen} onOpenChange={setIsFontPopoverOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                  title={t('editor.fontFamily')}
                    className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-lg transition-colors duration-150',
                    'hover:bg-[hsl(var(--glass-highlight)/0.08)] text-muted-foreground/60 hover:text-foreground relative group',
                    isFontPopoverOpen && 'bg-[hsl(var(--glass-highlight)/0.08)] text-foreground'
                    )}
                >
                    <Type className="h-3.5 w-3.5" />
                </button>
            </PopoverTrigger>
             <PopoverContent className="w-40 p-1 bg-black/90 border-white/10" align="start">
                <div className="flex flex-col">
                    {PRESET_FONTS.map((font) => (
                        <button
                            key={font.name}
                            onClick={() => handleFontSelect(font.value)}
                            className={cn(
                                "flex items-center w-full px-3 py-2 text-xs text-left rounded-md hover:bg-white/10 transition-colors",
                                editor.isActive('textStyle', { fontFamily: font.value }) ? "bg-white/10 text-primary" : "text-muted-foreground"
                            )}
                            style={{ fontFamily: font.value }}
                        >
                            {font.name}
                        </button>
                    ))}
                </div>
            </PopoverContent>
          </Popover>

          {/* Emoji Picker Popover */}
          <Popover open={isEmojiPopoverOpen} onOpenChange={setIsEmojiPopoverOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                  title={t('editor.insertEmoji')}
                    className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-lg transition-colors duration-150',
                    'hover:bg-[hsl(var(--glass-highlight)/0.08)] text-muted-foreground/60 hover:text-foreground relative group',
                    isEmojiPopoverOpen && 'bg-[hsl(var(--glass-highlight)/0.08)] text-foreground'
                    )}
                    onClick={() => {
                        // Save current selection before popover opens and steals focus
                        selectionRef.current = {
                          from: editor.state.selection.from,
                          to: editor.state.selection.to,
                        };
                    }}
                >
                    <Smile className="h-3.5 w-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none" align="end">
                <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={handleEmojiSelect}
                    lazyLoadEmojis={true}
                    width={350}
                    height={400}
                    searchPlaceHolder={t('editor.searchEmoji')}
                />
            </PopoverContent>
          </Popover>

          <Separator />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title={t('editor.heading1')}
          >
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title={t('editor.heading2')}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Separator />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title={t('editor.bulletList')}
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title={t('editor.orderedList')}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Separator />

          <ToolbarButton 
            onClick={handleLinkClick} 
            active={editor.isActive('link')} 
            title={editor.isActive('link') ? t('editor.removeLink') : t('editor.insertLink')}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          
          {/* Color Picker Popover */}
          <Popover open={isColorPopoverOpen} onOpenChange={setIsColorPopoverOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                  title={t('editor.textColor')}
                    className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-lg transition-colors duration-150',
                    'hover:bg-[hsl(var(--glass-highlight)/0.08)] text-muted-foreground/60 hover:text-foreground relative group',
                    isColorPopoverOpen && 'bg-[hsl(var(--glass-highlight)/0.08)] text-foreground'
                    )}
                >
                    <Palette className="h-3.5 w-3.5" />
                    <div 
                        className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full border border-black/50" 
                        style={{ backgroundColor: editor.getAttributes('textStyle').color || 'currentColor' }}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-black/90 border-white/10" align="start">
                <div className="space-y-3">
                    <div className="grid grid-cols-6 gap-2">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => handleColorPreset(color)}
                                className="w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/50"
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>
                    <div className="pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 border border-white/10 shrink-0" />
                            <input
                                type="text"
                                placeholder="#000000"
                                className="flex-1 bg-white/5 border border-white/10 rounded h-7 px-2 text-xs focus:outline-none focus:border-primary/50 text-white"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleColorPreset(e.currentTarget.value);
                                    }
                                }}
                            />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 hover:bg-white/10"
                                onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    handleColorPreset(input.value);
                                }}
                                title={t('editor.applyHexColor')}
                            >
                                <span className="text-[10px] font-bold">OK</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
          </Popover>

          <Separator />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title={t('editor.alignLeft')}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title={t('editor.alignCenter')}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title={t('editor.alignRight')}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            title={t('editor.undo')}
          >
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title={t('editor.redo')}
          >
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} />
      </div>

      {/* Link Insertion Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md border-white/10 bg-black/90">
          <DialogHeader>
            <DialogTitle>{t('editor.linkDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('editor.linkDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="grid flex-1 gap-2">
              <label htmlFor="link-url" className="sr-only">{t('editor.linkUrl')}</label>
              <Input
                id="link-url"
                placeholder={t('editor.linkUrlPlaceholder')}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLinkSubmit();
                }}
                autoFocus
                className="bg-white/5 border-white/10 focus-visible:ring-primary/50"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsLinkDialogOpen(false)}
              className="hover:bg-white/5"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleLinkSubmit}
              disabled={!linkUrl}
            >
              {t('editor.insertLink')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
