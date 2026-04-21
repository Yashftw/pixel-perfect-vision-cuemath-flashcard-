import { ReactNode } from "react";
import TopNav from "./TopNav";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="container py-6 flex-1 animate-fade-in">{children}</main>
      <footer className="container py-6 text-center text-xs text-muted-foreground">
        Made with care - Yashraj Yadav 22BET10063
      </footer>
    </div>
  );
}
