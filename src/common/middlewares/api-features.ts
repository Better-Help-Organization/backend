import { BadRequestException } from '@nestjs/common';
import { getMetadataArgsStorage, SelectQueryBuilder } from 'typeorm';
import { FindAllQueryParams, FindOneQueryParams } from './api-features.dto';


export class APIFeatures {

  protected target: any;
  protected query: any;
  protected tableName: string
  private joinedRelations: Set<string> = new Set();
  private selectedRelationAliases: Set<string> = new Set();
  private relationAliases: Map<string, string> = new Map();
  private parsedPage: number;
  private parsedLimit: number;
  private skip: number;
  private distinctField: string | null = null;
 
  
  constructor(
    public readonly entity: any,
    private readonly queryParams?: FindAllQueryParams<any> | FindOneQueryParams<any>,
  ) {
    this.tableName = this.entity.metadata.tableNameWithoutPrefix,
    this.query = this.entity.createQueryBuilder(this.tableName)
    this.target = this.entity.target
  }

    private parseValue(raw: string): any {
    if (raw === 'null') return null;
    if (raw === '!null' || raw === '!=null') return { notNull: true };

    // boolean
    if (raw.toLowerCase() === 'true') return true;
    if (raw.toLowerCase() === 'false') return false;

    // number
    if (!isNaN(Number(raw)) && raw.trim() !== '') return Number(raw);

    // date (YYYY-MM-DD or ISO timestamp)
    if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(raw)) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }

    return raw; // fallback: string
  }

  private ensureRelationAlias(path: string): string {
    const parts = path.split(".").filter(Boolean);
    let parentAlias = this.tableName;
    let currentPath = "";

    for (const relation of parts) {
      currentPath = currentPath ? `${currentPath}.${relation}` : relation;
      let alias = this.relationAliases.get(currentPath);

      if (!alias) {
        alias = `${this.tableName}__${currentPath.replace(/\./g, "__")}`;
        this.query.leftJoin(`${parentAlias}.${relation}`, alias);
        this.relationAliases.set(currentPath, alias);
        this.joinedRelations.add(alias);
      }

      parentAlias = alias;
    }

    return parentAlias;
  }

  private resolveNestedRelation(path: string): string {
    const parts = path.split(".");
    const finalField = parts[parts.length - 1];
    const relationPath = parts.slice(0, -1).join(".");
    const parentAlias = relationPath ? this.ensureRelationAlias(relationPath) : this.tableName;

    return `${parentAlias}.${finalField}`;
  }

  filter() {
    if (!this.queryParams?.filters) return this;

    const filters = this.queryParams.filters
      .split(",")
      .map(f => f.trim())
      .filter(Boolean);

    const processFilterExpression = (expr: string, index: number, orIndex?: number) => {
      const match = expr.match(/^(.*?)(=|:=|>=|<=|>|<|!=)(.*)$/);
      if (!match) return null;

      let [, field, operator, rawValue] = match;
      field = field.trim();
      rawValue = rawValue.trim();

      // --- DISTINCT detection ---
      const distinctMatch = rawValue.match(/^@distinct(?::(\d+))?$/);
      if (distinctMatch) {
        this.distinctField = field;
        return null;
      }
      const inlineDistinctMatch = rawValue.match(/@distinct(?::(\d+))?$/);
      if (inlineDistinctMatch) {
        this.distinctField = field;
        rawValue = rawValue.replace(/@distinct(?::\d+)?$/, "").trim();
      }

      // --- Resolve deeply nested relations ---
      const fieldPath = field.includes(".")
        ? this.resolveNestedRelation(field)
        : `${this.tableName}.${field}`;

      // --- NULL handling ---
      if (rawValue === "null") return `${fieldPath} IS NULL`;
      if (rawValue === "!null" || rawValue === "!=null") return `${fieldPath} IS NOT NULL`;
      if (rawValue === "") return null; // empty after @distinct strip

      // --- Param name ---
      const paramName = `${field.replace(/\W+/g, "_")}_${index}` + (orIndex != null ? `_${orIndex}` : "");
      let queryValue = this.parseValue(rawValue);

      // --- Date handling (rangeable YYYY-MM-DD) ---
      if (queryValue instanceof Date) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
          const nextDay = new Date(queryValue);
          nextDay.setUTCDate(nextDay.getUTCDate() + 1);

          this.query.setParameter(`${paramName}Start`, queryValue);
          this.query.setParameter(`${paramName}End`, nextDay);

          return `${fieldPath} >= :${paramName}Start AND ${fieldPath} < :${paramName}End`;
        }

        this.query.setParameter(paramName, queryValue);
        return `${fieldPath} ${operator} :${paramName}`;
      }

      // --- Strings & LIKE behavior ---
      if (operator === "=") {
        queryValue = `%${queryValue}%`;
        this.query.setParameter(paramName, queryValue);
        return `${fieldPath} LIKE :${paramName}`;
      }

      // --- Exact match ---
      if (operator === ":=") {
        this.query.setParameter(paramName, queryValue);
        return `${fieldPath} = :${paramName}`;
      }

      // --- All other operators ---
      this.query.setParameter(paramName, queryValue);
      return `${fieldPath} ${operator} :${paramName}`;
    };

    // === MAIN LOOP ===
    filters.forEach((filter, index) => {
      // OR GROUP: (a.b.c=1|x.y.z=2)
      if (filter.startsWith("(") && filter.endsWith(")") && filter.includes("|")) {
        const sub = filter.slice(1, -1).split("|");
        const orClauses: string[] = [];

        sub.forEach((expr, orIndex) => {
          const clause = processFilterExpression(expr.trim(), index, orIndex);
          if (clause) orClauses.push(clause);
        });

        if (orClauses.length > 0) {
          const sql = "(" + orClauses.join(" OR ") + ")";
          index === 0 ? this.query.where(sql) : this.query.andWhere(sql);
        }
      }

      // STANDARD FILTER
      else {
        const clause = processFilterExpression(filter, index);
        if (clause) {
          index === 0 ? this.query.where(clause) : this.query.andWhere(clause);
        }
      }
    });

    // === APPLY DISTINCT ===
    if (this.distinctField) {
      const fieldPath = this.distinctField.includes(".")
        ? this.resolveNestedRelation(this.distinctField)
        : `${this.tableName}.${this.distinctField}`;

      this.query.distinct(true).addSelect(fieldPath);
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
    const relationOverride: Set<string> = new Set(); // Track relation aliases like 'user.*' that override all other selections

    fields.forEach((field: string) => { 
      if (field.includes('.')) {
        const parts = field.split('.');
        const fieldName = parts.pop();
        const relationPath = parts.join('.');

        if (!fieldName) {
          throw new BadRequestException(`Relations field name at ${relationPath} cannot be empty`);
        }

        const relationAlias = this.ensureRelationAlias(relationPath);

        if (fieldName === '*') {
          relationOverride.add(relationAlias);
          this.selectedRelationAliases.add(relationAlias);
        } else {
          if (!relationOverride.has(relationAlias)) {
            selectFields.push(`${relationAlias}.${fieldName}`);
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

    // 🩹 Ensure sort fields are also selected
    if (this.queryParams?.sort) {
      const sortFields = this.queryParams.sort
        .split(',')
        .map((param: string) => param.trim().split('=')[0]);
      for (const sortField of sortFields) {
        const fullSortField = `${this.tableName}.${sortField}`;
        if (!selectFields.includes(fullSortField)) {
          selectFields.push(fullSortField);
        }
      }
    }

    const finalSelections = new Set(selectFields);
    this.selectedRelationAliases.forEach(rel => {
      finalSelections.add(rel);
    });

    this.query.select([...finalSelections]);


    // Add relations to ensure they're included in the join
    // this.query.relation(relations);
    // Perform joins for relations
    relations.forEach(rel => {
      this.query.leftJoinAndSelect(`${this.tableName}.${rel}`, rel);
    });

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
  return query;
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

    // --- FIX: safely resolve relatedEntityClass ---
    let relatedEntityClass: Function | undefined;

    if (typeof relation.type === 'function') {
      if ((relation.type as Function).length === 0) {
        // () => Entity style
        relatedEntityClass = (relation.type as () => Function)();
      } else {
        // Direct class reference
        relatedEntityClass = relation.type as Function;
      }
    } else {
      // string, EntitySchema, or object → skip (not directly resolvable here)
      continue;
    }

    // Recursively apply eager relations if nested
    if (relatedEntityClass) {
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

  async getMany({
    useCache = false,
    dateFilter,
  }: {
    useCache?: boolean;
    dateFilter?: { field: string; start?: string; end?: string };
  } = {}) {
    this.sort();
    this.field();
    this.filter();
    this.ManyIds();
    this.paginate();

    // if (useCache) this.query.cache('cache_getMany', 60000); // Cache for 60 seconds

    if (this.target && this.tableName) {
      this.query = this.applyEagerRelations(this.query, this.target, this.tableName);
    }

      // 🕒 Dynamic date filtering
   if (dateFilter?.field) {
    const { field, start, end } = dateFilter;

    if (start && end) {
        this.query = this.query.andWhere(`${this.tableName}.${field} BETWEEN :start AND :end`, {
          start,
          end,
        });
      } else if (start) {
        this.query = this.query.andWhere(`${this.tableName}.${field} >= :start`, { start });
      } else if (end) {
        this.query = this.query.andWhere(`${this.tableName}.${field} <= :end`, { end });
      }
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

    if (this.target && this.tableName) {
      this.query = this.applyEagerRelations(this.query, this.target, this.tableName);
    }

      return await this.query.where(`${this.tableName}.id = :id`, { id }).getOne();  
   }
}

export class ChatFeatures extends APIFeatures {
  joinGroupMembers() {
    this.query.leftJoinAndSelect(`${this.tableName}.group`, 'groupMembers');
    return this;
  }
}
