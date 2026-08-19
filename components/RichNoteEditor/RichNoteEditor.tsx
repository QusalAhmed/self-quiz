'use client';

import '@mantine/tiptap/styles.css';
import {
  ActionIcon,
  Badge,
  Button,
  ColorPicker,
  Divider,
  Group,
  Menu,
  Modal,
  Popover,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { Link, RichTextEditor } from '@mantine/tiptap';
import {
  IconAlignCenter,
  IconAlignJustified,
  IconAlignLeft,
  IconAlignRight,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBlockquote,
  IconBold,
  IconCheck,
  IconCheckbox,
  IconClearFormatting,
  IconCode,
  IconColorFilter,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconColumnRemove,
  IconCopy,
  IconEye,
  IconFocus2,
  IconH1,
  IconH2,
  IconH3,
  IconH4,
  IconHelp,
  IconHighlight,
  IconItalic,
  IconLanguage,
  IconLayoutGrid,
  IconLetterCase,
  IconLineHeight,
  IconLink,
  IconList,
  IconListNumbers,
  IconMaximize,
  IconMinimize,
  IconNotes,
  IconPhoto,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconRowRemove,
  IconSeparator,
  IconSparkles,
  IconStrikethrough,
  IconSubscript,
  IconSuperscript,
  IconTable,
  IconTableMinus,
  IconTableOff,
  IconTablePlus,
  IconTableRow,
  IconTextSize,
  IconTrash,
  IconTypography,
  IconUnderline,
  IconUnlink,
} from '@tabler/icons-react';
import CharacterCount from '@tiptap/extension-character-count';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect, useMemo, useState } from 'react';
import { Callout, FontSize, LineHeight } from './extensions';
import {
  CALLOUT_PRESETS,
  COLOR_PALETTE,
  FONT_FAMILIES,
  FONT_SIZES,
  HIGHLIGHT_PALETTE,
  IPA_SYMBOLS,
  LINE_HEIGHTS,
  STUDY_SYMBOLS,
  VOCABULARY_TEMPLATES,
} from './templates';
import classes from './RichNoteEditor.module.css';

type RichNoteEditorProps = {
  value: string;
  onChange: (content: string) => void;
  minHeight?: number | string;
};

