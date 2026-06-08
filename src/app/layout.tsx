import type { Metadata } from "next";
import "./globals.css";
import { STORAGE_BACKEND_NAME } from "@/lib/storage";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Tarot",
  description: "Browse eval of the last attempt.",
};

// Runs before React hydrates to set the right theme class on <html>,
// preventing a flash of the wrong theme on first paint.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('tarot-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    var root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    root.style.colorScheme = theme;
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-ink-950 text-ink-100 font-sans antialiased">
        <Header storageName={STORAGE_BACKEND_NAME} />
        <main className="max-w-[1400px] mx-auto px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
