import { createHash } from 'crypto';
import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

function hashName(prefix: string, parts: string[]) {
  const hash = createHash('sha1')
    .update(parts.join('__'))
    .digest('hex')
    .slice(0, 24);

  return `${prefix}_${hash}`;
}

export class IntegrationNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  foreignKeyName(
    tableOrName: Table | string,
    columnNames: string[],
    referencedTablePath?: string,
    referencedColumnNames?: string[],
  ): string {
    const tableName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
    return hashName('fk', [
      tableName,
      ...columnNames,
      referencedTablePath ?? '',
      ...(referencedColumnNames ?? []),
    ]);
  }
}
