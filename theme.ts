'use client';

import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: 'var(--font-body)',
  fontFamilyMonospace: 'var(--font-mono)',
  headings: {
    fontFamily: 'var(--font-title)',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.25', fontWeight: '800' },
      h2: { fontSize: '1.5rem', lineHeight: '1.3', fontWeight: '750' },
      h3: { fontSize: '1.25rem', lineHeight: '1.35', fontWeight: '700' },
      h4: { fontSize: '1.1rem', lineHeight: '1.4', fontWeight: '650' },
      h5: { fontSize: '0.95rem', lineHeight: '1.45', fontWeight: '600' },
      h6: { fontSize: '0.85rem', lineHeight: '1.5', fontWeight: '600' },
    },
  },
  primaryColor: 'indigo',
  primaryShade: 6,
  defaultRadius: 'md',
  cursorType: 'pointer',
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
  components: {
    Card: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
