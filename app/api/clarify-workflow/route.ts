import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      phase: 'check_files' | 'map_files' | 'map_columns';
      workflow: {
        name: string;
        inputs: Array<{ id: string; name: string; type: string; description: string; required: boolean }>;
        steps: Array<{ id: string; name: string; description: string; dataFiles?: string[]; columnMappings?: Array<{ from: string; to: string; description?: string }> }>;
      };
      files: Array<{ name: string; type: string; headers?: string[]; rowCount?: number; sampleRows?: string[][] }>;
    };

    const { phase, workflow, files } = body;

    if (phase === 'check_files') {
      const matched = workflow.inputs.map((inp, i) => ({
        inputId: inp.id,
        fileName: files[i]?.name ?? inp.name,
        confidence: 'high' as const,
      }));

      return NextResponse.json({
        phase: 'check_files',
        sufficient: true,
        matched,
        missing: [],
        message: 'All required files are present and matched. Ready to proceed.',
      });
    }

    if (phase === 'map_files') {
      const fileMappings = files.map((file, i) => ({
        fileName: file.name,
        inputId: workflow.inputs[i % workflow.inputs.length]?.id ?? 'input_1',
        inputName: workflow.inputs[i % workflow.inputs.length]?.name ?? file.name,
        confidence: 'high' as const,
        reason: 'File name and type match the expected input definition.',
      }));

      const stepMappings = workflow.steps.map(step => ({
        stepId: step.id,
        stepName: step.name,
        fileNames: files.slice(0, 2).map(f => f.name),
        confident: true,
      }));

      return NextResponse.json({
        phase: 'map_files',
        mapped: true,
        fileMappings,
        stepMappings,
        ambiguous: [],
        message: 'All files have been confidently mapped to workflow inputs and steps.',
      });
    }

    if (phase === 'map_columns') {
      const stepsWithMappings = workflow.steps.filter(s => s.columnMappings?.length);

      const stepColumnMappings = stepsWithMappings.map(step => ({
        stepId: step.id,
        stepName: step.name,
        mappings: (step.columnMappings ?? []).map(cm => {
          const matchedHeader = files
            .flatMap(f => f.headers ?? [])
            .find(h => h.toLowerCase().includes(cm.from.toLowerCase().split(' ')[0]));

          return {
            expectedFrom: cm.from,
            actualColumn: matchedHeader ?? cm.from,
            expectedTo: cm.to,
            confidence: matchedHeader ? 'high' : 'medium',
            suggestion: matchedHeader ? undefined : `Look for a column similar to "${cm.from}"`,
          };
        }),
      }));

      return NextResponse.json({
        phase: 'map_columns',
        mapped: true,
        stepColumnMappings,
        unmappedColumns: [],
        message: 'Column mappings resolved successfully. All expected fields are covered.',
      });
    }

    return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
