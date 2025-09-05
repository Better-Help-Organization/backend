import { BadRequestException } from '@nestjs/common';
import { getMetadataArgsStorage, SelectQueryBuilder } from 'typeorm';
import { FindAllQueryParams, FindOneQueryParams } from './api-features.dto';

export class APIFeatures {

  protected target: any;
  private query: any;
  private tableName: string
  private joinedRelations: Set<string> = new Set();
  private parsedPage: number;
  private parsedLimit: number;
  private skip: number;
  
  constructor(
    public readonly entity: any,
    private readonly queryParams?: FindAllQueryParams<any> | FindOneQueryParams<any>,
  ) {
    this.tableName = this.entity.metadata.tableNameWithoutPrefix,
    this.query = this.entity.createQueryBuilder(this.tableName)
    this.target = this.entity.target
  }
// Done
filter() {
  if (this.queryParams?.filters) {
    const filters = this.queryParams.filters.split(',').map((f: string) => f.trim());

    filters.forEach((filter: string, index: number) => {
      // OR clause support: (field:=value|field2=value2)
      if (filter.startsWith('(') && filter.endsWith(')') && filter.includes('|')) {
        const orConditions = filter.slice(1, -1).split('|');

        const orWhereClauses = orConditions.map((orCond, i) => {
          const match = orCond.match(/^(.*?)(=|:=|>=|<=|>|<|!=)(.*)$/);
          if (!match) return '';

          const [_, field, operator, value] = match;
          const fieldParts = field.split('.');
          let fieldPath;

          if (fieldParts.length > 1) {
            const relation = fieldParts[0];
            const relationField = fieldParts[1];

            if (!this.joinedRelations.has(relation)) {
              this.query.leftJoinAndSelect(`${this.tableName}.${relation}`, relation);
              this.joinedRelations.add(relation);
            }

            fieldPath = `${relation}.${relationField}`;
          } else {
            fieldPath = `${this.tableName}.${fieldParts[0]}`;
          }

          const paramName = `${field}_${index}_${i}`;
          let clause = '';
          let queryValue = value;

          if (value === 'null') {
            return `${fieldPath} IS NULL`;
          } else if (value === '!null' || value === '!=null') {
            return `${fieldPath} IS NOT NULL`;
          } else if (operator === '=') {
            clause = `${fieldPath} LIKE :${paramName}`;
            queryValue = `%${value}%`;
          } else if (operator === ':=') {
            clause = `${fieldPath} = :${paramName}`;
          } else {
            clause = `${fieldPath} ${operator} :${paramName}`;
          }

          this.query.setParameter(paramName, queryValue);
          return clause;
        });

        const orSql = orWhereClauses.filter(Boolean).join(' OR ');
        if (orSql) {
          index === 0
            ? this.query.where(`(${orSql})`)
            : this.query.andWhere(`(${orSql})`);
        }
      }

      // Handle standard filters (not OR grouped)
      else {
        const match = filter.match(/^(.*?)(=|:=|>=|<=|>|<|!=)(.*)$/);
        if (!match) return;

        const [_, field, operator, value] = match;
        const fieldParts = field.split('.');
        let fieldPath;

        if (fieldParts.length > 1) {
          const relation = fieldParts[0];
          const relationField = fieldParts[1];

          if (!this.joinedRelations.has(relation)) {
            this.query.leftJoinAndSelect(`${this.tableName}.${relation}`, relation);
            this.joinedRelations.add(relation);
          }

          fieldPath = `${relation}.${relationField}`;
        } else {
          fieldPath = `${this.tableName}.${fieldParts[0]}`;
        }

        const paramName = `${field}_${index}`;
        let clause = '';
        let queryValue = value;

        if (value === 'null') {
          clause = `${fieldPath} IS NULL`;
        } else if (value === '!null' || value === '!=null') {
          clause = `${fieldPath} IS NOT NULL`;
        } else if (operator === '=') {
          clause = `${fieldPath} LIKE :${paramName}`;
          queryValue = `%${value}%`;
        } else if (operator === ':=') {
          clause = `${fieldPath} = :${paramName}`;
        } else {
          clause = `${fieldPath} ${operator} :${paramName}`;
        }

        index === 0
          ? this.query.where(clause, { [paramName]: queryValue })
          : this.query.andWhere(clause, { [paramName]: queryValue });
      }
    });
  }

  return this;
}

