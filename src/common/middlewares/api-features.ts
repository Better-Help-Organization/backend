import { getMetadataArgsStorage } from 'typeorm';
import {  BadRequestException } from '@nestjs/common';
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
  // TODO: might use this to pass through eager relations 
  applyEagerRelations<T>(query, entityClass: new () => T, alias: string) {
    const metadata = getMetadataArgsStorage();
    const relations = metadata.relations.filter(
      (r) => r.target === entityClass && r.options?.eager
    );

    for (const rel of relations) {
      query.leftJoinAndSelect(`${alias}.${rel.propertyName}`, rel.propertyName);
    }

    return query;
  }


  async getMany({useCache = false} = {}) {
    // console.log(this.queryParams)
    // if(!this.queryParams.options){

    this.sort();
    this.field();
    this.filter();
    this.paginate();

    // if (useCache) this.query.cache('cache_getMany', 60000); // Cache for 60 seconds

    // this.query = this.applyEagerRelations(this.query, Checkout, 'checkout');

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
  // } else {

  //   const opts = this.queryParams.options;
  
  //   // this.query.select(this.queryParams.options.select)
  //   // this.query.where(this.queryParams.options.where)
  //   // const selectFields = opts.select?.map(field => `${this.tableName}.${field}`);

  //   // if (opts.select) this.query = this.query.select(opts.select);
  //   if (opts.where) {
  //     Object.entries(opts.where).forEach(([key, value]) => {
  //       this.query = this.query.andWhere(`${this.tableName}.${key} = :${key}`, { [key]: value });
  //     });
  //   }

  //   // if (opts.relations) this.query = this.query.relations(opts.relations);
  //   if (opts.relations) this._applyRelations(opts.relations);

  //   if (opts.select) this.query = this.query.select(opts.select);
  //   // if (opts.where) this.query = this.query.where(opts.where);
  //   // if (opts.order) this.query = this.query.orderBy(opts.order);
  //   // // if (opts.take) this.query = this.query.take(opts.take);
  //   // // if (opts.skip) this.query = this.query.skip(opts.skip);
  //   // if (opts.withDeleted) this.query = this.query.withDeleted();
  //   // if (opts.lock) this.query = this.query.lock(opts.lock);
  //   // if (opts.loadRelationIds) this.query = this.query.loadRelationIds(opts.loadRelationIds);
  //   // if (opts.cache || useCache) this.query = this.query.cache(opts.cache ?? 'cache_getMany', 60000);

  //   // const data = await this.query.getMany();


  //   const data = await this.query.getMany()
  //   console.log({data})
  //   return { data }
  // }
  }

  async getOne(id: string) {
    // if(!this.queryParams.options){
      this.field();
      this.filter();
      return await this.query.where(`${this.tableName}.id = :id`, { id }).getOne();  
    // }
    //   this.query = this.query.relations(this.queryParams.options.relations)
    //   this.query = this.query.select(this.queryParams.options.select)
    //   this.query = this.query.where(this.queryParams.options.where)
    //   return await this.query.andWhere(`${this.tableName}.id = :id`, { id }).getOne();
   }

  // async getOneBy(where: Record<string, any>) {
  //   this.field();
  //   this.filter();
  
  //   // Convert key-value pairs into where conditions
  //   Object.entries(where).forEach(([key, value]) => {
  //     this.query = this.query.andWhere(`${this.tableName}.${key} = :${key}`, { [key]: value });
  //   });
  
  //   return await this.query.getOne();
  // }
  
  // _applyRelations(relations: any) {
  //   Object.entries(relations).forEach(([relation, include]) => {
  //     if (include) {
  //       const alias = relation.split('.').join('_'); // handles nested relations
  //       this.query = this.query.leftJoinAndSelect(`${this.tableName}.${relation}`, alias);
  //     }
  //   });
  // }
  // _applySelect(select: Record<string, boolean>) {
  //   const selectFields = Object.entries(select)
  //     .filter(([_, include]) => include)
  //     .map(([field]) => `${this.tableName}.${field}`);
  //   this.query = this.query.select(selectFields);
  // }
  // _applyWhere(where: Record<string, any>) {
  //   Object.entries(where).forEach(([key, value]) => {
  //     this.query = this.query.andWhere(`${this.tableName}.${key} = :${key}`, { [key]: value });
  //   });
  // }
  // _applyOrder(order: Record<string, 'ASC' | 'DESC'>) {
  //   Object.entries(order).forEach(([key, direction]) => {
  //     this.query = this.query.addOrderBy(`${this.tableName}.${key}`, direction);
  //   });
  // }
  // _applyTake(take: number) {
  //   this.query = this.query.take(take);
  // }
  // _applySkip(skip: number) {
  //   this.query = this.query.skip(skip);
  // }
  // _applyWithDeleted(withDeleted: boolean) {
  //   if (withDeleted) {
  //     this.query = this.query.withDeleted();
  //   }
  // }
  // _applyLock(lock: any) {
  //   if (lock) {
  //     this.query = this.query.lock(lock);
  //   }
  // }
  // _applyLoadRelationIds(loadRelationIds: boolean) {
  //   if (loadRelationIds) {
  //     this.query = this.query.loadRelationIds();
  //   }
  // }
  // _applyCache(cache: any) {
  //   if (cache) {
  //     this.query = this.query.cache(cache);
  //   }
  // }
  // _applyUseCache(useCache: boolean) {
  //   if (useCache) {
  //     this.query = this.query.cache('cache_getMany', 60000); // Cache for 60 seconds
  //   }
  // }
  

}
