import {
  AlignCenter, AlignLeft, AlignRight, Bold, IndentDecrease, IndentIncrease, Italic, List, ListOrdered,
  Quote, Redo2, Strikethrough, Type, Underline, Undo2,
} from 'lucide-react';
import { ReactNode, useRef, useState } from 'react';

const ALIGNS = ['justifyLeft', 'justifyCenter', 'justifyRight'] as const;
const ALIGN_ICONS = [AlignLeft, AlignCenter, AlignRight];

function Tool({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  // onMouseDown preventDefault keeps the text selection while clicking toolbar buttons
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded-lg p-1.5 text-muted hover:text-ink hover:bg-surface-hover transition-colors"
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ onChange }: { onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(true);
  const [align, setAlign] = useState(0);
  const [heading, setHeading] = useState(false);

  const exec = (cmd: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    sync();
  };

  const sync = () => {
    const el = ref.current!;
    setEmpty(el.innerText.trim() === '' && !el.querySelector('li,blockquote'));
    onChange(el.innerHTML);
  };

  const Align = ALIGN_ICONS[align];
  const sep = <span className="mx-1 h-3.5 w-px bg-surface-border" />;

  return (
    <div className="rounded-xl border border-surface-border bg-night-800/70 p-4 transition-all focus-within:border-brand/40">
      <div className="relative min-h-[260px] flex flex-col justify-between">
        <div className="relative flex-1">
          {empty && (
            <span className="pointer-events-none absolute left-0 top-0 text-sm text-muted/60 select-none">
              Write your email body here… (supports rich text formatting, lists, quotes)
            </span>
          )}
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Email body"
            aria-multiline
            onInput={sync}
            className="min-h-[200px] text-sm text-[#f1f5f9] leading-relaxed outline-none [&_blockquote]:border-l-2 [&_blockquote]:border-brand/50 [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
            style={{ color: '#f1f5f9' }}
          />
        </div>

        {/* Floating action bar at bottom of editor */}
        <div className="mt-4 pt-3 border-t border-surface-border flex items-center gap-0.5 flex-wrap">
          <Tool label="Undo" onClick={() => exec('undo')}><Undo2 size={13} /></Tool>
          <Tool label="Redo" onClick={() => exec('redo')}><Redo2 size={13} /></Tool>
          {sep}
          <Tool label="Heading" onClick={() => { exec('formatBlock', heading ? 'p' : 'h2'); setHeading(!heading); }}><Type size={13} /></Tool>
          {sep}
          <Tool label="Bold" onClick={() => exec('bold')}><Bold size={13} /></Tool>
          <Tool label="Italic" onClick={() => exec('italic')}><Italic size={13} /></Tool>
          <Tool label="Underline" onClick={() => exec('underline')}><Underline size={13} /></Tool>
          {sep}
          <Tool label="Align" onClick={() => { const n = (align + 1) % 3; setAlign(n); exec(ALIGNS[n]); }}><Align size={13} /></Tool>
          {sep}
          <Tool label="Numbered list" onClick={() => exec('insertOrderedList')}><ListOrdered size={13} /></Tool>
          <Tool label="Bulleted list" onClick={() => exec('insertUnorderedList')}><List size={13} /></Tool>
          <Tool label="Indent" onClick={() => exec('indent')}><IndentIncrease size={13} /></Tool>
          <Tool label="Outdent" onClick={() => exec('outdent')}><IndentDecrease size={13} /></Tool>
          <Tool label="Quote" onClick={() => exec('formatBlock', 'blockquote')}><Quote size={13} /></Tool>
          {sep}
          <Tool label="Strikethrough" onClick={() => exec('strikeThrough')}><Strikethrough size={13} /></Tool>
        </div>
      </div>
    </div>
  );
}