  // Done
  field() {
    // console.log(this.queryParams?.fields)
    if (this.queryParams?.fields) {
      if (! (typeof this.queryParams.fields === 'string')) return  this

    const fields = this.queryParams?.fields.split(',').map((field: string) => field.trim());
    const selectFields: string[] = [];
    const relations: string[] = [];
    const relationOverride: Set<string> = new Set(); // Track relations like 'user.*' that override all other selections

    fields.forEach((field: string) => {
      if (field.includes('.')) {
        const [relation, fieldName] = field.split('.');
        // console.log([fieldName])
        if(fieldName === '') throw new BadRequestException(`Relations field name at ${relation} cannot be empty`)
        const limitMatch = fieldName.match(/^\*(\d+)$/);
        let limit: number | undefined;

        if (limitMatch) limit = parseInt(limitMatch[1], 10);

        if (fieldName === '*') {
          // If it's a '*' for a relation, we need to select all fields from that relation
          if (!this.joinedRelations.has(relation)) {
            this.query.leftJoinAndSelect(`${this.tableName}.${relation}`, relation);
            this.joinedRelations.add(relation);
          }
          // Mark this relation to be overridden (select all fields)
          relationOverride.add(relation);
          
          // Push the relation into relations array
          selectFields.push(relation);
        } else {
          // If it's not '*', then select the specific field for the relation
          if (!this.joinedRelations.has(relation)) {
            this.query.leftJoinAndSelect(`${this.tableName}.${relation}`, relation);
            this.joinedRelations.add(relation);
          }

          // Only select specific fields if the relation hasn't been overridden by '*'
          if (!relationOverride.has(relation)) {
            selectFields.push(`${relation}.${fieldName}`);
          }
        }
      } else {
        // Select fields from the current table (main entity)
        selectFields.push(`${this.tableName}.${field}`);
      }
    });

    // Ensure that 'id' is selected from the main table if not already included
    if (!fields.includes('id')) {
      selectFields.push(`${this.tableName}.id`);
    }

    // Select the fields and add relations dynamically
    this.query.select(selectFields);

    // Add relations to ensure they're included in the join
    this.query.relation(relations);
  return this;
  }
}

  // Done
  paginate() {
    // if value is zero pagination will not be applied
    if (this.queryParams?.take == "0") return this

      this.parsedLimit = parseInt(this.queryParams?.take,10)|| 10; // Default to 10 if invalid
      this.parsedPage = parseInt(this.queryParams?.page,10) || 1; // Default to page 1 if invalid
      this.skip = (this.parsedPage - 1) *this. parsedLimit;

      this.query = this.query
      .take(this.parsedLimit)
      .skip(this.skip);   

      return this;
  }

  // Done
  sort() {
    if (this.queryParams?.sort) {

        const sorts = this.queryParams.sort.split(',').map((param: string) => param.trim());
        sorts.map((sort: any, index: number) => {
          const [_, sortField, , value ,,,] = sort.match(/^(.*?)(=)(.*)$/);
          if (index === 0) {
            this.query.orderBy(`${this.tableName}.${sortField}`, value.toUpperCase() as "ASC" | "DESC");
          } else {
            this.query.addOrderBy(`${this.tableName}.${sortField}`, value.toUpperCase() as "ASC" | "DESC");
          }
        });
      
    }
    return this;
  }
  // Done
  applyEagerRelations<T>(
    query: SelectQueryBuilder<T>,
    entityClass: Function,
    alias: string,
    visited = new Set<string>()
  ): SelectQueryBuilder<T> {
    const metadata = getMetadataArgsStorage();

    const relations = metadata.relations.filter(
      (r) => r.target === entityClass && r.options?.eager
    );

    for (const relation of relations) {
      const joinPath = `${alias}.${relation.propertyName}`;
      const joinAlias = `${alias}_${relation.propertyName}`;

      if (visited.has(joinPath)) continue;
      visited.add(joinPath);

      query = query.leftJoinAndSelect(joinPath, joinAlias);

      // Recursively apply eager relations to the related entity
      const relatedEntityClass =
        typeof relation.type === 'function' ? relation.type : relation.type;

      // Skip primitives or plain types
      if (typeof relatedEntityClass === 'function') {
        const hasNestedEager = metadata.relations.some(
          (r) => r.target === relatedEntityClass && r.options?.eager
        );
        if (hasNestedEager) {
          query = this.applyEagerRelations(query, relatedEntityClass, joinAlias, visited);
        }
      }
    }

    return query;
  }

// Done
  ManyIds() {
    if (this.queryParams?.ids) {
      const ids = this.queryParams.ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        this.query = this.query.andWhere(`${this.tableName}.id IN (:...ids)`, {
          ids,
        });
      }
    }
    return this;
  }

  async getMany({useCache = false} = {}) {

    this.sort();
    this.field();
    this.filter();
    this.ManyIds();
    this.paginate();

    // if (useCache) this.query.cache('cache_getMany', 60000); // Cache for 60 seconds

    if (this.target && this.tableName) {
      this.query = this.applyEagerRelations(this.query, this.target, this.tableName);
    }

    const data = await this.query.getMany()
    const totalItems = await this.query.getCount()
    const totalPages = Math.ceil(totalItems / (parseInt(this.queryParams?.take,10) || 10));

    return {
      data,
      pagination: {
        totalItems,
        totalPages,
        currentPage: this.parsedPage,
        pageSize: this.parsedLimit,
      },
    }
  }

  async getOne(id: string) {
    // if(!this.queryParams.options){
      this.field();
      this.filter();
      return await this.query.where(`${this.tableName}.id = :id`, { id }).getOne();  
   }

  

}
