import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Clarification API — 3 phases:
 *   1. check_files   → Are the uploaded files sufficient for the workflow?
 *   2. map_files     → Which uploaded file maps to which workflow input / step?
 *   3. map_columns   → Can we map CSV columns to the expected column mappings in each step?
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      phase: 'check_files' | 'map_files' | 'map_columns';
      workflow: {
        name: string;
        description: string;
        inputs: Array<{ id: string; name: string; type: string; description: string; required: boolean }>;
        steps: Array<{ id: string; name: string; description: string; dataFiles?: string[]; columnMappings?: Array<{ from: string; to: string; description?: string }> }>;
      };
      files: Array<{ name: string; type: string; headers?: string[]; rowCount?: number; sampleRows?: string[][] }>;
      userOverrides?: Record<string, unknown>;
    };

    const { phase, workflow, files } = body;

    /* ─── Phase 1: File Sufficiency ──────────────────────────────── */
    if (phase === 'check_files') {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: `You check whether uploaded files satisfy a workflow's input requirements. Respond ONLY with valid JSON (no markdown fences).

Schema:
{
  "sufficient": boolean,
  "matched": [ { "inputId": "string", "fileName": "string", "confidence": "high"|"medium"|"low" } ],
  "missing": [ { "inputId": "string", "inputName": "string", "reason": "string" } ],
  "message": "string — friendly 1 sentence summary"
}

Rules:
- Match files to workflow inputs by name, type, and description
- A CSV file can match a csv input, a PDF matches pdf, images match image, etc.
- If a required input has no matching file, mark it in "missing"
- If all required inputs are covered, sufficient = true`,
        messages: [{
          role: 'user',
          content: `Workflow inputs:\n${JSON.stringify(workflow.inputs, null, 2)}\n\nUploaded files:\n${JSON.stringify(files.map(f => ({ name: f.name, type: f.type, headers: f.headers, rowCount: f.rowCount })), null, 2)}`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const result = JSON.parse(cleaned);
      return NextResponse.json({ phase: 'check_files', ...result });
    }

    /* ─── Phase 2: File-to-Step Mapping ──────────────────────────── */
    if (phase === 'map_files') {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: `You map uploaded files to workflow steps. Each step lists which inputs (dataFiles) it needs. Determine which uploaded file provides data for which step.

Respond ONLY with valid JSON (no markdown fences):
{
  "mapped": true | false,
  "fileMappings": [
    {
      "fileName": "string",
      "inputId": "string — the workflow input ID this file maps to",
      "inputName": "string",
      "confidence": "high" | "medium" | "low",
      "reason": "string — brief explanation"
    }
  ],
  "stepMappings": [
    {
      "stepId": "string",
      "stepName": "string",
      "fileNames": ["string — files used in this step"],
      "confident": true | false
    }
  ],
  "ambiguous": [
    {
      "fileName": "string",
      "possibleInputs": ["inputId1", "inputId2"],
      "reason": "string"
    }
  ],
  "message": "string — summary"
}

Rules:
- Use file names, headers, and descriptions to determine mappings
- If a file clearly matches one input, confidence = "high"
- If ambiguous, list it in "ambiguous" and set mapped = false
- mapped = true only if ALL files are confidently assigned`,
        messages: [{
          role: 'user',
          content: `Workflow:\n${JSON.stringify({ inputs: workflow.inputs, steps: workflow.steps }, null, 2)}\n\nUploaded files:\n${JSON.stringify(files, null, 2)}`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const result = JSON.parse(cleaned);
      return NextResponse.json({ phase: 'map_files', ...result });
    }

    /* ─── Phase 3: Column Mapping ────────────────────────────────── */
    if (phase === 'map_columns') {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        system: `You map CSV column headers from uploaded files to the expected column mappings defined in workflow steps.

Respond ONLY with valid JSON (no markdown fences):
{
  "mapped": true | false,
  "stepColumnMappings": [
    {
      "stepId": "string",
      "stepName": "string",
      "mappings": [
        {
          "expectedFrom": "string — the 'from' column in the step definition",
          "actualColumn": "string | null — the actual CSV header that matches",
          "expectedTo": "string — the 'to' column",
          "confidence": "high" | "medium" | "low" | "unmapped",
          "suggestion": "string — if unmapped, suggest what the user should look for"
        }
      ]
    }
  ],
  "unmappedColumns": [
    {
      "stepId": "string",
      "expectedFrom": "string",
      "availableHeaders": ["string"],
      "suggestion": "string"
    }
  ],
  "message": "string — summary"
}

Rules:
- Match by exact name, partial name, abbreviation, or semantic similarity
- If a CSV header is "A/C_ID" and expected is "A/C ID (Invoice)", that's a high match
- If no match found, confidence = "unmapped" and list in unmappedColumns
- mapped = true only if ALL expected columns have at least medium confidence`,
        messages: [{
          role: 'user',
          content: `Workflow steps with column mappings:\n${JSON.stringify(workflow.steps.filter(s => s.columnMappings?.length), null, 2)}\n\nUploaded files with headers:\n${JSON.stringify(files.filter(f => f.headers?.length).map(f => ({ name: f.name, headers: f.headers, sampleRows: f.sampleRows?.slice(0, 3) })), null, 2)}`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const result = JSON.parse(cleaned);
      return NextResponse.json({ phase: 'map_columns', ...result });
    }

    return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
