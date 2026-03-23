import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Workflow } from '@/lib/types';

export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(workflow: Workflow): string {
  const outputGuide =
    workflow.output.type === 'flags'
      ? `Return a JSON object with keys: type ("flags"), title, summary, metrics (records_analyzed, issues_found, risk_level), flags (array of {id, description, severity ("low"|"medium"|"high"|"critical"), reference, recommendation}).`
      : workflow.output.type === 'table'
      ? `Return a JSON object with keys: type ("table"), title, summary, metrics (records_analyzed, issues_found, risk_level), table ({headers: string[], rows: (string|number)[][]}).`
      : workflow.output.type === 'report'
      ? `Return a JSON object with keys: type ("report"), title, summary, metrics (records_analyzed, issues_found, risk_level), report (a full markdown audit report string with ## headings, tables, and bullet points).`
      : `Return a JSON object with keys: type ("summary"), title, summary, metrics (records_analyzed, issues_found, risk_level), data (relevant structured data).`;

  return `You are a senior enterprise auditor running an automated audit workflow.

Workflow: ${workflow.name}
Description: ${workflow.description}

Audit Logic:
${workflow.logicPrompt}

Workflow Steps:
${workflow.steps.map((s, i) => `${i + 1}. ${s.name}: ${s.description}`).join('\n')}

The user has uploaded files for analysis. Analyze the provided data thoroughly and produce structured audit findings.

${outputGuide}

Important rules:
- Be specific with numbers, references, and findings — use the actual data provided
- If file content appears to be sample/demo data, analyze it as real data
- Severity levels: critical (immediate action), high (urgent review), medium (monitor), low (informational)
- risk_level in metrics must be one of: "low", "medium", "high", "critical"
- Respond with ONLY valid JSON — no markdown fences, no prose outside the JSON structure`;
}

async function readFileAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Try UTF-8 decode
  try {
    const text = new TextDecoder('utf-8').decode(bytes);
    return text;
  } catch {
    return `[Binary file: ${file.name}, size: ${file.size} bytes]`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const workflowRaw = formData.get('workflow') as string;
    const workflow: Workflow = JSON.parse(workflowRaw);

    // Collect uploaded files
    const fileContents: Array<{ name: string; type: string; content: string }> = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        const content = await readFileAsText(value);
        fileContents.push({
          name: value.name,
          type: value.type || key,
          content: content.slice(0, 20000), // Limit per file to avoid token overflow
        });
      }
    }

    if (fileContents.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Build the user message with file contents
    const fileSection = fileContents
      .map(
        (f, i) =>
          `--- File ${i + 1}: ${f.name} ---\n${f.content}\n`
      )
      .join('\n');

    const userMessage = `Please analyze the following uploaded files and produce audit findings according to the workflow instructions.\n\n${fileSection}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8096,
      system: buildSystemPrompt(workflow),
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Strip markdown code fences if present
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let result: unknown;
    try {
      result = JSON.parse(cleaned);
    } catch {
      // If parsing fails, wrap the raw text as a report
      result = {
        type: 'report',
        title: workflow.output.title,
        summary: 'Audit completed. See full report below.',
        metrics: { records_analyzed: fileContents.length, issues_found: 0, risk_level: 'low' },
        report: rawText,
      };
    }

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
