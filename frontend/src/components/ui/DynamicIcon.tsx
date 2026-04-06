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
export const DynamicIcon: React.FC<DynamicIconProps> = ({ 
  icon, 
  className,
  fallback = <Globe className={cn("h-5 w-5 text-muted-foreground", className)} />
}) => {
  if (!icon) return <>{fallback}</>;

  // Check for image assets (Uploads, remote URLs, safe data-URIs)
  const isImage = icon.startsWith('/') || icon.startsWith('http');
  const isSafeDataUri = icon.startsWith('data:image/');
  
  if (isImage || isSafeDataUri) {
    return (
      <img 
        src={icon} 
        alt="Icon" 
        className={cn("object-contain", className)} 
      />
    );
  }

  // Reject non-image data: URIs entirely
  if (icon.startsWith('data:')) {
    return <>{fallback}</>;
  }

  // Handle Iconify (new system) or legacy Lucide names
  // Iconify uses 'set:name' (e.g. lucide:home)
  // If no colon is present, we wrap it in 'lucide:' for backward compatibility
  const iconName = icon.includes(':') ? icon : `lucide:${icon.toLowerCase()}`;

  return (
    <Icon 
      icon={iconName} 
      className={cn("text-accent", className)} 
    />
  );
};
