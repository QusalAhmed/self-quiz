import '@mantine/tiptap/styles.css';
import { Link, RichTextEditor } from '@mantine/tiptap';
import Underline from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect, useMemo } from 'react';

type RichNoteEditorProps = {
  value: string;
  onChange: (content: string) => void;
  minHeight?: number | string;
};

export function RichNoteEditor({ value, onChange, minHeight = 140 }: RichNoteEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      Link,
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
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  return (
    <RichTextEditor editor={editor} style={{ minHeight }}>
      <RichTextEditor.Toolbar sticky stickyOffset={60}>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Underline />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.Code />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>

      <RichTextEditor.Content style={{ minHeight: '100px' }} />
    </RichTextEditor>
  );
}