export function RichNoteEditor({ value, onChange, minHeight = 140 }: RichNoteEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [helpOpened, setHelpOpened] = useState(false);
  const [clearConfirmOpened, setClearConfirmOpened] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkPopoverOpened, setLinkPopoverOpened] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imagePopoverOpened, setImagePopoverOpened] = useState(false);
  const [customColor, setCustomColor] = useState('#6366f1');
  const [copiedNotification, setCopiedNotification] = useState(false);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        link: false,
        underline: false,
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'callout'],
      }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder: 'Add rich vocabulary notes, mnemonics, roots, collocations, or examples...',
      }),
      CharacterCount,
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const currentHTML = editor.getHTML();
    if (value !== currentHTML && !editor.isFocused) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const wordCount = editor.storage.characterCount?.words() || 0;
  const charCount = editor.storage.characterCount?.characters() || 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Current active formatting states
  const currentFontSize = editor.getAttributes('textStyle').fontSize || 'Default';
  const currentLineHeight =
    editor.getAttributes('paragraph').lineHeight ||
    editor.getAttributes('heading').lineHeight ||
    'Default';
  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || '';

  const insertLink = () => {
    if (!linkUrl.trim()) {
      return;
    }
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    if (linkText.trim() && editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${linkText.trim()}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinkUrl('');
    setLinkText('');
    setLinkPopoverOpened(false);
  };

  const insertImage = () => {
    if (!imageUrl.trim()) {
      return;
    }
    editor
      .chain()
      .focus()
      .setImage({
        src: imageUrl.trim(),
        alt: imageAlt.trim() || undefined,
      })
      .run();
    setImageUrl('');
    setImageAlt('');
    setImagePopoverOpened(false);
  };

  const copyAs = async (format: 'html' | 'text') => {
    try {
      const textToCopy = format === 'html' ? editor.getHTML() : editor.getText();
      await navigator.clipboard.writeText(textToCopy);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    } catch {
      // ignore
    }
  };

  const renderEditorControls = () => (
    <div className={classes.mainToolbar}>
      {/* Undo / Redo */}
      <RichTextEditor.ControlsGroup>
        <Tooltip label="Undo (Ctrl+Z)">
          <RichTextEditor.Control
            aria-label="Undo"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <IconArrowBackUp size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Redo (Ctrl+Y)">
          <RichTextEditor.Control
            aria-label="Redo"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <IconArrowForwardUp size={15} />
          </RichTextEditor.Control>
        </Tooltip>
      </RichTextEditor.ControlsGroup>

      {/* Heading / Paragraph Selector */}
      <RichTextEditor.ControlsGroup>
        <Menu shadow="md" width={170} position="bottom-start" withinPortal>
          <Menu.Target>
            <button
              type="button"
              className={`${classes.customDropdownBtn} ${
                editor.isActive('heading') ? classes.customDropdownBtnActive : ''
              }`}
              title="Heading style"
            >
              <IconLetterCase size={14} />
              {editor.isActive('heading', { level: 1 })
                ? 'Heading 1'
                : editor.isActive('heading', { level: 2 })
                  ? 'Heading 2'
                  : editor.isActive('heading', { level: 3 })
                    ? 'Heading 3'
                    : editor.isActive('heading', { level: 4 })
                      ? 'Heading 4'
                      : 'Paragraph'}
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Text Level</Menu.Label>
            <Menu.Item
              onClick={() => editor.chain().focus().setParagraph().run()}
              style={{ fontWeight: editor.isActive('paragraph') ? 600 : 400 }}
            >
              Paragraph (Normal)
            </Menu.Item>
            <Menu.Item
              leftSection={<IconH1 size={15} />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              style={{ fontWeight: editor.isActive('heading', { level: 1 }) ? 600 : 400 }}
            >
              Heading 1 (H1)
            </Menu.Item>
            <Menu.Item
              leftSection={<IconH2 size={15} />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              style={{ fontWeight: editor.isActive('heading', { level: 2 }) ? 600 : 400 }}
            >
              Heading 2 (H2)
            </Menu.Item>
            <Menu.Item
              leftSection={<IconH3 size={15} />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              style={{ fontWeight: editor.isActive('heading', { level: 3 }) ? 600 : 400 }}
            >
              Heading 3 (H3)
            </Menu.Item>
            <Menu.Item
              leftSection={<IconH4 size={15} />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
              style={{ fontWeight: editor.isActive('heading', { level: 4 }) ? 600 : 400 }}
            >
              Heading 4 (H4)
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </RichTextEditor.ControlsGroup>

      {/* Font Family Selector */}
      <RichTextEditor.ControlsGroup>
        <Menu shadow="md" width={220} position="bottom-start" withinPortal>
          <Menu.Target>
            <button
              type="button"
              className={`${classes.customDropdownBtn} ${
                currentFontFamily ? classes.customDropdownBtnActive : ''
              }`}
              title="Font Family"
            >
              <IconTypography size={14} />
              {FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label.split(' ')[0] ||
                'Font'}
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Font Family</Menu.Label>
            {FONT_FAMILIES.map((family) => (
              <Menu.Item
                key={family.label}
                onClick={() => {
                  if (!family.value) {
                    editor.chain().focus().unsetFontFamily().run();
                  } else {
                    editor.chain().focus().setFontFamily(family.value).run();
                  }
                }}
                style={{
                  fontFamily: family.value || 'inherit',
                  fontWeight: currentFontFamily === family.value ? 600 : 400,
                  color:
                    currentFontFamily === family.value
                      ? 'var(--mantine-color-indigo-6)'
                      : undefined,
                }}
              >
                {family.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </RichTextEditor.ControlsGroup>

      {/* Font Size Selector */}
      <RichTextEditor.ControlsGroup>
        <Menu shadow="md" width={180} position="bottom-start" withinPortal>
          <Menu.Target>
            <button
              type="button"
              className={`${classes.customDropdownBtn} ${
                currentFontSize !== 'Default' ? classes.customDropdownBtnActive : ''
              }`}
              title="Font Size"
            >
              <IconTextSize size={14} />
              {currentFontSize}
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Font Size</Menu.Label>
            <Menu.Item
              onClick={() => editor.chain().focus().unsetFontSize().run()}
              style={{ fontWeight: currentFontSize === 'Default' ? 600 : 400 }}
            >
              Default (14px)
            </Menu.Item>
            {FONT_SIZES.map((size) => (
              <Menu.Item
                key={size.value}
                onClick={() => editor.chain().focus().setFontSize(size.value).run()}
                style={{
                  fontWeight: currentFontSize === size.value ? 600 : 400,
                  color:
                    currentFontSize === size.value ? 'var(--mantine-color-indigo-6)' : undefined,
                }}
              >
                {size.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </RichTextEditor.ControlsGroup>

      {/* Line Height / Line Gap Selector */}
      <RichTextEditor.ControlsGroup>
        <Menu shadow="md" width={180} position="bottom-start" withinPortal>
          <Menu.Target>
            <button
              type="button"
              className={`${classes.customDropdownBtn} ${
                currentLineHeight !== 'Default' ? classes.customDropdownBtnActive : ''
              }`}
              title="Line Gap / Height"
            >
              <IconLineHeight size={14} />
              {LINE_HEIGHTS.find((l) => l.value === currentLineHeight)?.label.split(' ')[0] ||
                'Line Gap'}
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Line Gap (Spacing)</Menu.Label>
            <Menu.Item
              onClick={() => editor.chain().focus().unsetLineHeight().run()}
              style={{ fontWeight: currentLineHeight === 'Default' ? 600 : 400 }}
            >
              Default (1.6)
            </Menu.Item>
            {LINE_HEIGHTS.map((lh) => (
              <Menu.Item
                key={lh.value}
                onClick={() => editor.chain().focus().setLineHeight(lh.value).run()}
                style={{
                  fontWeight: currentLineHeight === lh.value ? 600 : 400,
                  color:
                    currentLineHeight === lh.value ? 'var(--mantine-color-indigo-6)' : undefined,
                }}
              >
                {lh.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </RichTextEditor.ControlsGroup>

      {/* Core Inline Formats: Bold, Italic, Underline, Strikethrough, Code */}
      <RichTextEditor.ControlsGroup>
        <Tooltip label="Bold (Ctrl+B)">
          <RichTextEditor.Control
            aria-label="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <IconBold size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Italic (Ctrl+I)">
          <RichTextEditor.Control
            aria-label="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <IconItalic size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Underline (Ctrl+U)">
          <RichTextEditor.Control
            aria-label="Underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <IconUnderline size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Strikethrough (Ctrl+Shift+X)">
          <RichTextEditor.Control
            aria-label="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <IconStrikethrough size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Inline Code (Ctrl+E)">
          <RichTextEditor.Control
            aria-label="Code"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <IconCode size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Subscript">
          <RichTextEditor.Control
            aria-label="Subscript"
            active={editor.isActive('subscript')}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            <IconSubscript size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Superscript">
          <RichTextEditor.Control
            aria-label="Superscript"
            active={editor.isActive('superscript')}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            <IconSuperscript size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Clear formatting">
          <RichTextEditor.Control
            aria-label="Clear formatting"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          >
            <IconClearFormatting size={15} />
          </RichTextEditor.Control>
        </Tooltip>
      </RichTextEditor.ControlsGroup>

      {/* Text Color & Highlight Palette */}
      <RichTextEditor.ControlsGroup>
        {/* Text Color */}
        <Popover position="bottom-start" withArrow shadow="md" withinPortal>
          <Popover.Target>
            <Tooltip label="Text color">
              <RichTextEditor.Control
                aria-label="Text Color"
                active={Boolean(editor.getAttributes('textStyle').color)}
              >
                <IconColorFilter
                  size={15}
                  style={{ color: editor.getAttributes('textStyle').color || undefined }}
                />
              </RichTextEditor.Control>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown p="xs" style={{ width: 230 }}>
            <Stack gap="xs">
              <Text size="xs" fw={600} c="dimmed">
                Text Color Palette
              </Text>
              <div className={classes.colorSwatchGrid}>
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    title={c.label}
                    aria-label={`Select text color ${c.label}`}
                    className={classes.colorSwatchBtn}
                    style={{ background: c.color }}
                    onClick={() => editor.chain().focus().setColor(c.color).run()}
                  />
                ))}
              </div>
              <Divider my={2} />
              <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed">
                  Custom
                </Text>
                <ColorPicker
                  format="hex"
                  value={customColor}
                  onChange={(val) => {
                    setCustomColor(val);
                    editor.chain().focus().setColor(val).run();
                  }}
                  size="xs"
                />
              </Group>
              <Button
                variant="subtle"
                color="gray"
                size="compact-xs"
                onClick={() => editor.chain().focus().unsetColor().run()}
              >
                Reset color
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>

        {/* Highlight Color */}
        <Popover position="bottom-start" withArrow shadow="md" withinPortal>
          <Popover.Target>
            <Tooltip label="Highlight color">
              <RichTextEditor.Control
                aria-label="Highlight Color"
                active={editor.isActive('highlight')}
              >
                <IconHighlight size={15} />
              </RichTextEditor.Control>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown p="xs" style={{ width: 220 }}>
            <Stack gap="xs">
              <Text size="xs" fw={600} c="dimmed">
                Background Highlight
              </Text>
              <div className={classes.colorSwatchGrid}>
                {HIGHLIGHT_PALETTE.map((h) => (
                  <button
                    key={h.color}
                    type="button"
                    title={h.label}
                    aria-label={`Select highlight color ${h.label}`}
                    className={classes.colorSwatchBtn}
                    style={{ background: h.color }}
                    onClick={() => editor.chain().focus().toggleHighlight({ color: h.color }).run()}
                  />
                ))}
              </div>
              <Button
                variant="subtle"
                color="gray"
                size="compact-xs"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
              >
                Remove highlight
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </RichTextEditor.ControlsGroup>

      {/* Alignment */}
      <RichTextEditor.ControlsGroup>
        <Tooltip label="Align Left">
          <RichTextEditor.Control
            aria-label="Align Left"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <IconAlignLeft size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Align Center">
          <RichTextEditor.Control
            aria-label="Align Center"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <IconAlignCenter size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Align Right">
          <RichTextEditor.Control
            aria-label="Align Right"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <IconAlignRight size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Justify">
          <RichTextEditor.Control
            aria-label="Justify"
            active={editor.isActive({ textAlign: 'justify' })}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          >
            <IconAlignJustified size={15} />
          </RichTextEditor.Control>
        </Tooltip>
      </RichTextEditor.ControlsGroup>

      {/* Lists, Tasks & Blocks */}
      <RichTextEditor.ControlsGroup>
        <Tooltip label="Bullet List">
          <RichTextEditor.Control
            aria-label="Bullet List"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <IconList size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Numbered List">
          <RichTextEditor.Control
            aria-label="Numbered List"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <IconListNumbers size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Interactive Checklist / Task List">
          <RichTextEditor.Control
            aria-label="Task List"
            active={editor.isActive('taskList')}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <IconCheckbox size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Blockquote">
          <RichTextEditor.Control
            aria-label="Blockquote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <IconBlockquote size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Code Block">
          <RichTextEditor.Control
            aria-label="Code Block"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <IconCode size={15} />
          </RichTextEditor.Control>
        </Tooltip>
        <Tooltip label="Horizontal Divider">
          <RichTextEditor.Control
            aria-label="Horizontal Rule"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <IconSeparator size={15} />
          </RichTextEditor.Control>
        </Tooltip>
      </RichTextEditor.ControlsGroup>

      {/* Table Suite */}
      <RichTextEditor.ControlsGroup>
        <Menu shadow="md" width={220} position="bottom-start" withinPortal>
          <Menu.Target>
            <Tooltip label="Table tools">
              <RichTextEditor.Control aria-label="Table options" active={editor.isActive('table')}>
                <IconTable size={15} />
              </RichTextEditor.Control>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Table Grid</Menu.Label>
            <Menu.Item
              leftSection={<IconTablePlus size={15} />}
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            >
              Insert Table (3×3)
            </Menu.Item>
            <Menu.Item
              leftSection={<IconTablePlus size={15} />}
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 4, cols: 2, withHeaderRow: true }).run()
              }
            >
              Insert Comparison Table (4×2)
            </Menu.Item>

            {editor.isActive('table') && (
              <>
                <Menu.Divider />
                <Menu.Label>Columns</Menu.Label>
                <Menu.Item
                  leftSection={<IconColumnInsertLeft size={15} />}
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                >
                  Insert Column Left
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconColumnInsertRight size={15} />}
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                >
                  Insert Column Right
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconColumnRemove size={15} />}
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                >
                  Delete Column
                </Menu.Item>

                <Menu.Divider />
                <Menu.Label>Rows</Menu.Label>
                <Menu.Item
                  leftSection={<IconRowInsertTop size={15} />}
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                >
                  Insert Row Above
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconRowInsertBottom size={15} />}
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                >
                  Insert Row Below
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconRowRemove size={15} />}
                  onClick={() => editor.chain().focus().deleteRow().run()}
                >
                  Delete Row
                </Menu.Item>

                <Menu.Divider />
                <Menu.Label>Structure & Merge</Menu.Label>
                <Menu.Item
                  leftSection={<IconTableRow size={15} />}
                  onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                >
                  Toggle Header Row
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTableMinus size={15} />}
                  onClick={() => editor.chain().focus().mergeOrSplit().run()}
                >
                  Merge / Split Cells
                </Menu.Item>

                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTableOff size={15} />}
                  onClick={() => editor.chain().focus().deleteTable().run()}
                >
                  Delete Table
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>
      </RichTextEditor.ControlsGroup>

      {/* Link & Image Embed */}
      <RichTextEditor.ControlsGroup>
        {/* Link Popover */}
        <Popover
          opened={linkPopoverOpened}
          onChange={setLinkPopoverOpened}
          position="bottom-start"
          withArrow
          shadow="md"
          withinPortal
        >
          <Popover.Target>
            <Tooltip label="Insert or edit link">
              <RichTextEditor.Control
                aria-label="Link"
                active={editor.isActive('link')}
                onClick={() => {
                  const previousUrl = editor.getAttributes('link').href;
                  if (previousUrl) {
                    setLinkUrl(previousUrl);
                  }
                  setLinkPopoverOpened((o) => !o);
                }}
              >
                <IconLink size={15} />
              </RichTextEditor.Control>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown p="sm" style={{ width: 280 }}>
            <Stack gap="xs">
              <Text size="xs" fw={600}>
                Insert Web Link
              </Text>
              {editor.state.selection.empty && (
                <TextInput
                  placeholder="Link text"
                  size="xs"
                  value={linkText}
                  onChange={(e) => setLinkText(e.currentTarget.value)}
                />
              )}
              <TextInput
                placeholder="https://example.com"
                size="xs"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    insertLink();
                  }
                }}
              />
              <Group justify="space-between">
                {editor.isActive('link') && (
                  <Button
                    variant="subtle"
                    color="red"
                    size="compact-xs"
                    leftSection={<IconUnlink size={12} />}
                    onClick={() => {
                      editor.chain().focus().unsetLink().run();
                      setLinkPopoverOpened(false);
                    }}
                  >
                    Unlink
                  </Button>
                )}
                <Button size="compact-xs" color="indigo" onClick={insertLink}>
                  Apply Link
                </Button>
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>

        {/* Image Popover */}
        <Popover
          opened={imagePopoverOpened}
          onChange={setImagePopoverOpened}
          position="bottom-start"
          withArrow
          shadow="md"
          withinPortal
        >
          <Popover.Target>
            <Tooltip label="Insert image by URL">
              <RichTextEditor.Control
                aria-label="Insert Image"
                onClick={() => setImagePopoverOpened((o) => !o)}
              >
                <IconPhoto size={15} />
              </RichTextEditor.Control>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown p="sm" style={{ width: 280 }}>
            <Stack gap="xs">
              <Text size="xs" fw={600}>
                Insert Image
              </Text>
              <TextInput
                placeholder="https://example.com/image.png"
                size="xs"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.currentTarget.value)}
              />
              <TextInput
                placeholder="Alt description (optional)"
                size="xs"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    insertImage();
                  }
                }}
              />
              <Group justify="flex-end">
                <Button size="compact-xs" color="indigo" onClick={insertImage}>
                  Insert Image
                </Button>
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </RichTextEditor.ControlsGroup>
    </div>
  );

  const editorContentNode = (
    <div className={classes.editorWrapper} style={{ minHeight }}>
      {/* Top Header Bar with Mode Badges and Vocabulary Power-Tools */}
      <div className={classes.toolbarHeader}>
        <div className={classes.toolbarTitleGroup}>
          <IconNotes size={16} style={{ color: '#6366f1' }} />
          <Text size="xs" fw={700} c="indigo" style={{ letterSpacing: '0.04em' }}>
            STUDY NOTEBOOK
          </Text>
          <Badge size="xs" variant="light" color={isPreview ? 'teal' : 'indigo'} radius="sm">
            {isPreview ? 'Preview Mode' : 'Visual WYSIWYG'}
          </Badge>
        </div>

        <div className={classes.toolbarActions}>
          {/* Vocab Study Templates Dropdown */}
          <Menu shadow="md" width={280} position="bottom-end" withinPortal>
            <Menu.Target>
              <Button
                variant="light"
                color="indigo"
                size="compact-xs"
                radius="md"
                leftSection={<IconLayoutGrid size={13} />}
              >
                Study Templates
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Vocabulary Study Cards & Matrices</Menu.Label>
              {VOCABULARY_TEMPLATES.map((tmpl) => (
                <Menu.Item
                  key={tmpl.id}
                  leftSection={<span>{tmpl.icon}</span>}
                  onClick={() => {
                    editor.chain().focus().insertContent(tmpl.html).run();
                  }}
                >
                  <div>
                    <Text size="xs" fw={600}>
                      {tmpl.title}
                    </Text>
                    <Text size="10px" c="dimmed">
                      {tmpl.description}
                    </Text>
                  </div>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>

          {/* Callout Blocks Dropdown */}
          <Menu shadow="md" width={220} position="bottom-end" withinPortal>
            <Menu.Target>
              <Button
                variant="light"
                color="violet"
                size="compact-xs"
                radius="md"
                leftSection={<IconSparkles size={13} />}
              >
                Callout Box
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Notion-style Callouts</Menu.Label>
              {CALLOUT_PRESETS.map((callout) => (
                <Menu.Item
                  key={callout.type}
                  leftSection={<span>{callout.icon}</span>}
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .insertContent(
                        `<div data-callout data-callout-type="${callout.type}" data-callout-icon="${callout.icon}" class="rich-callout rich-callout-${callout.type}"><div class="rich-callout-icon" contenteditable="false">${callout.icon}</div><div class="rich-callout-content"><p><strong>${callout.label}:</strong> Enter key note details...</p></div></div><p></p>`
                      )
                      .run();
                  }}
                >
                  <Text size="xs" fw={500}>
                    {callout.label}
                  </Text>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>

          {/* IPA & Study Symbols Inserter */}
          <Popover position="bottom-end" withArrow shadow="md" withinPortal width={300}>
            <Popover.Target>
              <Tooltip label="Insert IPA phonetics or study symbols">
                <ActionIcon variant="subtle" color="gray" size="sm" radius="md">
                  <IconLanguage size={15} />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown p="xs">
              <Tabs defaultValue="ipa">
                <Tabs.List grow mb="xs">
                  <Tabs.Tab value="ipa" fz="xs">
                    IPA Phonetics
                  </Tabs.Tab>
                  <Tabs.Tab value="symbols" fz="xs">
                    Study Symbols
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="ipa">
                  <div className={classes.symbolGrid}>
                    {IPA_SYMBOLS.map((s) => (
                      <button
                        key={s.symbol}
                        type="button"
                        title={s.name}
                        aria-label={`Insert symbol ${s.name}`}
                        className={classes.symbolBtn}
                        onClick={() => editor.chain().focus().insertContent(s.symbol).run()}
                      >
                        {s.symbol}
                      </button>
                    ))}
                  </div>
                </Tabs.Panel>

                <Tabs.Panel value="symbols">
                  <div className={classes.symbolGrid}>
                    {STUDY_SYMBOLS.map((s) => (
                      <button
                        key={s.symbol}
                        type="button"
                        title={s.name}
                        aria-label={`Insert study symbol ${s.name}`}
                        className={classes.symbolBtn}
                        onClick={() => editor.chain().focus().insertContent(` ${s.symbol} `).run()}
                      >
                        {s.symbol}
                      </button>
                    ))}
                  </div>
                </Tabs.Panel>
              </Tabs>
            </Popover.Dropdown>
          </Popover>

          {/* Live Preview Toggle */}
          <Tooltip label={isPreview ? 'Return to editing' : 'Preview rendered formatted note'}>
            <ActionIcon
              variant={isPreview ? 'filled' : 'subtle'}
              color={isPreview ? 'teal' : 'gray'}
              size="sm"
              radius="md"
              onClick={() => setIsPreview((p) => !p)}
            >
              <IconEye size={15} />
            </ActionIcon>
          </Tooltip>

          {/* Fullscreen Modal Toggle */}
          <Tooltip label={isFullscreen ? 'Exit Fullscreen' : 'Expand to Fullscreen Focus Mode'}>
            <ActionIcon
              variant="subtle"
              color="indigo"
              size="sm"
              radius="md"
              onClick={() => setIsFullscreen((f) => !f)}
            >
              {isFullscreen ? <IconMinimize size={15} /> : <IconMaximize size={15} />}
            </ActionIcon>
          </Tooltip>

          {/* More actions: Copy, Shortcuts, Clear */}
          <Menu shadow="md" width={190} position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="sm" radius="md">
                <IconCopy size={15} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Export / Copy</Menu.Label>
              <Menu.Item
                leftSection={
                  copiedNotification ? (
                    <IconCheck size={14} color="#10b981" />
                  ) : (
                    <IconCopy size={14} />
                  )
                }
                onClick={() => copyAs('html')}
              >
                Copy as HTML
              </Menu.Item>
              <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => copyAs('text')}>
                Copy Plain Text
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<IconHelp size={14} />} onClick={() => setHelpOpened(true)}>
                Keyboard Shortcuts
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                disabled={editor.isEmpty}
                onClick={() => setClearConfirmOpened(true)}
              >
                Clear Entire Note
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      </div>

      {/* Main Rich Text Editor Body */}
      {!isPreview ? (
        <RichTextEditor editor={editor} style={{ border: 'none' }}>
          {renderEditorControls()}
          <RichTextEditor.Content className={classes.editorContent} />
        </RichTextEditor>
      ) : (
        <div
          className={`${classes.previewContainer} rich-note-content`}
          dangerouslySetInnerHTML={{
            __html: editor.getHTML() || '<p><em>No note content yet.</em></p>',
          }}
        />
      )}

      {/* Bottom Status Bar with Word Count & Character Count */}
      <div className={classes.statusBar}>
        <Group gap="md">
          <span className={classes.statItem}>
            <strong>{wordCount}</strong> {wordCount === 1 ? 'word' : 'words'}
          </span>
          <span className={classes.statItem}>
            <strong>{charCount}</strong> characters
          </span>
          <span className={classes.statItem}>~{readingTime} min read</span>
        </Group>

        <Group gap="xs">
          {editor.isActive('table') && (
            <Badge size="xs" variant="outline" color="indigo">
              Inside Table
            </Badge>
          )}
          {editor.isActive('callout') && (
            <Badge size="xs" variant="outline" color="violet">
              Callout Block
            </Badge>
          )}
          {editor.isActive('taskList') && (
            <Badge size="xs" variant="outline" color="teal">
              Task Checklist
            </Badge>
          )}
        </Group>
      </div>
    </div>
  );

  return (
    <>
      {editorContentNode}

      {/* Fullscreen Distraction-Free Modal */}
      <Modal
        opened={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        size="90vw"
        radius="lg"
        title={
          <Group gap="xs">
            <IconFocus2 size={20} style={{ color: '#6366f1' }} />
            <Text fw={700} size="md">
              Fullscreen Study Note Editor
            </Text>
          </Group>
        }
        styles={{
          body: {
            padding: '12px',
          },
        }}
      >
        <div style={{ height: '78vh', display: 'flex', flexDirection: 'column' }}>
          {editorContentNode}
        </div>
      </Modal>

      {/* Clear Confirmation Modal */}
      <Modal
        opened={clearConfirmOpened}
        onClose={() => setClearConfirmOpened(false)}
        title="Clear Note Content"
        size="sm"
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to clear all contents of this note? This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={() => setClearConfirmOpened(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              size="xs"
              onClick={() => {
                editor.commands.clearContent();
                setClearConfirmOpened(false);
              }}
            >
              Clear Note
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Shortcuts & Guide Modal */}
      <Modal
        opened={helpOpened}
        onClose={() => setHelpOpened(false)}
        title="Rich Text Editor Shortcuts & Guide"
        size="md"
        radius="md"
      >
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            Use these handy markdown shortcuts and hotkeys to write rich vocabulary notes rapidly:
          </Text>
          <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
            <Group justify="space-between">
              <span>
                <strong>Ctrl + B</strong>
              </span>
              <span>Bold</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>Ctrl + I</strong>
              </span>
              <span>Italic</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>Ctrl + U</strong>
              </span>
              <span>Underline</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>Ctrl + Shift + X</strong>
              </span>
              <span>Strikethrough</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>Ctrl + E</strong>
              </span>
              <span>Inline code</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>Ctrl + Z / Ctrl + Y</strong>
              </span>
              <span>Undo / Redo</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong># + Space</strong>
              </span>
              <span>Heading 1</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>## + Space</strong>
              </span>
              <span>Heading 2</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>- or * + Space</strong>
              </span>
              <span>Bullet list</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>1. + Space</strong>
              </span>
              <span>Numbered list</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>[ ] + Space</strong>
              </span>
              <span>Task checklist item</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>&gt; + Space</strong>
              </span>
              <span>Blockquote</span>
            </Group>
            <Group justify="space-between">
              <span>
                <strong>--- + Enter</strong>
              </span>
              <span>Horizontal divider</span>
            </Group>
          </div>
        </Stack>
      </Modal>
    </>
  );
}
