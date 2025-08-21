import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { ValidFolders } from 'src/common/constants';

export const ValidatedFolder = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ValidFolders => {
    const request = ctx.switchToHttp().getRequest();
    const folder = request.params.folder;

    if (!Object.values(ValidFolders).includes(folder)) {
      throw new BadRequestException(`Invalid folder: "${folder}". Must be one of: ${Object.values(ValidFolders).join(', ')}`);
    }

    return folder as ValidFolders;
  },
);
