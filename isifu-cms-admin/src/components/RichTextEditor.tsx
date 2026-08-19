import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Fullscreen,
  Indent,
  Italic,
  Link,
  List,
  ListOrdered,
  Outdent,
  Quote,
  Redo2,
  Underline,
  Undo2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { SelectField } from './SelectField';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

type Tool = {
  label: string;
  icon: typeof Bold;
  command: string;
  value?: string;
  state?: string;
};

const blockOptions = [
  { label: t('rich.paragraph'), value: 'P' },
  { label: t('rich.heading2'), value: 'H2' },
  { label: t('rich.heading3'), value: 'H3' },
  { label: t('rich.heading4'), value: 'H4' },
  { label: t('rich.heading5'), value: 'H5' },
  { label: t('rich.heading6'), value: 'H6' },
  { label: t('rich.quote'), value: 'BLOCKQUOTE' },
  { label: t('rich.preformatted'), value: 'PRE' },
];

const tools: Tool[] = [
  { label: t('rich.bold'), icon: Bold, command: 'bold' },
  { label: t('rich.italic'), icon: Italic, command: 'italic' },
  { label: t('rich.underline'), icon: Underline, command: 'underline' },
  { label: t('rich.alignLeft'), icon: AlignLeft, command: 'justifyLeft' },
  { label: t('rich.alignCenter'), icon: AlignCenter, command: 'justifyCenter' },
  { label: t('rich.alignRight'), icon: AlignRight, command: 'justifyRight' },
  { label: t('rich.alignJustify'), icon: AlignJustify, command: 'justifyFull' },
  { label: t('rich.bullets'), icon: List, command: 'insertUnorderedList' },
  { label: t('rich.ordered'), icon: ListOrdered, command: 'insertOrderedList' },
  { label: t('rich.outdent'), icon: Outdent, command: 'outdent' },
  { label: t('rich.indent'), icon: Indent, command: 'indent' },
  { label: t('rich.quote'), icon: Quote, command: 'formatBlock', value: 'BLOCKQUOTE', state: 'blockquote' },
  { label: t('rich.undo'), icon: Undo2, command: 'undo' },
  { label: t('rich.redo'), icon: Redo2, command: 'redo' },
  { label: t('rich.clear'), icon: Eraser, command: 'removeFormat' },
];

export function RichTextEditor({ value, onChange }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <EditorShell value={value} onChange={onChange} onFullscreen={() => setIsFullscreen(true)} />
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h3 className="text-base font-semibold text-stone-950">{t('rich.fullscreen')}</h3>
              <button
                type="button"
                className="rounded-md p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                onClick={() => setIsFullscreen(false)}
                aria-label={t('common.cancel')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-4">
              <EditorShell value={value} onChange={onChange} fullscreen showFullscreenButton={false} onFullscreen={() => setIsFullscreen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditorShell({
  value,
  onChange,
  fullscreen,
  showFullscreenButton = true,
  onFullscreen,
}: Props & {
  fullscreen?: boolean;
  showFullscreenButton?: boolean;
  onFullscreen: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastLocalValue = useRef('');
  const [active, setActive] = useState<Set<string>>(new Set());
  const [block, setBlock] = useState('P');

  useEffect(() => {
    if (editorRef.current && value !== lastLocalValue.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  function emitChange() {
    const next = editorRef.current?.innerHTML ?? '';
    lastLocalValue.current = next;
    onChange(next);
  }

  function normalizeBlockName(name: string) {
    const normalized = name.replace(/[<>]/g, '').toUpperCase() || 'P';
    if (normalized === 'DIV') return 'P';
    return blockOptions.some((option) => option.value === normalized) ? normalized : 'P';
  }

  function refreshActiveState() {
    const next = new Set<string>();
    for (const tool of tools) {
      try {
        if (tool.command !== 'undo' && tool.command !== 'redo' && tool.command !== 'removeFormat' && document.queryCommandState(tool.command)) {
          next.add(tool.state ?? tool.command);
        }
      } catch {
        // Some browser commands do not expose a queryable state.
      }
    }

    try {
      const currentBlock = normalizeBlockName(String(document.queryCommandValue('formatBlock') || 'P'));
      setBlock((current) => (current === currentBlock ? current : currentBlock));
      if (currentBlock === 'BLOCKQUOTE') next.add('blockquote');
    } catch {
      setBlock((current) => (current === 'P' ? current : 'P'));
    }

    setActive((current) => {
      if (current.size === next.size && [...current].every((item) => next.has(item))) return current;
      return next;
    });
  }

  function command(name: string, argument?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, argument);
    emitChange();
  }

  function changeBlock(nextBlock: string) {
    command('formatBlock', nextBlock);
    setBlock(nextBlock);
  }

  function addLink() {
    const url = window.prompt('https://');
    if (url) command('createLink', url);
  }

  return (
    <div className={`flex ${fullscreen ? 'h-full' : ''} flex-col overflow-hidden rounded-md border border-stone-300 bg-white`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-stone-50 p-2">
        <SelectField
          className="w-44"
          buttonClassName="h-9 px-2 text-sm"
          value={block}
          options={blockOptions}
          onChange={changeBlock}
          onMouseUp={refreshActiveState}
        />
        {tools.map(({ label, icon: Icon, command: toolCommand, value: toolValue, state }) => {
          const activeKey = state ?? toolCommand;
          const isActive = active.has(activeKey);
          return (
            <button
              key={`${label}-${toolCommand}`}
              type="button"
              title={label}
              aria-label={label}
              className={`rounded p-2 transition ${
                isActive ? 'accent-bg shadow-sm' : 'text-stone-600 hover:bg-white hover:text-stone-950'
              }`}
              onClick={() => command(toolCommand, toolValue)}
            >
              <Icon size={16} />
            </button>
          );
        })}
        <button type="button" title={t('rich.link')} aria-label={t('rich.link')} className="rounded p-2 text-stone-600 transition hover:bg-white hover:text-stone-950" onClick={addLink}>
          <Link size={16} />
        </button>
        <label className="grid h-9 w-9 cursor-pointer place-items-center rounded text-stone-600 transition hover:bg-white hover:text-stone-950" title={t('rich.textColor')}>
          <span className="h-4 w-4 rounded-full border border-stone-300 bg-stone-950" />
          <input className="sr-only" type="color" onChange={(event) => command('foreColor', event.target.value)} />
        </label>
        <label className="grid h-9 w-9 cursor-pointer place-items-center rounded text-stone-600 transition hover:bg-white hover:text-stone-950" title={t('rich.backgroundColor')}>
          <span className="h-4 w-4 rounded-full border border-stone-300 bg-yellow-200" />
          <input className="sr-only" type="color" onChange={(event) => command('hiliteColor', event.target.value)} />
        </label>
        {showFullscreenButton && (
          <button
            type="button"
            title={fullscreen ? t('rich.closeFullscreen') : t('rich.fullscreen')}
            aria-label={fullscreen ? t('rich.closeFullscreen') : t('rich.fullscreen')}
            className="ml-auto rounded p-2 text-stone-600 transition hover:bg-white hover:text-stone-950"
            onClick={onFullscreen}
          >
            {fullscreen ? <X size={16} /> : <Fullscreen size={16} />}
          </button>
        )}
      </div>
      <div
        ref={editorRef}
        className={`rich-editor ${fullscreen ? 'min-h-0 flex-1 overflow-auto text-base' : 'min-h-40 text-sm'} px-4 py-3 font-normal leading-7 outline-none`}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onKeyUp={refreshActiveState}
        onMouseUp={refreshActiveState}
      />
    </div>
  );
}
