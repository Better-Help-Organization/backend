import { applyDecorators } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ExamplesObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { getMetadataStorage } from 'class-validator';
import 'reflect-metadata';
import { SwaggerConfig } from 'src/common/decorators/swagger-docs.decorator';


export class SwaggerDocs {
  private static reflector = new Reflector();
  private consumesConfig: string;
  private operationSummary: string;
  private paramConfig?: { name: string; description: string }[];
  private bodyConfig?: { type?: any; examples?: ExamplesObject, description?: string, properties?: any };
  private responses: { status: number; description: string, examples?: ExamplesObject, type?: any}[];
  private bearerAuth?: boolean;

  constructor(
    args:{
        operationSummary?: string,
        responses?: { status: number; description: string, examples?: ExamplesObject, type?: any }[],
        bodyConfig?: {type?:any, description?: string; examples?: ExamplesObject, properties?: any },
        paramConfig?: { name: string; description: string }[],
        consumesConfig?: string,
        }
      ){
    this.operationSummary = args.operationSummary;
    this.responses = args.responses;
    this.bodyConfig = args.bodyConfig;
    this.paramConfig = args.paramConfig;
    this.consumesConfig = args.consumesConfig;
  }

  private updateApiProperties(dtoType: any) {
    const metadataStorage = getMetadataStorage();
    const dtoProperties = metadataStorage
      .getTargetValidationMetadatas(dtoType, '', false,null)
      .filter(meta => {
        return meta.constraintCls?.name === 'IsOptional'
      })
      .map(meta => meta.propertyName);
    const dtoMetadata = Reflect.getMetadata('swagger/apiModelPropertiesArray', dtoType) || [];
    for (const property of dtoMetadata) {
      if (dtoProperties.includes(property.propertyName)) {
        property.required = false; // Mark optional properties as not required
      }
    }
  }

  apply() : MethodDecorator {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {

      // TODO: doesnt differentiate between body and query
      const types = Reflect.getMetadata('design:paramtypes', target, propertyKey);
      const classGuards = Reflect.getMetadata('__guards__', target.constructor);
      const methodGuards = Reflect.getMetadata('__guards__', descriptor.value);
      const dynamicGuards = Reflect.getMetadata('dynamicGuards', descriptor.value);
      const allGuards = [...(classGuards || []), ...(methodGuards || []), ...(dynamicGuards || []),];
      
      if (allGuards && allGuards.length > 0) {
        // If any guards are present, enable bearer auth
        this.bearerAuth = true;
      }

        if (types) {
          // Find the DTO type from the parameters
          const dtoType = types.find(type => 
            type && type.name && type.name.includes('Dto')
          );
        
          if (dtoType) {
            this.updateApiProperties(dtoType);
            this.bodyConfig = {
              ...this.bodyConfig,
              type: dtoType,
            };
          } else {
            // Handle individual parameters in @Body
            const bodyParams = [];
            
            types.forEach((type, index) => {
              if (type && type.name && type.name !== 'Object' && type.name !== 'String') {
                // Check if parameter has @Body decorator
                const metadataKeys = Reflect.getMetadataKeys(target, propertyKey);
                if (metadataKeys.some(key => key.includes('Body'))) {
                  const paramName = Reflect.getMetadata('body:param', target, propertyKey);
                  bodyParams.push({
                    name: paramName || `param${index + 1}`,
                    type: type.name,
                  });
                }
              }
            });
        
            if (bodyParams.length > 0) {
              // Update bodyConfig with extracted parameters
              this.bodyConfig = {
                ...this.bodyConfig,
                description: 'Body parameters',
                examples: {}, // Optional: Add examples if needed
                properties: bodyParams.reduce((acc, param) => {
                  acc[param.name] = { type: param.type };
                  return acc;
                }, {}),
              };
            }
          }
        }

      const decorators = [
        ApiOperation({ summary: this.operationSummary }),
        this.bearerAuth? ApiBearerAuth():null,
          // Apply ProtectedEndpoint shorthand if guards are present
        // this.bearerAuth ? ProtectedEndpoint() : null,  // Add ProtectedEndpoint decorator here
        ...this.responses.map(({ status, description, examples }) =>
          ApiResponse({
            status,
            description,
            content: { 'application/json': { examples } }
          })
        ),
        this.bodyConfig ? ApiBody(this.bodyConfig) : null,
        ...(this.paramConfig?.map(param => ApiParam(param)) || []),
        this.consumesConfig ? ApiConsumes(this.consumesConfig) : null,
      ].filter(Boolean);

      return applyDecorators(...decorators)(target, propertyKey, descriptor);
    }
  }

  static findAndDecorateControllers(controllers: string[]) {
    for (const controllerPath of controllers) {
      try {
        const controllerModule = require(controllerPath);
        const controllerClass = Object.values(controllerModule).find(
          (exported): exported is Function => typeof exported === 'function',
        );

        if (controllerClass) {
          const methods = Object.getOwnPropertyNames(controllerClass.prototype).filter(
            method => method !== 'constructor',
          );

          for (const method of methods) {
            const descriptor = Object.getOwnPropertyDescriptor(
              controllerClass.prototype,
              method,
            );

            if (descriptor) {
              // Check for custom swagger documentation
              const customConfig = Reflect.getMetadata(
                'swagger-doc',
                descriptor.value
              ) as SwaggerConfig;

              if (customConfig?.skip) {
                continue; // Skip this method if explicitly marked to skip
              }

              if (customConfig) {
                // Use custom configuration
                const docs = new SwaggerDocs({
                  operationSummary: customConfig.operationSummary || `${controllerClass.name}.${method}`,
                  responses: customConfig.responses || [
                    {
                      status: 200,
                      description: 'Success',
                    },
                  ],
                  bodyConfig: customConfig.bodyConfig,
                  paramConfig: customConfig.paramConfig,
                  consumesConfig: customConfig.consumesConfig
                });

                docs.apply()(controllerClass.prototype, method, descriptor);
              } else {
                // Use auto-generated documentation
                const docs = new SwaggerDocs({
                  operationSummary:`Auto-generated for ${controllerClass.name}.${method}`,
                  responses:[
                    {
                      status: 200,
                      description: 'Success',
                    },
                  ],}
                );

                docs.apply()(controllerClass.prototype, method, descriptor);
              }

              Object.defineProperty(controllerClass.prototype, method, descriptor);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing controller ${controllerPath}: - SwaggerDocs.ts:198`, error);
      }
    }
  }
}