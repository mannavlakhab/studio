import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { SidebarProvider } from '@/components/ui/sidebar'; // Import SidebarProvider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI Playground',
  description: 'Generate text with AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SidebarProvider> {/* Wrap content with SidebarProvider */}
          {children}
        </SidebarProvider>
        <Toaster /> {/* Add Toaster */}
      </body>
    </html>
  );
}
