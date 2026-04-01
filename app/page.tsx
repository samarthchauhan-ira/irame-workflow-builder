'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Workflow } from '@/lib/types';
import { getWorkflows, deleteWorkflow } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Pencil,
  Upload,
  Link2,
  Columns,
  Play,
  Sparkles,
  Plus,
  Paperclip,
  Tag,
  Calendar,
  Settings,
  MoreHorizontal,
  Trash2,
  ChevronDown,
  Home,
  LayoutDashboard,
  BarChart3,
  Bot,
  Cog,
  FileText,
  ChevronRight,
} from 'lucide-react';

/* ─── Stepper config ──────────────────────────────────────────────── */
const FLOW_STEPS = [
  { key: 'prompt',  label: 'WRITE PROMPT',  icon: Sparkles },
  { key: 'upload',  label: 'UPLOAD FILES',  icon: Upload },
  { key: 'map',     label: 'MAP FILES',     icon: Link2 },
  { key: 'columns', label: 'MAP COLUMNS',   icon: Columns },
  { key: 'run',     label: 'REVIEW & RUN',  icon: Play },
] as const;

/* ─── Sidebar nav items ───────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: 'Home',             icon: Home,            href: '/' },
  { label: 'Business Process', icon: FileText,        href: '#' },
  { label: 'Dashboard',        icon: LayoutDashboard, href: '#' },
  { label: 'Reports',          icon: BarChart3,       href: '#' },
  { label: 'AI Concierge',     icon: Bot,             href: '/', active: true, badge: 'Beta' },
  { label: 'Configuration',    icon: Cog,             href: '#' },
];

const PROJECTS = [
  { label: 'KBL O2C Inventory ...', children: [] },
  { label: 'HR KPI',                children: [] },
  { label: 'SCV - Freight',         children: [] },
  { label: 'Production MIS',        children: [] },
  { label: 'Energy and Infra Ch...', children: [] },
  { label: 'Hire to Retire Stand...', children: [
    'JVs in salary G...',
    'Employee cust...',
    'Salary GL tren...',
  ]},
  { label: 'AirLines X- Ray Cha...', children: [] },
  { label: 'Manufacturing Indu...', children: [] },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}

export default function WorkflowBuilderPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [prompt, setPrompt] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>('Hire to Retire Stand...');

  useEffect(() => {
    setWorkflows(getWorkflows());
  }, []);

  function handleDelete(id: string) {
    deleteWorkflow(id);
    setWorkflows(getWorkflows());
    setDeleteConfirm(null);
  }

  function handleSubmitPrompt() {
    if (!prompt.trim()) return;
    router.push(`/builder?prompt=${encodeURIComponent(prompt.trim())}`);
  }

  function handleFeelingLucky() {
    router.push('/builder?template=Terminal%20Charges%20Audit');
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ═══ Left Sidebar — dark ═══ */}
      <aside className="sidebar-dark w-[220px] flex-shrink-0 flex flex-col bg-[#0b0b12] border-r border-white/[0.06]">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2.5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-violet-500/30">
            <FileText className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">Irame 4</div>
            <div className="text-[11px] text-gray-500 truncate">Irame.ai</div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
        </div>

        {/* Ask IRA — AI-powered CTA */}
        <div className="px-3 pt-3 pb-1">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-lg border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white hover:border-violet-500/40 h-9 transition-all duration-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-sm font-medium">Ask IRA</span>
          </Button>
        </div>

        {/* Nav */}
        <nav className="px-2 py-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150',
                item.active
                  ? 'bg-violet-500/15 text-violet-300 font-medium border-l-[2px] border-violet-400 pl-[9px]'
                  : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
              )}
            >
              <item.icon className={cn('w-4 h-4 flex-shrink-0', item.active ? 'text-violet-400' : 'text-gray-600')} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-violet-500/30 text-violet-400 font-medium bg-violet-500/10">
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        <div className="mx-3 my-2 h-px bg-white/[0.06]" />

        {/* Projects list */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {PROJECTS.map((proj) => (
            <div key={proj.label}>
              <button
                onClick={() => proj.children.length > 0 && setExpandedProject(expandedProject === proj.label ? null : proj.label)}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all duration-150"
              >
                <FileText className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                <span className="flex-1 truncate text-left">{proj.label}</span>
                {proj.children.length > 0 ? (
                  <ChevronRight className={cn('w-3 h-3 text-gray-600 transition-transform duration-150', expandedProject === proj.label && 'rotate-90')} />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-700/50" />
                )}
              </button>
              {proj.children.length > 0 && expandedProject === proj.label && (
                <div className="ml-4 space-y-0.5">
                  {proj.children.map((child) => (
                    <div key={child} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-white/5 hover:text-gray-300 cursor-pointer transition-all duration-150">
                      <div className="w-1 h-1 rounded-full bg-gray-700 flex-shrink-0" />
                      <span className="truncate">{child}</span>
                      <MoreHorizontal className="w-3 h-3 text-gray-700 ml-auto flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-violet-50/20">
        <div className="max-w-5xl mx-auto px-8 py-8">

          {/* ── Page title ── */}
          <h1 className="text-[1.75rem] font-semibold text-gray-900 mb-8 tracking-tight">Workflow builder</h1>

          {/* ── 5-Step Stepper ── */}
          <div className="flex items-center justify-center mb-10">
            <div className="flex items-center gap-0">
              {FLOW_STEPS.map((step, idx) => {
                const stepNum = idx + 1;
                const isActive = idx === 0;
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className="flex items-center">
                    {idx > 0 && (
                      <div className="w-14 h-px bg-gray-200" />
                    )}
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <div className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
                          isActive
                            ? 'bg-violet-50 ring-2 ring-violet-400/50 ring-offset-2'
                            : 'bg-white border border-gray-200'
                        )}>
                          <StepIcon className={cn('w-4 h-4', isActive ? 'text-violet-600' : 'text-gray-400')} />
                        </div>
                        <div className={cn(
                          'absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center',
                          isActive ? 'bg-violet-600' : 'bg-gray-300'
                        )}>
                          <span className="text-[9px] font-bold text-white">{stepNum}</span>
                        </div>
                      </div>
                      <span className={cn(
                        'text-[10px] font-semibold tracking-widest',
                        isActive ? 'text-violet-600' : 'text-gray-400'
                      )}>
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Hero Section ── */}
          <div className="text-center mb-8">
            <h2 className="text-[2.75rem] font-bold text-gray-900 mb-3 tracking-tight leading-tight">
              Audit smarter.{' '}
              <span className="bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">
                Not harder.
              </span>
            </h2>
            <p className="text-base text-gray-400 font-normal">
              Your AI copilot already knows what to look for. Just ask.
            </p>
          </div>

          {/* ── Prompt Input ── */}
          <div className="mx-[15%] mb-12">
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden ai-glow transition-all duration-200">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitPrompt(); } }}
                placeholder="Describe a workflow and let Auditify do the rest…"
                rows={3}
                className="w-full px-5 pt-5 pb-2 text-sm text-gray-700 placeholder:text-gray-400 resize-none focus:outline-none bg-transparent font-normal leading-relaxed"
              />
              <div className="flex items-center justify-between px-4 pb-4">
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleFeelingLucky}
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-full px-5 h-9 gap-2 text-sm font-medium transition-all duration-200 shadow-none"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Audit on Chat
                </Button>
              </div>
            </div>
          </div>

          <div className="mx-[15%] mb-8 h-px bg-gray-100" />

          {/* ── Use Templates ── */}
          <div className="mx-[15%]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
              <span className="text-xs text-gray-400">{workflows.length} workflows</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="rounded-2xl border-gray-200 hover:border-gray-300 transition-all duration-200 relative py-0 shadow-none bg-white group">
                  {/* Delete confirm overlay */}
                  {deleteConfirm === workflow.id && (
                    <div className="absolute inset-0 bg-white/97 rounded-2xl z-10 flex flex-col items-center justify-center gap-3 p-6">
                      <p className="text-sm font-medium text-gray-800 text-center">Delete &ldquo;{workflow.name}&rdquo;?</p>
                      <div className="flex gap-2">
                        <Button variant="destructive" onClick={() => handleDelete(workflow.id)} className="px-4 rounded-xl">Delete</Button>
                        <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="px-4 rounded-xl">Cancel</Button>
                      </div>
                    </div>
                  )}

                  <CardHeader className="p-5 pb-0">
                    <div className="flex items-start justify-between">
                      <CardTitle className="font-medium text-gray-900 text-sm leading-snug truncate flex-1 pr-2">{workflow.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem className="gap-2 px-3 py-2 text-sm" onSelect={() => { window.location.href = `/builder?edit=${workflow.id}`; }}>
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 px-3 py-2 text-sm text-red-600 focus:text-red-600" onSelect={() => setDeleteConfirm(workflow.id)}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 pt-3 pb-0">
                    <Badge variant="secondary" className={cn(
                      'rounded-full text-[10px] font-medium px-2 py-0.5 mb-3 border-0',
                      workflow.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    )}>
                      {workflow.status}
                    </Badge>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed font-normal">{workflow.description}</p>
                    <div className="space-y-1.5 mb-5">
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <Tag className="w-3 h-3" />
                        <span>{workflow.inputs.length} input{workflow.inputs.length !== 1 ? 's' : ''} &bull; 1 output</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>Updated {formatDate(workflow.updatedAt)}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="px-5 py-4 border-t border-gray-100 bg-transparent gap-2">
                    <Button asChild variant="outline" className="flex-1 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 text-xs h-8 transition-all duration-200">
                      <Link href={`/builder?edit=${workflow.id}`} className="inline-flex items-center justify-center gap-1.5">
                        <Settings className="w-3.5 h-3.5" /> Configure
                      </Link>
                    </Button>
                    <Button asChild className="w-8 h-8 bg-gray-900 hover:bg-gray-700 text-white rounded-xl flex-shrink-0 p-0 transition-all duration-200" title="Run workflow">
                      <Link href={`/workflow-run?id=${workflow.id}`} className="inline-flex items-center justify-center">
                        <Play className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
