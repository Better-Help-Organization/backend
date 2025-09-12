import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiQuery } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { ConditionalGuards } from 'src/common/guard/conditional.guard';

type Primitive = string | number | boolean | null | undefined;

type DeepKeyOf<T> = T extends Primitive
  ? never
  : T extends Array<infer U>
  ? DeepKeyOf<U>
  : T extends object
  ? {
      [K in keyof T & string]: T[K] extends Array<infer U>
        ? K | `${K}.${DeepKeyOf<U>}`
        : T[K] extends object
        ? K | `${K}.${DeepKeyOf<T[K]>}`
        : K
    }[keyof T & string]
  : never;


export class FindAllQueryParams<T=any> {
  @ApiProperty({
    description: 'Comma-separated list of fields to select. Supports relations.',
    required: false,
  })
  @IsOptional()
  @IsString()
  fields?: string | DeepKeyOf<T>;

  @ApiProperty({
    description: 'Comma-separated filters in the format field=operator=value. Supports relations.',
    required: false,
  })
  @IsOptional()
  @IsString()
  filters?: string;

  @ApiProperty({
    description: 'Comma-separated sorting fields in the format field=order (ASC/DESC). Use "random" for random order.',
    required: false,
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({
    description: 'Number of results per page (pagination). Defaults to 10.',
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  take?: string;

  @ApiProperty({
    description: 'Current page number for pagination. Defaults to 1.',
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiProperty({
    description:
      'Comma-separated list of IDs to filter by. Example: uuid1,uuid2,uuid3',
    required: false,
    // example:
    //   '550e8400-e29b-41d4-a716-446655440000,7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @IsOptional()
  @IsString()
  ids?: string;

  // options: FindManyOptions<T> | FindOneOptions<T>
}

export class FindOneQueryParams<T=any> {
  @ApiProperty({
    description: 'Comma-separated list of fields to select. Supports relations.',
    example: 'id',
    required: false,
  })
  @IsOptional()
  @IsString()
  fields?:string;

  @ApiProperty({
    description: 'Comma-separated filters in the format field=operator=value. Supports relations.',
    example: 'id!=null',
    required: false,
  })
  @IsOptional()
  @IsString()
  filters?: string;

  @ApiProperty({
    description: 'Comma-separated sorting fields in the format field=order (ASC/DESC). Use "random" for random order.',
    example: 'id=DESC',
    required: false,
  })
  @IsOptional()
  @IsString()
  sort?: string;

  take?: string;

  page?: string;

  ids?: string;
  // options: FindOneOptions<T>
}

export class FindOnePathParams {
  @ApiProperty({
    description: 'The unique identifier for the parameter.',
    example: '1',
    required: true,
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'The hcat id to be used in the message route.',
    example: '1',
    required: true,
  })
  @IsOptional()
  @IsString()
  chatId: string;

}

export function ApiFindOneQueryParams(guards: any[] = []) {
  return applyDecorators(
    ConditionalGuards(guards),
    ApiQuery({
      name: 'fields',
      description: 'Comma-separated list of fields to select. Supports relations.',
      example: '',
      required: false,
    }),
    ApiQuery({
      name: 'filters',
      description: 'Comma-separated filters in the format field=operator=value. Supports relations.',
      example: 'id!=null',
      required: false,
    }),
    ApiQuery({
      name: 'sort',
      description: 'Comma-separated sorting fields in the format field=order (ASC/DESC).',
      example: '',
      required: false,
    }),
  );
}

export function ApiFindAllQueryParams(guards: any[] = []) {
  return applyDecorators(
    ConditionalGuards(guards),
    ApiQuery({
      name: 'fields',
      description: 'Comma-separated list of fields to select. Supports relations.',
      example: '',
      required: false,
    }),
    ApiQuery({
      name: 'filters',
      description: 'Comma-separated filters in the format field=operator=value. Supports relations.',
      example: '',
      required: false,
    }),
    ApiQuery({
      name: 'sort',
      description: 'Comma-separated sorting fields in the format field=order (ASC/DESC).',
      example: '',
      required: false,
    }),
    ApiQuery({
      name: 'take',
      description: 'Number of results per page (pagination). Defaults to 10.',
      // example: ,
      required: false,
    }),
    ApiQuery({
      name: 'page',
      description: 'Current page number for pagination. Defaults to 1.',
      // example: 2,
      required: false,
    }),
    ApiQuery({
      name: 'ids',
      description: 'Comma-separated list of IDs to filter by',
      // example:
      //   '550e8400-e29b-41d4-a716-446655440000,7c9e6679-7425-40de-944b-e07fc1f90ae7',
      required: false,
    }),
  );
}

export function ApiFilterByDate() {
  return applyDecorators(
    ApiQuery({ 
      name: 'startDate', 
      required: false, 
      type: String, 
      example:"2024-02-01",
    }),
    ApiQuery({ 
      name: 'endDate', 
      required: false, 
      example:"2024-02-10",
      type: String, 
    })
  );
}
