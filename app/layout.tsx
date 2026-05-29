import '@mantine/core/styles.css';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import React from 'react';
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
        <MantineProvider theme={theme}>{children}</MantineProvider>
      </body>
    </html>
  );
}
