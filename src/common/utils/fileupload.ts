import * as fs from 'fs';
import * as path from 'path';
import { diskStorage } from 'multer';
import { FilesInterceptor } from '@nestjs/platform-express';
import { BadRequestException, Type } from '@nestjs/common';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from 'src/common/constants';
import { Request } from 'express';

interface UploadOptions {
  baseDir: string;                                  // e.g., /uploads/tmp
  subDir: string | ((req: Request) => string);      // e.g., product
  subSubDir: string | ((req: Request) => string);   // e.g., uuidv4()
  maxCount?: number;                                // Optional max number of files
}
export function fileUpload(fieldName: string, options: UploadOptions): Type<any> {
  return FilesInterceptor(fieldName, options.maxCount ?? 10, {
    storage: diskStorage(
      {
      destination: (req, file, cb) => {
        const subDir = typeof options.subDir === 'function' ? options.subDir(req) : options.subDir;
        if (!req['__uploadUuid']) {
          req['__uploadUuid'] = typeof options.subSubDir === 'function'
            ? options.subSubDir(req)
            : options.subSubDir;
        }
        const subSubDir = req['__uploadUuid'];
        const dest = path.join(options.baseDir, subDir, subSubDir);
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: MAX_FILE_SIZE,
    }
  });
}