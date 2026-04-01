'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Workflow, WorkflowInput, WorkflowResult } from '@/lib/types';
import { getWorkflow, incrementRunCount } from '@/lib/storage';
import { runWorkflow as mockRunWorkflow } from '@/lib/mock-api';

// ── Severity ───────────────────────────────────────────────────────────────
const SEV: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  low:      { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-l-emerald-400', dot: 'bg-emerald-400', label: 'Low' },
  medium:   { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-l-amber-400',   dot: 'bg-amber-400',   label: 'Medium' },
  high:     { bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-l-orange-500',  dot: 'bg-orange-500',  label: 'High' },
  critical: { bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-l-red-500',     dot: 'bg-red-500',     label: 'Critical' },
};

const RISK_BADGE: Record<string, string> = {
  low:      'bg-emerald-100 text-emerald-700',
  medium:   'bg-amber-100  text-amber-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100    text-red-700',
};

const STEP_ICONS: Record<string, string> = {
  extract: '📤', analyze: '🔍', compare: '⚖️', flag: '🚩',
  summarize: '📌', calculate: '🧮', validate: '✅',
};

type FileMap = Record<string, File[]>;

// ── Custom Upload Zone per type ────────────────────────────────────────────
function CsvUploadZone({ input, files, onSelect, onRemove, dragRef, onDrop, onDragOver, onDragLeave }: UploadZoneProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden transition-all hover:border-emerald-400 hover:shadow-md" ref={dragRef}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
      {/* Header stripe */}
      <div className="bg-emerald-500 px-4 py-2.5 flex items-center gap-2">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
        </svg>
        <span className="text-white font-semibold text-sm">{input.name}</span>
        {input.required && <span className="ml-auto text-emerald-100 text-xs font-medium bg-emerald-600 px-2 py-0.5 rounded-full">Required</span>}
        {!input.required && <span className="ml-auto text-emerald-200 text-xs">Optional</span>}
      </div>
      {/* Body */}
      <div className="p-4">
        <p className="text-xs text-emerald-700 mb-3">{input.description}</p>
        {/* Spreadsheet illustration */}
        <div className="mb-3 rounded-xl overflow-hidden border border-emerald-200 bg-white shadow-sm">
          <div className="grid grid-cols-4 bg-emerald-100 border-b border-emerald-200">
            {['A','B','C','D'].map(c => <div key={c} className="text-center text-xs font-bold text-emerald-600 py-1 border-r border-emerald-200 last:border-0">{c}</div>)}
          </div>
          {[0,1,2].map(r => (
            <div key={r} className="grid grid-cols-4 border-b border-emerald-100 last:border-0">
              {[0,1,2,3].map(c => (
                <div key={c} className={`h-4 m-1 rounded ${r === 0 && c === 0 ? 'bg-emerald-200' : r === 0 ? 'bg-emerald-100' : 'bg-slate-100'}`} />
              ))}
            </div>
          ))}
        </div>
        <DropTarget input={input} files={files} onSelect={onSelect} onRemove={onRemove}
          accept=".csv,.tsv,.xlsx,.txt"
          emptyLabel="Drop CSV / Excel file here"
          fileIcon={<span className="text-emerald-500 font-bold text-xs bg-emerald-100 px-1.5 py-0.5 rounded">CSV</span>}
        />
      </div>
    </div>
  );
}

function PdfUploadZone({ input, files, onSelect, onRemove, dragRef, onDrop, onDragOver, onDragLeave }: UploadZoneProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-rose-300 bg-gradient-to-br from-rose-50 to-pink-50 overflow-hidden transition-all hover:border-rose-400 hover:shadow-md" ref={dragRef}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
      <div className="bg-rose-500 px-4 py-2.5 flex items-center gap-2">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-white font-semibold text-sm">{input.name}</span>
        {input.required && <span className="ml-auto text-rose-100 text-xs font-medium bg-rose-600 px-2 py-0.5 rounded-full">Required</span>}
        {!input.required && <span className="ml-auto text-rose-200 text-xs">Optional</span>}
      </div>
      <div className="p-4">
        <p className="text-xs text-rose-700 mb-3">{input.description}</p>
        {/* PDF illustration */}
        <div className="mb-3 flex items-start gap-2 bg-white rounded-xl border border-rose-200 p-3 shadow-sm">
          <div className="w-8 h-10 bg-rose-500 rounded-sm flex-shrink-0 flex items-end justify-center pb-1 relative">
            <div className="absolute top-0 right-0 w-0 h-0 border-l-8 border-b-8 border-l-rose-300 border-b-rose-700" />
            <span className="text-white text-[8px] font-bold">PDF</span>
          </div>
          <div className="flex-1 space-y-1.5 pt-1">
            <div className="h-1.5 bg-slate-200 rounded w-full" />
            <div className="h-1.5 bg-slate-200 rounded w-4/5" />
            <div className="h-1.5 bg-slate-100 rounded w-full" />
            <div className="h-1.5 bg-slate-100 rounded w-3/4" />
          </div>
        </div>
        <DropTarget input={input} files={files} onSelect={onSelect} onRemove={onRemove}
          accept=".pdf"
          emptyLabel="Drop PDF document here"
          fileIcon={<span className="text-rose-500 font-bold text-xs bg-rose-100 px-1.5 py-0.5 rounded">PDF</span>}
        />
      </div>
    </div>
  );
}

function ImageUploadZone({ input, files, onSelect, onRemove, dragRef, onDrop, onDragOver, onDragLeave }: UploadZoneProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  return (
    <div className="rounded-2xl border-2 border-dashed border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 overflow-hidden transition-all hover:border-violet-400 hover:shadow-md" ref={dragRef}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
      <div className="bg-violet-500 px-4 py-2.5 flex items-center gap-2">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-white font-semibold text-sm">{input.name}</span>
        {input.required && <span className="ml-auto text-violet-100 text-xs font-medium bg-violet-600 px-2 py-0.5 rounded-full">Required</span>}
        {!input.required && <span className="ml-auto text-violet-200 text-xs">Optional</span>}
      </div>
      <div className="p-4">
        <p className="text-xs text-violet-700 mb-3">{input.description}</p>
        {/* Image preview grid or placeholder */}
        {previews.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {previews.map((url, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={files[i]?.name} className="w-full h-20 object-cover rounded-lg border border-violet-200" />
                <button onClick={() => onRemove(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="absolute bottom-1 left-1 right-1 bg-black/50 rounded text-white text-[9px] px-1 truncate">{files[i]?.name}</div>
              </div>
            ))}
            {input.multiple && (
              <button onClick={() => document.getElementById(`file-${input.id}`)?.click()}
                className="w-full h-20 rounded-lg border-2 border-dashed border-violet-300 flex items-center justify-center text-violet-400 hover:text-violet-600 hover:border-violet-400 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            )}
          </div>
        ) : (
          <div className="mb-3 bg-white rounded-xl border border-violet-200 p-3 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-violet-800">Invoice / Receipt / Document scan</p>
              <p className="text-xs text-violet-500 mt-0.5">JPG, PNG, GIF, WebP supported</p>
            </div>
          </div>
        )}
        <input type="file" id={`file-${input.id}`} className="hidden" accept=".jpg,.jpeg,.png,.gif,.webp"
          multiple={input.multiple} onChange={(e) => onSelect(e.target.files)} />
        {previews.length === 0 && (
          <button onClick={() => document.getElementById(`file-${input.id}`)?.click()}
            className="w-full py-2.5 text-sm font-medium text-violet-600 bg-violet-100 hover:bg-violet-200 rounded-xl transition-colors flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            Choose Image{input.multiple ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}

function SqlUploadZone({ input, files, onSelect, onRemove, dragRef, onDrop, onDragOver, onDragLeave }: UploadZoneProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden transition-all hover:border-amber-400 hover:shadow-md" ref={dragRef}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
      <div className="bg-amber-500 px-4 py-2.5 flex items-center gap-2">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
        <span className="text-white font-semibold text-sm">{input.name}</span>
        {input.required && <span className="ml-auto text-amber-100 text-xs font-medium bg-amber-600 px-2 py-0.5 rounded-full">Required</span>}
        {!input.required && <span className="ml-auto text-amber-200 text-xs">Optional</span>}
      </div>
      <div className="p-4">
        <p className="text-xs text-amber-700 mb-3">{input.description}</p>
        {/* SQL illustration */}
        <div className="mb-3 bg-slate-900 rounded-xl border border-amber-200 p-3 shadow-sm font-mono text-xs leading-relaxed">
          <span className="text-blue-400">SELECT</span><span className="text-slate-300"> * </span>
          <span className="text-blue-400">FROM</span><span className="text-green-400"> transactions</span><br />
          <span className="text-blue-400">WHERE</span><span className="text-slate-300"> amount </span>
          <span className="text-amber-400">&gt;</span><span className="text-purple-400"> 10000</span><br />
          <span className="text-blue-400">ORDER BY</span><span className="text-slate-300"> date </span>
          <span className="text-blue-400">DESC</span><span className="text-slate-500">;</span>
        </div>
        <DropTarget input={input} files={files} onSelect={onSelect} onRemove={onRemove}
          accept=".sql,.txt,.csv,.tsv"
          emptyLabel="Drop SQL file or export here"
          fileIcon={<span className="text-amber-600 font-bold text-xs bg-amber-100 px-1.5 py-0.5 rounded">SQL</span>}
        />
      </div>
    </div>
  );
}

// ── Generic DropTarget inside each zone ───────────────────────────────────
interface DropTargetProps {
  input: WorkflowInput;
  files: File[];
  onSelect: (fl: FileList | null) => void;
  onRemove: (idx: number) => void;
  accept: string;
  emptyLabel: string;
  fileIcon: React.ReactNode;
}

function DropTarget({ input, files, onSelect, onRemove, accept, emptyLabel, fileIcon }: DropTargetProps) {
  return (
    <>
      <input type="file" id={`file-${input.id}`} className="hidden" accept={accept}
        multiple={input.multiple} onChange={(e) => onSelect(e.target.files)} />
      {files.length === 0 ? (
        <button onClick={() => document.getElementById(`file-${input.id}`)?.click()}
          className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 flex flex-col items-center gap-1 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors bg-white/60">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          <span className="text-xs font-medium">{emptyLabel}</span>
          <span className="text-xs text-slate-400">or click to browse</span>
        </button>
      ) : (
        <div className="space-y-1.5">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 shadow-sm">
              {fileIcon}
              <span className="flex-1 text-xs font-medium text-slate-700 truncate">{file.name}</span>
              <span className="text-xs text-slate-400 flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => onRemove(i)} className="flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          {input.multiple && (
            <button onClick={() => document.getElementById(`file-${input.id}`)?.click()}
              className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add another file
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ── Upload zone props ─────────────────────────────────────────────────────
interface UploadZoneProps {
  input: WorkflowInput;
  files: File[];
  onSelect: (fl: FileList | null) => void;
  onRemove: (idx: number) => void;
  dragRef: (el: HTMLDivElement | null) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function WorkflowPageWrapper() {
  return <Suspense><WorkflowPage /></Suspense>;
}

function WorkflowPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [fileMap, setFileMap] = useState<FileMap>({});
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runStage, setRunStage] = useState(0);
  const [activeTab, setActiveTab] = useState<'run' | 'details'>('run');
  const [wizardStep, setWizardStep] = useState<'upload' | 'map_files' | 'run'>('upload');
  const resultsRef = useRef<HTMLDivElement>(null);
  const dropZoneRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const w = getWorkflow(id);
    if (!w) { router.push('/'); return; }
    setWorkflow(w);

    // Auto-populate dummy files for every input so the prototype works without uploads
    const dummyMap: FileMap = {};
    for (const input of w.inputs) {
      const fileName = input.name.toLowerCase().replace(/\s+/g, '_');
      let content = '';
      let mimeType = 'text/plain';

      if (input.type === 'csv') {
        mimeType = 'text/csv';
        content = `id,name,amount,date,status\n1,Sample Entry A,48000,2026-01-15,approved\n2,Sample Entry B,92500,2026-01-18,pending\n3,Sample Entry C,13750,2026-01-22,approved\n4,Sample Entry D,205000,2026-02-01,flagged\n5,Sample Entry E,67000,2026-02-14,approved`;
      } else if (input.type === 'pdf') {
        mimeType = 'application/pdf';
        content = `%PDF-1.4 dummy content for ${input.name}`;
      } else if (input.type === 'image') {
        mimeType = 'image/png';
        content = `dummy image data for ${input.name}`;
      } else if (input.type === 'sql') {
        mimeType = 'text/plain';
        content = `SELECT * FROM transactions WHERE amount > 10000 ORDER BY date DESC;`;
      }

      const blob = new Blob([content], { type: mimeType });
      const ext = input.type === 'csv' ? 'csv' : input.type === 'pdf' ? 'pdf' : input.type === 'image' ? 'png' : 'sql';
      const file = new File([blob], `${fileName}_sample.${ext}`, { type: mimeType });
      dummyMap[input.id] = [file];
    }
    setFileMap(dummyMap);
  }, [id, router]);

  function handleFileSelect(inputId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const input = workflow?.inputs.find((i) => i.id === inputId);
    if (!input?.multiple) {
      setFileMap((prev) => ({ ...prev, [inputId]: [files[0]] }));
    } else {
      setFileMap((prev) => ({ ...prev, [inputId]: [...(prev[inputId] ?? []), ...Array.from(files)] }));
    }
  }

  function handleDrop(inputId: string, e: React.DragEvent) {
    e.preventDefault();
    dropZoneRefs.current[inputId]?.classList.remove('ring-2', 'ring-blue-400', 'scale-[1.01]');
    handleFileSelect(inputId, e.dataTransfer.files);
  }

  function handleDragOver(inputId: string, e: React.DragEvent) {
    e.preventDefault();
    dropZoneRefs.current[inputId]?.classList.add('ring-2', 'ring-blue-400', 'scale-[1.01]');
  }

  function handleDragLeave(inputId: string) {
    dropZoneRefs.current[inputId]?.classList.remove('ring-2', 'ring-blue-400', 'scale-[1.01]');
  }

  function removeFile(inputId: string, fileIndex: number) {
    setFileMap((prev) => ({ ...prev, [inputId]: (prev[inputId] ?? []).filter((_, i) => i !== fileIndex) }));
  }

  const allRequiredFilled = workflow?.inputs
    .filter((i) => i.required)
    .every((i) => (fileMap[i.id]?.length ?? 0) > 0) ?? false;

  const totalFiles = Object.values(fileMap).flat().length;

  const STAGES = ['Uploading files…', 'Processing inputs…', 'Running AI analysis…', 'Generating findings…', 'Formatting results…'];

  async function runWorkflow() {
    if (!workflow || !allRequiredFilled) return;
    setIsRunning(true);
    setResult(null);
    setError(null);
    setRunStage(0);

    const stageInterval = setInterval(() => {
      setRunStage((s) => { if (s < STAGES.length - 2) return s + 1; clearInterval(stageInterval); return s; });
    }, 2000);

    try {
      const data = await mockRunWorkflow(workflow);

      clearInterval(stageInterval);
      setRunStage(STAGES.length - 1);

      setResult(data.result as WorkflowResult);
      incrementRunCount(workflow.id);
      setWorkflow(getWorkflow(id)!);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    } catch (err) {
      clearInterval(stageInterval);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  }

  function renderUploadZone(input: WorkflowInput) {
    const files = fileMap[input.id] ?? [];
    const sharedProps: UploadZoneProps = {
      input,
      files,
      onSelect: (fl) => handleFileSelect(input.id, fl),
      onRemove: (idx) => removeFile(input.id, idx),
      dragRef: (el) => { dropZoneRefs.current[input.id] = el; },
      onDrop: (e) => handleDrop(input.id, e),
      onDragOver: (e) => handleDragOver(input.id, e),
      onDragLeave: () => handleDragLeave(input.id),
    };
    switch (input.type) {
      case 'csv':   return <CsvUploadZone   key={input.id} {...sharedProps} />;
      case 'pdf':   return <PdfUploadZone   key={input.id} {...sharedProps} />;
      case 'image': return <ImageUploadZone key={input.id} {...sharedProps} />;
      case 'sql':   return <SqlUploadZone   key={input.id} {...sharedProps} />;
      default:      return <CsvUploadZone   key={input.id} {...sharedProps} />;
    }
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-800 transition-all duration-200 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              All Workflows
            </Link>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-sm font-medium text-gray-800 truncate max-w-xs">{workflow.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
            {workflow.runCount} runs
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Workflow header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-none">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{workflow.category}</span>
                <span className="text-slate-200">•</span>
                <span className="text-xs text-slate-400">{workflow.inputs.length} input{workflow.inputs.length !== 1 ? 's' : ''}</span>
                <span className="text-slate-200">•</span>
                <span className="text-xs text-slate-400">{workflow.steps.length} steps</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{workflow.name}</h1>
              <p className="text-slate-500 leading-relaxed text-sm">{workflow.description}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 flex-shrink-0 max-w-[200px]">
              {workflow.tags?.slice(0, 4).map((tag) => (
                <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">#{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {(['run', 'details'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab === 'run' ? 'Run Workflow' : 'Workflow Details'}
            </button>
          ))}
        </div>

        {/* ── DETAILS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Processing Steps</h3>
              <div className="space-y-3">
                {workflow.steps.map((step, i) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-600">{i + 1}</div>
                      {i < workflow.steps.length - 1 && <div className="w-0.5 h-4 bg-violet-100 my-0.5" />}
                    </div>
                    <div className="flex-1 py-1">
                      <div className="flex items-center gap-2">
                        <span>{STEP_ICONS[step.type] ?? '⚡'}</span>
                        <span className="text-sm font-medium text-slate-800">{step.name}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{step.type}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 ml-6">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">AI Logic Prompt</h3>
              <p className="text-sm text-slate-600 leading-relaxed italic bg-slate-50 rounded-xl p-4 border border-slate-100">
                &ldquo;{workflow.logicPrompt}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* ── RUN TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'run' && wizardStep === 'upload' && (
          <>
            {/* Input legend */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(['csv', 'pdf', 'image', 'sql'] as const).filter(t => workflow.inputs.some(i => i.type === t)).map(t => (
                <span key={t} className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  t === 'csv' ? 'bg-emerald-100 text-emerald-700' :
                  t === 'pdf' ? 'bg-rose-100 text-rose-700' :
                  t === 'image' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <span className="w-2 h-2 rounded-full inline-block bg-current opacity-70" />
                  {t.toUpperCase()} input
                </span>
              ))}
            </div>

            {/* Upload grid */}
            <div className={`grid gap-4 mb-6 ${workflow.inputs.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 md:grid-cols-2'}`}>
              {workflow.inputs.map((input) => renderUploadZone(input))}
            </div>

            {/* Continue to Map Files */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
              <button onClick={() => setWizardStep('map_files')} disabled={!allRequiredFilled}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-200 disabled:shadow-none">
                Continue to Map Files
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

          </>
        )}

        {/* ── MAP FILES STEP ───────────────────────────────────────────────── */}
        {activeTab === 'run' && wizardStep === 'map_files' && (
          <div className="flex gap-6">
            {/* Left: AI chat + step progress */}
            <div className="w-64 flex-shrink-0 space-y-4">
              {/* Steps sidebar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                {[
                  { label: 'Write prompt', done: true },
                  { label: 'Upload Files', done: true },
                  { label: 'Map Files', done: false, current: true },
                  { label: 'Map Columns', done: false },
                  { label: 'Review & Run', done: false },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      s.done ? 'bg-emerald-500 text-white' :
                      s.current ? 'bg-blue-600 text-white' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {s.done ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${s.current ? 'font-semibold text-slate-900' : s.done ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* AI chat bubble */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">I</div>
                  <span className="text-xs font-semibold text-slate-700">AI Assistant</span>
                  <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">EXAMPLE</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  I&apos;ve pre-populated the required files for you. Click <strong>Verify with Ira</strong> to proceed.
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Great! I&apos;ve detected all required files. I&apos;ve automatically suggested mappings for them. Please review the <strong>Map Files</strong> step in the middle section.
                </p>
                <div className="pt-1">
                  <input placeholder="Describe what you need..." className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" readOnly />
                </div>
              </div>
            </div>

            {/* Center: File mapping cards */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">File Mapping</h2>
                      <p className="text-xs text-slate-500">Ira has automatically suggested these file associations</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    AI-SUGGESTED MAPPINGS
                  </button>
                </div>

                {/* Mapping cards */}
                <div className="p-5 space-y-4">
                  {workflow.inputs.map((input, i) => {
                    const mappedFile = fileMap[input.id]?.[0];
                    const confidence = 98 - i * 3;
                    return (
                      <div key={input.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="grid grid-cols-2">
                          {/* Expected schema */}
                          <div className="p-4 bg-slate-50 border-r border-slate-200">
                            <div className="flex items-center gap-1.5 mb-2">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Expected Schema</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900 mb-1">{input.name}</p>
                            <p className="text-xs text-slate-500 leading-relaxed">{input.description}</p>
                          </div>
                          {/* Mapped source */}
                          <div className="p-4 bg-white">
                            <div className="flex items-center gap-1.5 mb-2">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mapped Source</span>
                              <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">{confidence}% MATCH</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-700 truncate flex-1">
                                {mappedFile?.name ?? `${input.name.toLowerCase().replace(/\s+/g, '_')}_sample.${input.type}`}
                              </span>
                              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0">Change</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer CTA */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Review each mapping carefully before proceeding to column alignment.</p>
                  <button onClick={() => setWizardStep('run')}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                    Confirm &amp; Align Columns
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              {/* Back link */}
              <button onClick={() => setWizardStep('upload')} className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                ← Back to Upload Files
              </button>
            </div>

            {/* Right: Query Execution Plan */}
            <div className="w-56 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Query Execution Plan</h3>
                <div className="space-y-3">
                  {workflow.steps.map((step, i) => (
                    <div key={step.id} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5 ${
                        i === workflow.steps.length - 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>{i + 1}</div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{step.name}</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RUN STEP (error + results) ───────────────────────────────────── */}
        {activeTab === 'run' && wizardStep === 'run' && (
          <>
            {/* Run trigger */}
            {!isRunning && !result && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
                <button onClick={runWorkflow}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-200">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Workflow
                  {totalFiles > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{totalFiles} file{totalFiles !== 1 ? 's' : ''}</span>}
                </button>
                <button onClick={() => setWizardStep('map_files')} className="mt-3 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  ← Back to Map Files
                </button>
              </div>
            )}

            {/* Running progress */}
            {isRunning && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700">{STAGES[runStage]}</span>
                  <span className="text-xs text-slate-400 ml-auto">{runStage + 1}/{STAGES.length}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${((runStage + 1) / STAGES.length) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Workflow failed</p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div ref={resultsRef} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Results</h2>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${RISK_BADGE[result.metrics?.risk_level ?? 'low']}`}>
                    {(result.metrics?.risk_level ?? 'low').toUpperCase()} RISK
                  </span>
                </div>

                {/* Metrics */}
                {result.metrics && (
                  <div className="grid grid-cols-3 gap-3">
                    {result.metrics.records_analyzed !== undefined && (
                      <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-slate-900">{Number(result.metrics.records_analyzed).toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Records Analyzed</div>
                      </div>
                    )}
                    {result.metrics.issues_found !== undefined && (
                      <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-rose-600">{result.metrics.issues_found}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Issues Found</div>
                      </div>
                    )}
                    <div className={`rounded-xl border p-4 text-center shadow-sm ${RISK_BADGE[result.metrics.risk_level ?? 'low']}`}>
                      <div className="text-2xl font-bold capitalize">{result.metrics.risk_level ?? 'low'}</div>
                      <div className="text-xs opacity-70 mt-0.5">Risk Level</div>
                    </div>
                  </div>
                )}

                {/* Summary banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div>
                    <p className="text-xs font-semibold text-blue-800 mb-0.5">Executive Summary</p>
                    <p className="text-sm text-blue-700 leading-relaxed">{result.summary}</p>
                  </div>
                </div>

                {/* Flags */}
                {result.type === 'flags' && result.flags && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Findings ({result.flags.length})</h3>
                      <div className="flex gap-1.5">
                        {(['critical','high','medium','low'] as const).map((sev) => {
                          const count = result.flags!.filter(f => f.severity === sev).length;
                          return count ? <span key={sev} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEV[sev].text} ${SEV[sev].bg}`}>{count} {sev}</span> : null;
                        })}
                      </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {result.flags.map((flag) => {
                        const s = SEV[flag.severity] ?? SEV.medium;
                        return (
                          <div key={flag.id} className={`p-4 border-l-4 ${s.border} ${s.bg}`}>
                            <div className="flex items-start gap-3">
                              <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-white/70 ${s.text}`}>{s.label}</span>
                                  {flag.reference && <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{flag.reference}</span>}
                                </div>
                                <p className="text-sm font-medium text-slate-800">{flag.description}</p>
                                {flag.recommendation && (
                                  <p className="text-xs text-slate-500 mt-1.5 flex items-start gap-1">
                                    <span className="text-slate-400 font-bold flex-shrink-0">→</span>
                                    {flag.recommendation}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Table */}
                {result.type === 'table' && result.table && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h3 className="font-semibold text-slate-900">{result.title}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            {result.table.headers.map((h) => (
                              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-slate-100">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {result.table.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              {row.map((cell, j) => <td key={j} className="px-4 py-3 text-slate-700 text-xs">{String(cell)}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">{result.table.rows.length} records</div>
                  </div>
                )}

                {/* Report */}
                {result.type === 'report' && result.report && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">{result.title}</h3></div>
                    <div className="p-5 prose-audit" dangerouslySetInnerHTML={{ __html: markdownToHtml(result.report) }} />
                  </div>
                )}

                {/* Summary */}
                {result.type === 'summary' && (
                  <div className="space-y-3">
                    {(result as WorkflowResult & { key_findings?: string[] }).key_findings && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="font-semibold text-slate-900 mb-3">Key Findings</h3>
                        <ul className="space-y-2">
                          {(result as WorkflowResult & { key_findings?: string[] }).key_findings!.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="text-blue-500 font-bold flex-shrink-0 mt-0.5">•</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(result as WorkflowResult & { recommendations?: string[] }).recommendations && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="font-semibold text-slate-900 mb-3">Recommendations</h3>
                        <ul className="space-y-2">
                          {(result as WorkflowResult & { recommendations?: string[] }).recommendations!.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="text-emerald-500 font-bold flex-shrink-0 mt-0.5">→</span>{r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* JSON */}
                {result.type === 'json' && result.data != null && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">{result.title}</h3></div>
                    <pre className="p-5 text-xs text-slate-700 overflow-x-auto bg-slate-900 text-green-400">{JSON.stringify(result.data, null, 2)}</pre>
                  </div>
                )}

                <div className="text-center pt-2">
                  <button onClick={() => { setResult(null); setFileMap({}); setWizardStep('upload'); }} className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                    ↺ Run again with different files
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>').replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<)/gm, '<p>').replace(/$/gm, '</p>').replace(/<p><\/p>/g, '');
}
