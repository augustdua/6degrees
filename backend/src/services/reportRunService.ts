import { supabase } from '../config/supabase';

export async function recordReportRun(params: {
  post_id: string;
  report_kind: string;
  run_id?: string | null;
  status: 'success' | 'error';
  model_name?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  inputs?: any;
  prompts?: any;
  outputs?: any;
  error?: string | null;
}): Promise<void> {
  try {
    const row = {
      post_id: params.post_id,
      report_kind: params.report_kind,
      run_id: params.run_id ?? null,
      status: params.status,
      model_name: params.model_name ?? null,
      started_at: params.started_at ?? null,
      finished_at: params.finished_at ?? null,
      inputs: params.inputs ?? null,
      prompts: params.prompts ?? null,
      outputs: params.outputs ?? null,
      error: params.error ?? null,
      created_at: new Date().toISOString(),
    };

    // Best effort: this table may not exist yet in some environments.
    // If it fails, do not break the primary publishing path.
    const { error } = await supabase.from('report_runs').insert(row as any);
    if (error) {
      console.warn('recordReportRun failed (best-effort):', error.message || error);
    }
  } catch (e: any) {
    console.warn('recordReportRun exception (best-effort):', e?.message || String(e));
  }
}


