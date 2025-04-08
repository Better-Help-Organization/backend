import { SetMetadata } from '@nestjs/common';
import { ExamplesObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export interface SwaggerConfig {
  operationSummary?: string;
  responses?: { 
    status: number; 
    description: string;
    examples?: ExamplesObject;
    type?: any;
  }[];
  bodyConfig?: {
    type?: any;
    description?: string;
    examples?: ExamplesObject;
  };
  paramConfig?: { 
    name: string; 
    description: string;
  }[];
  consumesConfig?: string;
  skip?: boolean; // To completely skip auto-documentation
}

export const SWAGGER_DOCS_KEY = 'swagger-doc';
export const SwaggerDoc = (config: SwaggerConfig) => SetMetadata(SWAGGER_DOCS_KEY, config);