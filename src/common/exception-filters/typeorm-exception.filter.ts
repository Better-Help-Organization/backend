import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  ExecutionContext,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from 'src/logger/logger.service';
import { TypeORMError } from 'typeorm';
import { getHttpStatusMessage } from '../utils/getHttpStatusMessage';
import { DataSource } from 'typeorm';
import { EntityNotFoundError } from 'typeorm';


@Catch(TypeORMError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly dataSource: DataSource
  constructor(
    private readonly logger: LoggerService,
  ){}
    catch(exception: TypeORMError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();    

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';

    // Specific error handling for TypeORM
    if (exception.message.includes('No metadata for')) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Entity metadata not found. Please check your entities and configurations.';
    } 
    
    else if (exception.message.includes('Duplicate entry')) {

      const duplicateValue = exception.message.split("'")[1];
      const keyInfo = exception.message.split("'")[3];

      // Attempt to parse table and index from the key info
      const [tableName, indexId] = keyInfo?.split('.') ?? [];

      let field = indexId;

      if (tableName && indexId) {
        try {
          const metadata = this.dataSource.getMetadata(tableName);
          console.log("", {metadata})
          const index = metadata.indices.find((i) => i.name === indexId);
          if (index) {
            console.log("", [index])
            field = index.columns.map((col) => col.propertyName).join(', ');
          }
        } catch (err) {
          console.warn(`Could not extract field name from index: ${indexId} - typeorm-exception.filter.ts:54`, err);
        }
      }

      status = HttpStatus.CONFLICT;
      message = `A ${tableName} with '${duplicateValue}' already exists.`;

    } 
    
    else if (exception.message.includes('Cannot add or update a child row')) {
    
      const relatedEntityMatch = exception.message.match(/REFERENCES\s+`(\w+)`/i);
      const relatedEntity = relatedEntityMatch?.[1] ?? 'related entity';
    
      status = HttpStatus.BAD_REQUEST;
      message = `The specified ${relatedEntity} does not exist. Please provide a valid one.`;
    
    }

    else if (exception.message.includes('null value in column')) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Null value constraint violation. Ensure required fields are provided.';
    }

    else if (exception.message.includes('value too long for column')) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Value too long for a column. Check the data length and try again.';
    }

    else if (exception.message.includes('Unknown column')) {
      const field = exception.message.split("'")[1].split("."); // Extract the field from the error message
      status = HttpStatus.BAD_REQUEST;
      message = `The field '${field[1]}' does not exist on the ${field[0]} table. Please check your query parameters or database schema.`;
    }

    else if (exception instanceof EntityNotFoundError) {

        const raw = exception.message;
        const entityMatch = raw.match(/entity of type "(.*?)"/);
        const entityName = entityMatch?.[1] ?? 'Entity';

        status = HttpStatus.NOT_FOUND;
        message = `No ${entityName.toLowerCase()} found matching the specified criteria.`;

    }

    else if (exception.message.includes('Cannot add or update a child row')) {
      status = HttpStatus.BAD_REQUEST;
    
      // Try to extract table and constraint info from the message if available
      const match = exception.message.match(/FOREIGN KEY \(`(.+?)`\) REFERENCES `(.+?)`/);
    
      if (match) {
        const [, column, referencedTable] = match;
        message = `'${column}' does not exist on '${referencedTable}'.`;
      } else {
        message = 'Invalid reference: one of the provided foreign keys does not point to an existing record.';
      }
    }
    
    console.log("", {host})
    // Log the error details
    this.logger.captureRequestContext(host as ExecutionContext, TypeOrmExceptionFilter.name)
    this.logger.error(
      `Database Error: thrown for ${request.method} ${request.url} ${message}`,
      exception,
    );

    // Prepare error response
    const errorDetails = {
      error: getHttpStatusMessage(status),
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Send response
    response.status(status).json(errorDetails);
  }
}
