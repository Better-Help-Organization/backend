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
      const filters = this.queryParams.filters.split(',').map((filter: string) => filter.trim());

      filters.forEach((filter: string, index: number) => {
        const match = filter.match(/^(.*?)(=|:=|>=|<=|>|<|!=)(.*)$/);

        if (match) {
          const [_, field, operator, value] = match;
          const fieldParts = field.split('.');
          let fieldPath;

          if (fieldParts.length > 1) {
            const relation = fieldParts[0];
            const relationField = fieldParts[1];

            // Join the relation only if it hasn't been joined yet
            if (!this.joinedRelations.has(relation)) {
              this.query.leftJoinAndSelect(`${this.tableName}.${relation}`, relation);
              this.joinedRelations.add(relation);
            }

            fieldPath = `${relation}.${relationField}`;
          } else {
            fieldPath = `${this.tableName}.${fieldParts[0]}`;
          }

          // Handle NULL checks
          if (value === 'null') {
            const condition = `${fieldPath} IS NULL`;
            index === 0
              ? this.query.where(condition)
              : this.query.andWhere(condition);
          } else if (value === '!null' || value === '!=null') {
            const condition = `${fieldPath} IS NOT NULL`;
            index === 0
              ? this.query.where(condition)
              : this.query.andWhere(condition);
          } else {
            const paramName = `${field}_${index}`;
            let condition = '';
            let queryValue = value;
  
            if (operator === '=') {
              condition = `${fieldPath} LIKE :${paramName}`;
              queryValue = `%${value}%`;
            }  else if (operator === ':=') {
              condition = `${fieldPath} = :${paramName}`;
              queryValue = value; // For = operation  
            } else {
              condition = `${fieldPath} ${operator} :${paramName}`;
            }
  
            index === 0
              ? this.query.where(condition, { [paramName]: queryValue })
              : this.query.andWhere(condition, { [paramName]: queryValue });
          }
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

  async getMany({useCache = false} = {}) {

    this.sort();
    this.field();
    this.filter();
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
