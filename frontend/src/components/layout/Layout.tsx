import React from 'react';
import { Header } from './Header';
import { Dock } from './Dock';

interface LayoutProps {
  children: React.ReactNode;
  autoOpenInfoEnabled?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, autoOpenInfoEnabled = true }) => {


  return (
    <div className="h-screen flex flex-col bg-background text-foreground font-sans antialiased relative">
      {/* Ambient background ... */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* ... */}
      </div>

      <Header autoOpenInfoEnabled={autoOpenInfoEnabled} />
      
      <main className="app-main relative z-10 w-full px-[clamp(24px,3vw,64px)] py-6 md:py-8 flex-1 overflow-y-auto pb-16 md:pb-[4.5rem]">
        {children}
        
        <footer className="relative z-10 py-6 text-center text-[9px] text-muted-foreground/25 font-medium tracking-[0.24em] uppercase">
          <p>&copy; {new Date().getFullYear()} AppLauncher</p>
        </footer>
      </main>

      <Dock />
    </div>
  );
};
