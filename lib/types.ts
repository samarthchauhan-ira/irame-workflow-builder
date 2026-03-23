export type InputType = 'csv' | 'pdf' | 'image' | 'sql';
export type OutputType = 'table' | 'report' | 'flags' | 'summary' | 'json';
export type StepType = 'extract' | 'analyze' | 'compare' | 'flag' | 'summarize' | 'calculate' | 'validate';

export interface WorkflowInput {
  id: string;
  name: string;
  type: InputType;
  description: string;
  required: boolean;
  multiple?: boolean;
}

export interface OutputField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  description: string;
}

export interface WorkflowOutput {
  type: OutputType;
  title: string;
  description: string;
  fields?: OutputField[];
}

export interface ColumnMapping {
  from: string;
  to: string;
  description?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: StepType;
  subSteps?: string[];
  dataFiles?: string[];         // input IDs used by this step
  columnMappings?: ColumnMapping[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  logicPrompt: string;
  inputs: WorkflowInput[];
  output: WorkflowOutput;
  steps: WorkflowStep[];
  tags: string[];
  category: string;
  status: 'active' | 'draft';
  createdAt: string;
  updatedAt: string;
  runCount: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WorkflowResult {
  type: OutputType;
  title: string;
  summary: string;
  metrics?: {
    records_analyzed?: number;
    issues_found?: number;
    risk_level?: 'low' | 'medium' | 'high' | 'critical';
    [key: string]: string | number | undefined;
  };
  flags?: Array<{
    id: number;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    reference?: string;
    recommendation?: string;
  }>;
  table?: {
    headers: string[];
    rows: (string | number | boolean)[][];
  };
  report?: string;
  data?: Record<string, unknown> | unknown[];
}
