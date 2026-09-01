import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/nprogress/styles.css';
import './global.css';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Amiri, Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import React from 'react';
import { AppShellLayout } from '@/components/Layout/AppShellLayout';
import { NavigationProgressBar } from '@/components/Navigation';
import { QuranVerseProvider } from '@/components/QuranVerse';
import { ReduxProvider } from '@/lib/redux/provider';
import { theme } from '@/theme';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-title',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

export const metadata = {
  title: 'English Word Memorizer',
  description: 'Local-first English word memorization with quiz practice.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${amiri.variable}`}
      {...mantineHtmlProps}
      suppressHydrationWarning
    >
      <head>
        <ColorSchemeScript suppressHydrationWarning />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#4f46e5" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        <title>Self Quiz - English Word Memorizer</title>
      </head>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${amiri.variable}`}
      >
        <ReduxProvider>
          <MantineProvider theme={theme}>
            <QuranVerseProvider>
              <NavigationProgressBar />
              <Notifications position="top-right" zIndex={2000} autoClose={1000} />
              <AppShellLayout>{children}</AppShellLayout>
            </QuranVerseProvider>
          </MantineProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
