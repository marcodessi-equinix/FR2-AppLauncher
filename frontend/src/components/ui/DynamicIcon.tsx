import React from 'react';
import { Icon } from '@iconify/react';
import { Globe } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DynamicIconProps {
  icon?: string | null;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * DynamicIcon handles multiple icon types:
 * 1. URLs / Paths (e.g., /uploads/..., http://...) -> Renders as <img>
 * 2. Iconify Strings (e.g., lucide:home, mdi:account) -> Renders via @iconify/react
 * 3. Fallback (Globe)
 */
const DynamicIconComponent: React.FC<DynamicIconProps> = ({ 
  icon, 
  className,
  fallback = <Globe className={cn("h-5 w-5 text-muted-foreground", className)} />
}) => {
  if (!icon) return <>{fallback}</>;

  const isUploadedImage = icon.startsWith('/uploads/icons/');
  
  if (isUploadedImage) {
    return (
      <img 
        src={icon} 
        alt="Icon" 
        className={cn("object-contain", className)} 
      />
    );
  }

  // Reject remote URLs and arbitrary data URIs. Icons should come from
  // vetted local uploads or a curated icon identifier only.
  if (icon.startsWith('/') || icon.startsWith('http') || icon.startsWith('data:')) {
    return <>{fallback}</>;
  }

  // Handle Iconify (new system) or legacy Lucide names
  // Iconify uses 'set:name' (e.g. lucide:home)
  // If no colon is present, we wrap it in 'lucide:' for backward compatibility
  const iconName = icon.includes(':') ? icon : `lucide:${icon.toLowerCase()}`;

  return (
    <Icon 
      icon={iconName} 
      className={cn("text-primary", className)} 
    />
  );
};

export const DynamicIcon = React.memo(DynamicIconComponent);
