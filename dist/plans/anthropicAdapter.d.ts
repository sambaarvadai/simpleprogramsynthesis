import { AnyPlan } from './types';
export interface LLMAdapter {
    generatePlan(prompt: string): Promise<AnyPlan>;
    correctPlan(originalPrompt: string, feedback: string, badPlan: AnyPlan): Promise<AnyPlan>;
}
export declare class AnthropicAdapter implements LLMAdapter {
    generatePlan(prompt: string): Promise<AnyPlan>;
    correctPlan(originalPrompt: string, feedback: string, badPlan: AnyPlan): Promise<AnyPlan>;
}
//# sourceMappingURL=anthropicAdapter.d.ts.map