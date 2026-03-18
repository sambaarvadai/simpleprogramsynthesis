import { getSchemaConfig } from '../config';

export interface FieldDef {
  type: 'text' | 'integer' | 'real';
  filterable: boolean;
  selectable: boolean;
  sortable: boolean;
}

export interface TableDef {
  fields: Record<string, FieldDef>;
  joins?: Record<string, string>; // join_name -> join_condition
}

export interface SchemaMetadata {
  tables: Record<string, TableDef>;
  allowedAggregations: string[];
  allowedOperators: string[];
  maxLimit: number;
}

export function getSchemaMetadata(): SchemaMetadata {
  const schemaConfig = getSchemaConfig();
  
  // Convert JSON schema to internal format
  const tables: Record<string, TableDef> = {};
  
  for (const [tableName, tableData] of Object.entries(schemaConfig.tables)) {
    const fields: Record<string, FieldDef> = {};
    
    for (const [fieldName, fieldData] of Object.entries(tableData.fields)) {
      const fieldDef = fieldData as any;
      fields[`${tableName}.${fieldName}`] = {
        type: fieldDef.type,
        filterable: fieldDef.filterable,
        selectable: fieldDef.selectable,
        sortable: fieldDef.sortable
      };
    }
    
    // Add wildcard support
    fields[`${tableName}.*`] = {
      type: 'text',
      filterable: false,
      selectable: true,
      sortable: false
    };
    
    tables[tableName] = {
      fields,
      joins: undefined
    };
  }
  
  // Add joins from schema config
  if (schemaConfig.joins) {
    for (const [joinName, joinData] of Object.entries(schemaConfig.joins)) {
      const [fromTable, toTable] = joinName.split('.');
      if (tables[fromTable]) {
        tables[fromTable].joins = tables[fromTable].joins || {};
        tables[fromTable].joins![toTable] = `${joinData.from} = ${joinData.to}`;
      }
    }
  }
  
  const metadata = {
    tables,
    allowedAggregations: ['count', 'sum', 'avg', 'min', 'max'],
    allowedOperators: ['=', '!=', '>', '<', '>=', '<=', 'LIKE'],
    maxLimit: 20 // Will be updated from config later
  };
  
  return metadata;
}

export function getAllowedTables(): string[] {
  const metadata = getSchemaMetadata();
  return Object.keys(metadata.tables);
}

export function getAllowedFields(table?: string): string[] {
  const metadata = getSchemaMetadata();
  if (table && metadata.tables[table]) {
    return Object.keys(metadata.tables[table].fields);
  }
  
  const allFields: string[] = [];
  for (const tableName of Object.keys(metadata.tables)) {
    allFields.push(...Object.keys(metadata.tables[tableName].fields));
  }
  return allFields;
}

export function isFieldAllowed(field: string): boolean {
  return getAllowedFields().includes(field);
}

export function isTableAllowed(table: string): boolean {
  return getAllowedTables().includes(table);
}

export function isOperatorAllowed(operator: string): boolean {
  const metadata = getSchemaMetadata();
  return metadata.allowedOperators.includes(operator);
}

export function isAggregationAllowed(agg: string): boolean {
  const metadata = getSchemaMetadata();
  return metadata.allowedAggregations.includes(agg);
}
