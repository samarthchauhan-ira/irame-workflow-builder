'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Workflow } from '@/lib/types';
import { getWorkflows, deleteWorkflow } from '@/lib/storage';

const WORKFLOW_TEMPLATES = [
  { name: 'Vendor Contract Audit', description: 'Flag non-compliant clauses and unapproved vendors', category: 'Contract Audit', icon: '📋' },
  { name: 'Payroll Audit', description: 'Detect ghost employees and payroll anomalies', category: 'HR Audit', icon: '💰' },
  { name: 'Expense Report Review', description: 'Flag policy violations and duplicate claims', category: 'Expense Audit', icon: '🧾' },
  { name: 'GST Reconciliation', description: 'Match GST returns against ledger entries', category: 'Tax Audit', icon: '📊' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWorkflows(getWorkflows());
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = workflows.filter(
    (w) =>
      search === '' ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = workflows.filter((w) => w.status === 'active').length;
  const draftCount = workflows.filter((w) => w.status === 'draft').length;
  const totalRuns = workflows.reduce((a, w) => a + w.runCount, 0);

  function handleDelete(id: string) {
    deleteWorkflow(id);
    setWorkflows(getWorkflows());
    setDeleteConfirm(null);
    setOpenMenu(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base leading-tight">Irame.ai Workflow Builder</div>
              <div className="text-xs text-slate-400 leading-tight">Build custom audit workflows</div>
            </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search + Create */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Workflow
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Workflows', value: workflows.length },
            { label: 'Active', value: activeCount },
            { label: 'Drafts', value: draftCount },
            { label: 'Executions Today', value: totalRuns },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Workflows */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Your Workflows</h2>

          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-slate-500 mb-4">No workflows found</p>
              <Link href="/builder" className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors">
                Create your first workflow
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" ref={menuRef}>
              {filtered.map((workflow) => (
                <div key={workflow.id} className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all relative">
                  {/* Delete confirm overlay */}
                  {deleteConfirm === workflow.id && (
                    <div className="absolute inset-0 bg-white/97 rounded-2xl z-10 flex flex-col items-center justify-center gap-3 p-6 backdrop-blur-sm">
                      <p className="text-sm font-medium text-slate-800 text-center">Delete &ldquo;{workflow.name}&rdquo;?</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(workflow.id)} className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 transition-colors">Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    {/* Card top */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-semibold text-slate-900 text-base leading-snug truncate">{workflow.name}</h3>
                      </div>
                      {/* Three-dot menu */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setOpenMenu(openMenu === workflow.id ? null : workflow.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>
                        {openMenu === workflow.id && (
                          <div className="absolute right-0 top-7 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 w-40">
                            <Link
                              href={`/builder?edit=${workflow.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              onClick={() => setOpenMenu(null)}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Link>
                            <button
                              onClick={() => { setDeleteConfirm(workflow.id); setOpenMenu(null); }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        workflow.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {workflow.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{workflow.description}</p>

                    {/* Meta */}
                    <div className="space-y-1.5 mb-5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>{workflow.inputs.length} input{workflow.inputs.length !== 1 ? 's' : ''} &bull; 1 output</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Updated {formatDate(workflow.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                      <Link
                        href={`/builder?edit=${workflow.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl py-2 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Configure
                      </Link>
                      <Link
                        href={`/workflow/${workflow.id}`}
                        className="w-10 h-10 inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors flex-shrink-0"
                        title="Run workflow"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {/* Create new card */}
              <Link
                href="/builder"
                className="bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center py-14 gap-3 group min-h-[240px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                  <svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-700 transition-colors">New Workflow</p>
                  <p className="text-xs text-slate-400 mt-0.5">Describe it in plain English</p>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Workflow Templates */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-base font-semibold text-slate-900">Workflow Templates</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">Start with pre-built workflows designed for common audit scenarios</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW_TEMPLATES.map((tpl) => (
              <Link
                key={tpl.name}
                href={`/builder?template=${encodeURIComponent(tpl.name)}`}
                className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="text-2xl mb-3">{tpl.icon}</div>
                <div className="text-sm font-semibold text-slate-800 mb-1 group-hover:text-indigo-700 transition-colors">{tpl.name}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{tpl.description}</div>
                <div className="mt-3 text-xs font-medium text-slate-400 bg-slate-50 rounded-lg px-2 py-1 inline-block">{tpl.category}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
