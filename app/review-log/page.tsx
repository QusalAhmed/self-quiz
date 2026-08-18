'use client';

import { Box, Loader, Stack, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

export default function ReviewLogPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/analysis#review-log');
  }, [router]);

  return (
    <Box
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack align="center" gap="sm">
        <Loader color="indigo" size="md" />
        <Text size="sm" c="dimmed">
          Redirecting to Learning Analysis...
        </Text>
      </Stack>
    </Box>
  );
}
