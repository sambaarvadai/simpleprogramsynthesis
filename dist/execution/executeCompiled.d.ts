import { ExecutionResult } from '../plans/types';
export interface CompiledQuery {
    sql: string;
    params: any[];
}
export declare function executeCompiledQuery(compiled: CompiledQuery): Promise<ExecutionResult>;
//# sourceMappingURL=executeCompiled.d.ts.map