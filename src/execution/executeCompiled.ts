import { getDatabase } from '../db/sqlite';
import { ExecutionResult, QueryResult } from '../plans/types';
import { getConfig } from '../config';

export interface CompiledQuery {
  sql: string;
  params: any[];
}

export async function executeCompiledQuery(compiled: CompiledQuery): Promise<ExecutionResult> {
  try {
    const config = getConfig();
    const db = await getDatabase();
    
    if (config.app.debug) {
      console.log('Debug: SQL:', compiled.sql);
      console.log('Debug: Params:', compiled.params);
    }
    
    // Use same execution method as original run.ts
    const rows = await db.all(compiled.sql, compiled.params);
    
    const queryResult = {
      rows,
      fields: rows.length > 0 ? Object.keys(rows[0]) : []
    };
    
    return {
      success: true,
      data: queryResult
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
