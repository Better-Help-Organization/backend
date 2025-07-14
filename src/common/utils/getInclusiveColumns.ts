import { Repository } from "typeorm";

export async function getInclusiveColumns<T>(
  repository: Repository<T>,  // The repository to query
  inclusiveOf: (keyof T)[] = []  // Explicitly include columns marked select: false
) {
  // Get all columns from the entity's metadata
  const columns = repository.metadata.columns;

  // Get columns marked with select: true
  const selectTrueColumns = columns
    .filter(column => column.isSelect)  // Columns marked select: true
    .map(column => column.propertyName as keyof T);

  // Get columns explicitly marked select: false but want to include them
  const selectFalseColumns = columns
    .filter(column => !column.isSelect && inclusiveOf.includes(column.propertyName as keyof T))
    .map(column => column.propertyName as keyof T);

  // Combine the select: true columns and the explicitly included select: false columns
  const selectColumns = [...selectTrueColumns, ...selectFalseColumns];

  return { selectColumns, includedColumns: selectTrueColumns };
}
