export interface FieldDef {
    type: 'text' | 'integer' | 'real';
    filterable: boolean;
    selectable: boolean;
    sortable: boolean;
}
export interface TableDef {
    fields: Record<string, FieldDef>;
    joins?: Record<string, string>;
}
export interface SchemaMetadata {
    tables: Record<string, TableDef>;
    allowedAggregations: string[];
    allowedOperators: string[];
    maxLimit: number;
}
export declare function getSchemaMetadata(): SchemaMetadata;
export declare function getAllowedTables(): string[];
export declare function getAllowedFields(table?: string): string[];
export declare function isFieldAllowed(field: string): boolean;
export declare function isTableAllowed(table: string): boolean;
export declare function isOperatorAllowed(operator: string): boolean;
export declare function isAggregationAllowed(agg: string): boolean;
//# sourceMappingURL=metadata.d.ts.map