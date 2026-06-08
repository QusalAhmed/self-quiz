import {
    ActionIcon,
    Button,
    Card,
    Group,
    Progress,
    Stack,
    Text,
    Title,
    RingProgress,
    Tooltip,
    ScrollArea,
    TextInput,
    Divider
} from '@mantine/core';
import {
    IconAward,
    IconCopy,
    IconRotateClockwise,
    IconVolume,
    IconChevronLeft,
    IconChevronRight,
    IconBookmark,
    IconBookmarkOff,
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';

export type QuizItem = {
    id: string;
    word: string;
    meaning: string;
    examples?: string[];
};

export type QuizDirection = 'wordToMeaning' | 'meaningToWord' | 'spelling';

type QuizPanelProps = {
    item: QuizItem | null;
    quizDirection: QuizDirection;
    revealed: boolean;
    onReveal: () => void;
    onMarkMissed: () => void;
    isMarkedMissed: boolean;
    onNext: () => void;
    onPrevious: () => void;
    completed: boolean;
    hasPrevious: boolean;
    currentIndex?: number;
    totalCount?: number;
    onRestart?: () => void;
    onRefreshExamples?: (id: string) => void;
};

export function QuizPanel({
                              item,
                              quizDirection,
                              revealed,
                              onReveal,
                              onMarkMissed,
                              isMarkedMissed,
                              onNext,
                              onPrevious,
                              completed,
                              hasPrevious,
                              currentIndex = 0,
                              totalCount = 0,
                              onRestart,
                              onRefreshExamples,
                          }: QuizPanelProps) {
        const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [typedWord, setTypedWord] = useState('');
    const [spellingState, setSpellingState] = useState<'idle' | 'correct' | 'incorrect'>('idle');

    const handleSpeak = (text: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;

        utterance.onstart = () => setIsPlayingAudio(true);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);

        window.speechSynthesis.speak(utterance);
    };

    // Pronounce word when it loads or direction changes to spelling
    useEffect(() => {
        if (quizDirection === 'spelling' && item && !completed && !revealed) {
            const timer = setTimeout(() => {
                handleSpeak(item.word);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [item?.id, quizDirection]);

    // Reset spelling state on new item or direction change
    useEffect(() => {
        setSpellingState('idle');
        setTypedWord('');
    }, [item?.id, quizDirection]);

    const handleKeyPress = (key: string) => {
        if (revealed || completed) return;

        if (key === 'Backspace') {
            setTypedWord(prev => prev.slice(0, -1));
        } else if (key === 'Clear') {
            setTypedWord('');
        } else if (key === 'Space') {
            setTypedWord(prev => prev + ' ');
        } else if (key === 'Enter') {
            handleCheckSpelling();
        } else if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
            if (typedWord.length < 30) {
                setTypedWord(prev => prev + key.toLowerCase());
            }
        }
    };

    const handleCheckSpelling = () => {
        if (!item) return;
        const isCorrect = typedWord.trim().toLowerCase() === item.word.trim().toLowerCase();
        setSpellingState(isCorrect ? 'correct' : 'incorrect');
        if (!isCorrect && !isMarkedMissed) {
            onMarkMissed();
        }
        onReveal();
    };

    // Keyboard listener for PC users
    useEffect(() => {
        if (quizDirection !== 'spelling' || revealed || completed) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (activeEl) {
                const tagName = activeEl.tagName.toLowerCase();
                if (tagName === 'input' || tagName === 'textarea' || activeEl.hasAttribute('contenteditable')) {
                    return;
                }
            }

            const key = event.key;
            if (key === 'Backspace') {
                event.preventDefault();
                handleKeyPress('Backspace');
            } else if (key === ' ') {
                event.preventDefault();
                handleKeyPress('Space');
            } else if (key === 'Enter') {
                event.preventDefault();
                handleKeyPress('Enter');
            } else if (/^[a-zA-Z]$/.test(key)) {
                event.preventDefault();
                handleKeyPress(key);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [quizDirection, revealed, completed, typedWord]);

    const KEYBOARD_ROWS = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];

    if (completed) {
        return (
            <Card
                className="glass-panel animate-float"
                radius="lg"
                padding="xl"
                style={{
                    textAlign: 'center',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    background: 'rgba(99, 102, 241, 0.05)',
                }}
            >
                <Stack gap="xl" align="center" py="lg">
                    <RingProgress
                        size={120}
                        roundCaps
                        thickness={8}
                        sections={[{value: 100, color: 'indigo'}]}
                        label={
                            <Group justify="center">
                                <IconAward size={48} style={{color: '#6366f1'}}/>
                            </Group>
                        }
                    />

                    <Stack gap="xs">
                        <Title order={2} className="text-gradient" style={{fontFamily: 'var(--font-title)'}}>
                            Quiz Completed!
                        </Title>
                        <Text c="dimmed" size="sm" max-width="360px" mx="auto" style={{lineHeight: 1.6}}>
                            Fantastic effort! You've mastered all {totalCount} words selected for this session.
                            Repetition is key to long-term memory.
                        </Text>
                    </Stack>

                    <Group justify="center" mt="md">
                        {onRestart && (
                            <Button
                                onClick={onRestart}
                                className="btn-premium btn-pulse"
                                size="md"
                                radius="md"
                                leftSection={<IconRotateClockwise size={18}/>}
                            >
                                Restart Session
                            </Button>
                        )}
                    </Group>
                </Stack>
            </Card>
        );
    }

    if (!item) {
        return (
            <Card className="glass-panel" radius="lg" padding="xl" style={{textAlign: 'center'}}>
                <Text c="dimmed" style={{fontStyle: 'italic'}}>
                    No vocabulary cards are available in the selected date range.
                </Text>
            </Card>
        );
    }

    const progressPercent =
        totalCount > 0 ? ((currentIndex + (revealed ? 1 : 0)) / totalCount) * 100 : 0;
    const examples = Array.isArray(item?.examples) ? item.examples : [];
    const isWordToMeaning = quizDirection === 'wordToMeaning';

    const examplesBlock =
        examples.length > 0 ? (
            <Stack gap={2}>
                <Text size="xs" fw={600} c="dimmed" style={{textAlign: 'center'}}>
                    Examples
                </Text>
                <ScrollArea.Autosize mah={250} offsetScrollbars scrollbarSize={8} scrollHideDelay={500}>
                {examples.map((example, index) => (
                    <Text
                        key={`${item.id}-quiz-example-${index}`}
                        size="sm"
                        style={{
                            color: 'var(--text-secondary)',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            display: 'flex'
                        }}
                    >
                        {'•'} {example}
                    </Text>
                ))}
                </ScrollArea.Autosize>
            </Stack>
        ) : null;

    const markMissedAction = (
        <Tooltip label={isMarkedMissed ? 'Unmark missed' : 'Mark as missed'}>
            <ActionIcon
                aria-label={isMarkedMissed ? 'Unmark missed' : 'Mark as missed'}
                variant="subtle"
                color={isMarkedMissed ? 'teal' : 'red'}
                size="lg"
                radius="md"
                onClick={onMarkMissed}
            >
                {isMarkedMissed ? <IconBookmark size={20}/> : <IconBookmarkOff size={20}/>}
            </ActionIcon>
        </Tooltip>
    );

    const wordWithActions = (includeMissed: boolean) => (
        <Group gap="sm" align="center" justify="center">
            <Title
                order={1}
                style={{
                    fontFamily: 'var(--font-title)',
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    textAlign: 'center',
                }}
            >
                {item.word}
            </Title>
            <Group gap={6}>
                <ActionIcon
                    aria-label="Speak pronunciation"
                    variant="subtle"
                    color={isPlayingAudio ? 'indigo' : 'gray'}
                    size="lg"
                    radius="md"
                    onClick={() => handleSpeak(item.word)}
                >
                    <IconVolume size={20}/>
                </ActionIcon>
                <ActionIcon
                    aria-label="Copy word"
                    variant="subtle"
                    color="gray"
                    size="lg"
                    radius="md"
                    onClick={() => navigator.clipboard.writeText(item.word)}
                >
                    <IconCopy size={20}/>
                </ActionIcon>
                {includeMissed && markMissedAction}
            </Group>
        </Group>
    );

    const meaningPrompt = (
        <Text
            size="lg"
            fw={500}
            style={{
                color: 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: 1.7,
                maxWidth: 520,
                fontSize: '1.35rem',
            }}
        >
            {item.meaning || 'No definition available.'}
        </Text>
    );

    const revealButton = (
        <Button
            variant="light"
            color="indigo"
            onClick={onReveal}
            size="lg"
            radius="md"
            className="btn-pulse"
            disabled={!isWordToMeaning && !item.meaning}
            style={{
                height: '60px',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
            }}
        >
            {isWordToMeaning ? 'Show Definition' : 'Show Word'}
        </Button>
    );

    // const answerCard = (children: ReactNode) => (
    //     <Card
    //         radius="md"
    //         padding="md"
    //         style={{
    //             background: 'rgba(99, 102, 241, 0.05)',
    //             border: '1px solid rgba(99, 102, 241, 0.15)',
    //             minHeight: '60px',
    //             width: '100%',
    //             animation: 'pulse 0.3s ease-out',
    //         }}
    //     >
    //         <Stack gap="sm" style={{width: '100%'}} align="center">
    //             {children}
    //         </Stack>
    //     </Card>
    // );

    return (
        <Card className="glass-panel" radius="lg" padding="xl">
            <Stack gap="xl">
                {totalCount > 0 && (
                    <Stack gap="xs">
                        <Group justify="space-between">
                            <Text size="xs" fw={700} c="indigo">
                                SESSION PROGRESS
                            </Text>
                            <Text size="xs" fw={700} c="dimmed">
                                {Math.min(currentIndex + 1, totalCount)} of {totalCount} Words
                            </Text>
                        </Group>
                        <Progress
                            value={progressPercent}
                            size="sm"
                            radius="xl"
                            color="indigo"
                            animated
                            style={{background: 'rgba(99, 102, 241, 0.1)'}}
                        />
                    </Stack>
                )}

                <Stack gap="md" align="center" style={{minHeight: '160px', justify: 'center', width: '100%'}}>
                    {quizDirection === 'wordToMeaning' && (
                        <>
                            {wordWithActions(true)}
                            {!revealed ? (
                                revealButton
                            ) : (
                                <>
                                    <Text
                                        size="md"
                                        fw={500}
                                        style={{
                                            color: 'var(--text-secondary)',
                                            textAlign: 'center',
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {item.meaning ? item.meaning : 'No definition available.'}
                                    </Text>
                                    {examplesBlock}
                                </>
                            )}
                        </>
                    )}

                    {quizDirection === 'meaningToWord' && (
                        <>
                            {meaningPrompt}
                            {!revealed ? (
                                revealButton
                            ) : (
                                <Stack gap="md" align="center" style={{width: '100%'}}>
                                    {wordWithActions(true)}
                                    {examplesBlock}
                                </Stack>
                            )}
                        </>
                    )}

                    {quizDirection === 'spelling' && (
                        <>
                            {!revealed ? (
                                <Stack gap="md" align="center" style={{ width: '100%' }}>
                                    <Card
                                        radius="md"
                                        padding="md"
                                        style={{
                                            background: 'rgba(99, 102, 241, 0.05)',
                                            border: '1px solid rgba(99, 102, 241, 0.15)',
                                            width: '100%',
                                            maxWidth: '300px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => handleSpeak(item.word)}
                                        className="hover-lift"
                                    >
                                        <Group gap="sm" justify="center">
                                            <ActionIcon
                                                aria-label="Speak pronunciation"
                                                variant="gradient"
                                                gradient={{ from: 'indigo', to: 'purple' }}
                                                color={isPlayingAudio ? 'indigo' : 'gray'}
                                                size="lg"
                                                radius="md"
                                            >
                                                <IconVolume size={20}/>
                                            </ActionIcon>
                                            <Text fw={600} size="sm" c="indigo">
                                                {isPlayingAudio ? 'Speaking...' : 'Listen to Word'}
                                            </Text>
                                        </Group>
                                    </Card>

                                    <TextInput
                                        value={typedWord}
                                        readOnly
                                        placeholder="Listen and type..."
                                        size="lg"
                                        radius="md"
                                        style={{ width: '100%', maxWidth: '300px' }}
                                        styles={{
                                            input: {
                                                textAlign: 'center',
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.05em',
                                                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                                                color: 'var(--text-primary)',
                                                cursor: 'default',
                                                borderColor: '#6366f1',
                                                borderStyle: 'dashed',
                                            }
                                        }}
                                    />
                                    
                                    <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
                                        Type using physical keyboard or screen keys below.
                                    </Text>

                                    <Stack gap="xs" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }} mt="xs">
                                        {KEYBOARD_ROWS.map((row, rowIndex) => (
                                            <Group key={rowIndex} gap="xs" justify="center" wrap="nowrap">
                                                {row.map(key => (
                                                    <Button
                                                        key={key}
                                                        variant="light"
                                                        color="gray"
                                                        onClick={() => handleKeyPress(key)}
                                                        style={{
                                                            flex: 1,
                                                            minWidth: '24px',
                                                            maxWidth: '40px',
                                                            height: '40px',
                                                            padding: 0,
                                                            fontSize: '1.1rem',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--card-border)',
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            transition: 'all 0.1s ease',
                                                        }}
                                                        className="hover-lift"
                                                    >
                                                        {key}
                                                    </Button>
                                                ))}
                                            </Group>
                                        ))}
                                        <Group gap="xs" justify="center" wrap="nowrap">
                                            <Button
                                                variant="light"
                                                color="red"
                                                onClick={() => handleKeyPress('Clear')}
                                                style={{
                                                    // flex: 1.5,
                                                    height: '40px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600,
                                                    borderRadius: '6px',
                                                }}
                                            >
                                                Clear
                                            </Button>
                                            <Button
                                                variant="light"
                                                color="gray"
                                                onClick={() => handleKeyPress('Space')}
                                                style={{
                                                    // flex: 3,
                                                    height: '40px',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    borderRadius: '6px',
                                                }}
                                            >
                                                Space
                                            </Button>
                                            <Button
                                                variant="light"
                                                color="orange"
                                                onClick={() => handleKeyPress('Backspace')}
                                                style={{
                                                    // flex: 1.5,
                                                    height: '40px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600,
                                                    borderRadius: '6px',
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        </Group>
                                    </Stack>

                                    <Button
                                        variant="gradient"
                                        gradient={{ from: 'indigo', to: 'purple' }}
                                        onClick={handleCheckSpelling}
                                        size="lg"
                                        radius="md"
                                        className="btn-pulse btn-premium"
                                        disabled={typedWord.trim().length === 0}
                                        style={{
                                            height: '50px',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            width: '100%',
                                            maxWidth: '300px',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        Check Spelling
                                    </Button>
                                </Stack>
                            ) : (
                                <Stack gap="md" align="center" style={{ width: '100%' }}>
                                    {spellingState === 'correct' ? (
                                        <Stack gap="xs" align="center" style={{ width: '100%' }}>
                                            <Text fw={800} c="green.6" size="xl" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.5rem' }}>
                                                Correct! 🎉
                                            </Text>
                                            <Text size="md" c="dimmed" style={{ textAlign: 'center' }}>
                                                You spelled <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{item.word}</span> correctly.
                                            </Text>
                                        </Stack>
                                    ) : (
                                        <Stack gap="xs" align="center" style={{ width: '100%' }}>
                                            <Text fw={800} c="red.6" size="xl" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.5rem' }}>
                                                Incorrect ❌
                                            </Text>
                                            <Text size="md" c="dimmed" style={{ textAlign: 'center' }}>
                                                Your spelling: <span style={{ color: 'var(--text-primary)', textDecoration: 'line-through', fontWeight: 600 }}>{typedWord || '(empty)'}</span>
                                            </Text>
                                            <Text size="md" c="dimmed" style={{ textAlign: 'center' }}>
                                                Correct spelling: <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.25rem' }}>{item.word}</span>
                                            </Text>
                                        </Stack>
                                    )}

                                    <Divider style={{ width: '100%', borderColor: 'var(--card-border)' }} />

                                    <Stack gap="md" align="center" style={{ width: '100%' }}>
                                        {wordWithActions(true)}
                                        <Text
                                            size="md"
                                            fw={500}
                                            style={{
                                                color: 'var(--text-secondary)',
                                                textAlign: 'center',
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            {item.meaning ? item.meaning : 'No definition available.'}
                                        </Text>
                                        {examplesBlock}
                                    </Stack>
                                </Stack>
                            )}
                        </>
                    )}

                    {revealed && onRefreshExamples && (
                        <Group justify="center" mt="xs">
                            <Button
                                variant="subtle"
                                size="xs"
                                radius="md"
                                leftSection={<IconRotateClockwise size={14}/>}
                                onClick={() => onRefreshExamples(item.id)}
                            >
                                Regenerate Examples
                            </Button>
                        </Group>
                    )}
                </Stack>

                <Group justify="space-between" mt="sm">
                    <Button
                        variant="subtle"
                        color="gray"
                        onClick={onPrevious}
                        disabled={!hasPrevious}
                        radius="md"
                        leftSection={<IconChevronLeft size={18}/>}
                    >
                        Back
                    </Button>

                    <Button
                        onClick={onNext}
                        className="btn-premium"
                        radius="md"
                        rightSection={<IconChevronRight size={18}/>}
                    >
                        {currentIndex + 1 >= totalCount ? 'Complete Session' : 'Next Word'}
                    </Button>
                </Group>
            </Stack>
        </Card>
    );
}
