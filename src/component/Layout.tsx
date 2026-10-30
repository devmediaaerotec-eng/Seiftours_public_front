import { type ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingElements from "./FloatingElements";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white font-sans antialiased flex flex-col">
      <Navbar />
      <main className="page-enter flex-1">{children}</main>
      <Footer />
      <FloatingElements />
    </div>
  );
}