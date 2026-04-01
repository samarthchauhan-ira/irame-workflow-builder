'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Settings, Clock, FileText, Layers } from 'lucide-react'

interface Workflow {
  id: string
  name: string
  description: string
  status: 'active' | 'draft'
  inputs: unknown[]
  updatedAt: string
}

interface RecentWorkflowsProps {
  workflows: Workflow[]
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 mb-4">
        <Layers className="h-8 w-8 text-violet-400" />
      </div>
      <p className="text-base font-semibold text-gray-800 mb-1">No recent workflows yet</p>
      <p className="text-sm text-gray-500">Start by describing a workflow above</p>
    </div>
  )
}

export function RecentWorkflows({ workflows }: RecentWorkflowsProps) {
  return (
    <section className="w-full max-w-2xl mx-auto">
      {/* Section header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Recent Workflows</h2>
        <p className="text-sm text-gray-500 mt-0.5">Pick up where you left off</p>
      </div>

      {/* List or empty state */}
      {workflows.length === 0 ? (
        <Card className="border border-dashed border-gray-200 bg-gray-50/50 shadow-none">
          <CardContent className="p-0">
            <EmptyState />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              className="group border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 hover:-translate-y-px cursor-default"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: icon + content */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 mt-0.5 group-hover:bg-violet-100 transition-colors">
                      <FileText className="h-4 w-4 text-violet-500" />
                    </div>

                    {/* Text content */}
                    <div className="min-w-0 flex-1">
                      {/* Name + badge */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900 text-sm leading-tight">
                          {workflow.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className={
                            workflow.status === 'active'
                              ? 'bg-green-50 text-green-700 border border-green-200 text-[11px] px-2 py-0 font-medium'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 text-[11px] px-2 py-0 font-medium'
                          }
                        >
                          {workflow.status === 'active' ? 'Active' : 'Draft'}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                        {workflow.description}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getRelativeTime(workflow.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {workflow.inputs.length} input{workflow.inputs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                    >
                      <Link href={`/builder?edit=${workflow.id}`}>
                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                        Configure
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                    >
                      <Link href={`/workflow-run?id=${workflow.id}`}>
                        <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                        Run
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

export default RecentWorkflows
