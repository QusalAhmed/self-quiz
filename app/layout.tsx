import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './global.css';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import React from 'react';
import { GlobalSoundListener } from '@/components/Sound/GlobalSoundListener';
import { ReduxProvider } from '@/lib/redux/provider';
import { theme } from '@/theme';

export const metadata = {
  title: 'English Word Memorizer',
  description: 'Local-first English word memorization with quiz practice.',
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#111827" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        <title>Self Quiz</title>
      </head>
      <body>
        <ReduxProvider>
          <MantineProvider theme={theme}>
            <Notifications position="top-right" zIndex={2000} autoClose={4000} />
            <GlobalSoundListener />
            {children}
          </MantineProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
