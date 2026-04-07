import React from 'react';
import { Header } from './Header';
import { Dock } from './Dock';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {


  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased relative noise-overlay pb-16 md:pb-[4.5rem]">
      {/* Ambient background ... */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* ... */}
      </div>

      <Header />
      
      <main className="app-main relative z-10 w-full px-[clamp(24px,3vw,64px)] py-8 md:py-10">
        {children}
      </main>
      
      <footer className="relative z-10 py-6 text-center text-[9px] text-muted-foreground/25 font-medium tracking-[0.24em] uppercase">
        <p>&copy; {new Date().getFullYear()} AppLauncher</p>
      </footer>

      <Dock />
    </div>
  );
};
