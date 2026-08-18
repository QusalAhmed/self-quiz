import '@mantine/tiptap/styles.css';
import { Menu, Tooltip } from '@mantine/core';
import { Link, RichTextEditor } from '@mantine/tiptap';
import {
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconColumnRemove,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconRowRemove,
  IconTable,
  IconTableMinus,
  IconTableOff,
  IconTablePlus,
  IconTableRow,
  IconTrash,
} from '@tabler/icons-react';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import Underline from '@tiptap/extension-underline';
import { Editor, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect, useMemo } from 'react';

type RichNoteEditorProps = {
  value: string;
  onChange: (content: string) => void;
  minHeight?: number | string;
};

function TableControlGroup({ editor }: { editor: Editor | null }) {
  if (!editor) {
    return null;
  }

  const isInTable = editor.isActive('table');

  return (
    <RichTextEditor.ControlsGroup>
      <Menu shadow="md" width={210} position="bottom-start" withinPortal>
        <Menu.Target>
          <Tooltip label="Table actions">
            <RichTextEditor.Control
              aria-label="Table options"
              title="Table options"
              active={isInTable}
            >
              <IconTable size={16} />
            </RichTextEditor.Control>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Table</Menu.Label>
          <Menu.Item
            leftSection={<IconTablePlus size={16} />}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            Insert Table (3×3)
          </Menu.Item>

          {isInTable && (
            <>
              <Menu.Divider />
              <Menu.Label>Columns</Menu.Label>
              <Menu.Item
                leftSection={<IconColumnInsertLeft size={16} />}
                onClick={() => editor.chain().focus().addColumnBefore().run()}
              >
                Add Column Left
              </Menu.Item>
              <Menu.Item
                leftSection={<IconColumnInsertRight size={16} />}
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                Add Column Right
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconColumnRemove size={16} />}
                onClick={() => editor.chain().focus().deleteColumn().run()}
              >
                Delete Column
              </Menu.Item>

              <Menu.Divider />
              <Menu.Label>Rows</Menu.Label>
              <Menu.Item
                leftSection={<IconRowInsertTop size={16} />}
                onClick={() => editor.chain().focus().addRowBefore().run()}
              >
                Add Row Above
              </Menu.Item>
              <Menu.Item
                leftSection={<IconRowInsertBottom size={16} />}
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                Add Row Below
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconRowRemove size={16} />}
                onClick={() => editor.chain().focus().deleteRow().run()}
              >
                Delete Row
              </Menu.Item>

              <Menu.Divider />
              <Menu.Label>Format</Menu.Label>
              <Menu.Item
                leftSection={<IconTableRow size={16} />}
                onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              >
                Toggle Header Row
              </Menu.Item>
              <Menu.Item
                leftSection={<IconTableMinus size={16} />}
                onClick={() => editor.chain().focus().mergeOrSplit().run()}
              >
                Merge / Split Cells
              </Menu.Item>

              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTableOff size={16} />}
                onClick={() => editor.chain().focus().deleteTable().run()}
              >
                Delete Table
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>

      {isInTable && (
        <>
          <Tooltip label="Add column right">
            <RichTextEditor.Control
              aria-label="Add column right"
              title="Add column right"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <IconColumnInsertRight size={16} />
            </RichTextEditor.Control>
          </Tooltip>
          <Tooltip label="Add row below">
            <RichTextEditor.Control
              aria-label="Add row below"
              title="Add row below"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <IconRowInsertBottom size={16} />
            </RichTextEditor.Control>
          </Tooltip>
          <Tooltip label="Delete table">
            <RichTextEditor.Control
              aria-label="Delete table"
              title="Delete table"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <IconTableOff size={16} />
            </RichTextEditor.Control>
          </Tooltip>
        </>
      )}
    </RichTextEditor.ControlsGroup>
  );
}

export function RichNoteEditor({ value, onChange, minHeight = 140 }: RichNoteEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      Link,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
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
          <RichTextEditor.ClearFormatting />
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

        <TableControlGroup editor={editor} />

        <RichTextEditor.ControlsGroup style={{ marginLeft: 'auto' }}>
          <Tooltip label="Clear content">
            <RichTextEditor.Control
              aria-label="Clear content"
              title="Clear content"
              disabled={!editor || editor.isEmpty}
              onClick={() => {
                if (editor) {
                  editor.commands.clearContent();
                }
              }}
              style={{
                color:
                  !editor || editor.isEmpty ? undefined : 'var(--mantine-color-red-6, #e03131)',
              }}
            >
              <IconTrash size={16} />
            </RichTextEditor.Control>
          </Tooltip>
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>

      <RichTextEditor.Content style={{ minHeight: '100px' }} />
    </RichTextEditor>
  );
}
