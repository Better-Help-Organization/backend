import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DefaultParameters, TokenPayload } from 'src/common/constants';
import { Parameter } from 'src/common/entities/parameter.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateParameterDto } from './dto/create-parameter.dto';
import { UpdateParameterDto } from './dto/update-parameter.dto';

@Injectable()
export class ParameterService {
  constructor(
    @InjectRepository(Parameter)
    private readonly paramRepo: Repository<Parameter>,
    // @InjectRepository(PermissionEntity)
    // private readonly permissionRepository: Repository<PermissionEntity>,
    private readonly logger: LoggerService
  ) {}


  async findAll(queryParams?: FindAllQueryParams<Parameter>) {
    this.logger.log('Fetching all parameters');
    try {
      const result = await new APIFeatures(this.paramRepo, queryParams).getMany();
      this.logger.log('Successfully fetched all parameters');
      return result;
    } catch (error) {
      this.logger.error('Error fetching all parameters', error);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams<Parameter>) {
    this.logger.log(`Fetching parameter with id: ${id}`);
    try {
      const param = await new APIFeatures(this.paramRepo, queryParams).getOne(id);
      if (!param) {
        this.logger.warn(`Parameter with id ${id} not found`);
        throw new NotFoundException('Parameter not found');
      }
      this.logger.log(`Successfully fetched parameter with id: ${id}`);
      return param;
    } catch (error) {
      this.logger.error(`Error fetching parameter with id: ${id}`, error);
      throw error;
    }
  }

  async getDefaultByName(name: string): Promise<string | number | number[]> {
    this.logger.log(`Fetching default parameter by name: ${name}`);
    try {

      const queryParams: FindAllQueryParams<Parameter> = {
        filters: `name=${name}`,
      };

      const response = await this.findAll(queryParams);

      this.logger.log(`Successfully fetched default parameter by name: ${name}`);

      switch (name) {
        case DefaultParameters.VAT:
          return await  this.parseFloatParams(response.data[0]);
        case DefaultParameters.NOTIFICATION_EXPIRY:
          return this.parseFloatParams(response.data[0]);
        default:
          throw new NotFoundException(`Default parameter with name ${name} not found`);
      }
    } catch (error) {
      this.logger.error(`Error fetching default parameter by name: ${name}`, error);
      throw error;
    }
  }


  private async parseFloatParams(param:Parameter){
    return parseFloat(param.value)
  }

  async create(dto: CreateParameterDto): Promise<Parameter> {
    this.logger.log(`Creating parameter with name: ${dto.name}`);
    try {
      const existingParameter = await this.paramRepo.findOneBy({ name: dto.name });
      if (existingParameter) {
        this.logger.warn(`Parameter with name ${dto.name} already exists`);
        throw new ConflictException(`Parameter with name ${dto.name} already exists`);
      }


      const param = this.paramRepo.create({
        name: dto.name,
        value: dto.value,
      });
      const savedParam = await this.paramRepo.save(param);
      this.logger.log(`Successfully created parameter with name: ${dto.name}`);
      return savedParam;
    } catch (error) {
      this.logger.error(`Error creating parameter with name: ${dto.name}`, error);
      throw error;
    }
  }

  async update(id: string, updateData: UpdateParameterDto, user: TokenPayload): Promise<Parameter> {
    this.logger.log(`Updating parameter with id: ${id}`);
    try {
      const parameter = await this.findOne(id, { fields: "permissions.*, name, value" });
      const { name, value } = updateData;
      // await this.verifyPermissions(
      //   user?.type,
      //   parameter?.permissions,
      // );

      // const hasSystemPermission = this.hasSystemLevelPermissions(parameter);

      // if (hasSystemPermission && updateData.permissions) {
      //   this.logger.warn('Admins cannot modify system-level permissions');
      //   throw new UnauthorizedException('Admins cannot modify system-level permissions');
      // }

      // if (hasSystemPermission && updateData.value === null) {
      //   this.logger.warn('You cannot edit system-level parameters');
      //   throw new UnauthorizedException('You cannot edit system-level parameters');
      // }

      parameter.name = name;
      parameter.value = value;

      const updatedParam = await this.paramRepo.save({ ...parameter, id });
      this.logger.log(`Successfully updated parameter with id: ${id}`);
      return updatedParam;
    } catch (error) {
      this.logger.error(`Error updating parameter with id: ${id}`, error);
      throw error;
    }
  }

  // private hasSystemLevelPermissions(parameter: Parameter): boolean {
  //   return parameter.permissions.some(
  //     (permission) => permission.type === Permission.SYSTEM,
  //   );
  // }

  async remove(id: string) {
    this.logger.log(`Removing parameter with id: ${id}`);
    try {
      const parameter = await this.findOne(id, { fields: "permissions.*" });

      // const hasSystemPermission = this.hasSystemLevelPermissions(parameter);

      // if (hasSystemPermission) {
      //   this.logger.warn('You cannot delete system-level parameters');
      //   throw new UnauthorizedException('You cannot delete system-level parameters');
      // }

      await this.paramRepo.remove(parameter);
      this.logger.log(`Successfully removed parameter with id: ${id}`);
    } catch (error) {
      this.logger.error(`Error removing parameter with id: ${id}`, error);
      throw error;
    }
  }
}
