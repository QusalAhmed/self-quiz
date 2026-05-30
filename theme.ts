'use client';

import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: 'var(--font-body)',
  fontFamilyMonospace: 'Courier, monospace',
  headings: {
    fontFamily: 'var(--font-title)',
  },
  primaryColor: 'indigo',
  primaryShade: 6,
  colors: {
    // Custom indigo shades to blend beautifully
    indigo: [
      '#eef2ff',
      '#e0e7ff',
      '#c7d2fe',
      '#a5b4fc',
      '#818cf8',
      '#6366f1',
      '#4f46e5',
      '#3730a3',
      '#312e81',
      '#1e1b4b',
    ],
  },
});
