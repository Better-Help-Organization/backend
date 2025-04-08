import { Injectable } from '@nestjs/common';
import { DataSource, EntityMetadata, ObjectLiteral } from 'typeorm';
import { faker } from '@faker-js/faker';

@Injectable()
export class SeedService {
  private entityData: Record<string, ObjectLiteral[]> = {};
  private usedOneToOneRelations = new Map<string, Set<any>>();

  private manualOrder = []
 
  constructor(private readonly dataSource: DataSource) {}

  async seed(count = 10) {
    await this.clearDatabase();
    await this.dataSource.synchronize(false);

    const entities = this.getSortedEntities(this.manualOrder)
    for (const entity of entities) {
      const records = await this.seedEntity(entity, count);
      this.entityData[entity.name] = records;
    }
    console.log('✅ Database seeding completed!');
  }

  private async clearDatabase() {
    const databaseName = process.env.MYSQL_DB
    try {
      // Disable foreign key checks
      await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0;');

      // Drop the database if it exists
      await this.dataSource.query(`DROP DATABASE IF EXISTS ${databaseName};`);
      console.log(`drop db ${databaseName}`)
      // Create the database
      await this.dataSource.query(`CREATE DATABASE ${databaseName};`);
      console.log(`create db ${databaseName}`)
      
      // Use the database
      await this.dataSource.query(`USE ${databaseName};`);
      console.log(`use db ${databaseName}`)
      
      // Re-enable foreign key checks
      await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1;');
      
      // Synchronize the database schema
      await this.dataSource.synchronize(true);
      
      console.log(`🔄 Database ${databaseName} has been reset and recreated`);
  } catch (error) {
      console.error(`❌ Error resetting database ${databaseName}:`, error);
      throw error;
    }
  }
    
  private async handleDuplicateEntry(metadata: EntityMetadata, repository: any, count: number) {
    const uniqueColumns = metadata.columns.filter(column => 
      metadata.uniques.some(unique => unique.columns.includes(column))
    );

    const records: ObjectLiteral[] = [];
    for (let i = 0; i < count; i++) {
      const record = this.generateMockData(metadata, uniqueColumns);
      records.push(record);
    }

    const saved = await repository.save(records);
    return saved;
  }

  private async seedEntity(metadata: EntityMetadata, count: number) {
    const repository = this.dataSource.getRepository(metadata.name);
    console.log({repository})


    const records: ObjectLiteral[] = [];

    for (let i = 0; i < count; i++) {
      const record = this.generateMockData(metadata);
      records.push(record);
    }

    const validRecords = records.filter(record => 
      !metadata.columns.some(column => 
        !column.isNullable && record[column.propertyName] === null
      )
    );

    if (validRecords.length === 0) {
      console.warn(`⚠️ No valid records generated for ${metadata.name}`);
      return [];
    }

    try {
      const saved = await repository.save(validRecords);
      console.log(`✅ Seeded ${saved.length} records for ${metadata.name}`);
      return saved;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.warn(`⚠️ Duplicate entry detected for ${metadata.name}, retrying with unique values`);
        return this.handleDuplicateEntry(metadata, repository, count);
      }
      throw error;
    }
  }

  private generateMockData(metadata: EntityMetadata, uniqueColumns: any[] = []): ObjectLiteral {
    const mockData: Record<string, any> = {};
  
    metadata.columns.forEach((column) => {
      if (column.isPrimary) return;
      if (column.isDeleteDate) return
      
      if (column.relationMetadata) {
        const relationValue = this.getRelatedEntity(column);
        if (relationValue === null && !column.isNullable) {
          throw new Error(`No related records found for non-nullable relation: ${column.propertyName}`);
        }
        mockData[column.propertyName] = relationValue;
      } else {
        const isUnique = uniqueColumns.some((uniqueCol) => uniqueCol.propertyName === column.propertyName);
        mockData[column.propertyName] = this.generateFakeValue(
          column.type,
          column.isNullable,
          column,
          isUnique,
          metadata.name
        );
      }
    });
    return mockData;
  }

private getRelatedEntity(column: any) {
    const relation = column.relationMetadata;
    const relatedEntity = relation.inverseEntityMetadata.name;
    const relatedRecords = this.entityData[relatedEntity] || [];

    if (relatedRecords.length === 0) {
      if (!column.isNullable) {
        console.warn(`⚠️ No records found for required relation ${relatedEntity}`);
      }
      return null;
    }

    if (relation.isOneToOne) {
      // Initialize Set for this relation if it doesn't exist
      const relationKey = `${relation.entityMetadata.name}_${relatedEntity}`;
      if (!this.usedOneToOneRelations.has(relationKey)) {
        this.usedOneToOneRelations.set(relationKey, new Set());
      }

      // Find an unused related record
      const usedIds = this.usedOneToOneRelations.get(relationKey);
      const availableRecords = relatedRecords.filter(record => !usedIds.has(record.id));

      if (availableRecords.length === 0) {
        if (!column.isNullable) {
          console.warn(`⚠️ No available unused records for OneToOne relation ${relatedEntity}`);
        }
        return null;
      }

      const selectedRecord = faker.helpers.arrayElement(availableRecords);
      usedIds.add(selectedRecord.id);
      return selectedRecord;
    }

    return relation.isManyToOne
      ? faker.helpers.arrayElement(relatedRecords)
      : [faker.helpers.arrayElement(relatedRecords)];
}

  private generateFakeValue(type: any, isNullable: boolean, columnMetadata?: any, isUnique = false, entityName = ''): any {
    if (isNullable && faker.datatype.boolean() && !isUnique) return null;

    const typeName = typeof type === 'function' ? type.name : type;

    // if (isUnique) {
    //   return this.generateUniqueValue(typeName, entityName, columnMetadata.propertyName);
    // }

    if (columnMetadata?.propertyName === 'email') {
      return faker.internet.email();
    }
  

    switch (typeName) {
      case 'String':
      case 'varchar':
      case 'text':
        return faker.lorem.words(3);
      case 'longtext':
        return 'ci`v@gvrkF}r@|[vo@zcBvsAuH';
      case 'Number':
      case 'int':
      case 'integer':
      case 'bigint':
        return faker.number.int({ min: 1, max: 100 });
      case 'Boolean':
      case 'boolean':
        return faker.datatype.boolean();
      case 'Date':
      case 'datetime':
      case 'timestamp':
        return faker.date.recent();
      case 'date':
        return faker.date.past().toISOString().split('T')[0];
      case 'Object':
        return JSON.stringify({ key: faker.lorem.word() });
      case 'Array':
        return JSON.stringify([faker.lorem.word(), faker.lorem.word()]);
      case 'enum':
        if (columnMetadata?.enum) return faker.helpers.arrayElement(columnMetadata.enum);
        return null;
      case 'float':
        return faker.number.float({ min: 0, max: 5, fractionDigits: 0 });
      default:
        console.warn(`⚠️ Unsupported type: ${typeName}`);
        return null;
    }
  }

  private getSortedEntities(manualOrder: string[]): EntityMetadata[] {
    const entities = this.dataSource.entityMetadatas;
    const entityMap = new Map(entities.map((entity) => [entity.name, entity]));  
    const sorted = manualOrder
      .map((name) => {
        if (!entityMap.has(name)) {
          console.warn(`Entity not found for name: ${name}`);
        }
        return entityMap.get(name);
      })
      .filter((entity): entity is EntityMetadata => !!entity);
  
    return sorted;
  }
}