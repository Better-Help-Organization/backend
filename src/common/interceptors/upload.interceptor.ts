import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, from, switchMap } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { ModalService } from 'src/modal/modal.service';
import { TherapistService } from 'src/therapist/therapist.service';
import {
    ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MIME_TYPES,
  FILE_UPLOAD_KEY,
  Final_Files_Dir,
  MAX_FILE_SIZE,
  ValidFolders,
} from 'src/common/constants';

@Injectable()
export class UploadInterceptor implements NestInterceptor {
  constructor(
    private readonly modalService: ModalService,
    private readonly therapistService: TherapistService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const folder = req.params.folder as ValidFolders;

    return from(
      new Promise<void>(async (resolve, reject) => {
        const upload = multer({
          storage: multer.diskStorage({
            destination: (req, file, cb) => {
              const dest = path.join(Final_Files_Dir, folder);
              fs.mkdirSync(dest, { recursive: true });
              cb(null, dest);
            },
            filename: (req, file, cb) => {
              (async () => {
                try {
                    const token = req.user as any;
                    const therapist = await this.therapistService.findOne(token.id);
                    const uploadDir = path.join(Final_Files_Dir, folder);
                    const ext = path.extname(file.originalname);

                    const safeName = (s: string) =>
                        (s ?? '')
                        .toString()
                        .trim()
                        .replace(/\s+/g, '_')
                        .replace(/[^A-Za-z0-9_]/g, '')
                        .replace(/_+/g, '_')
                        .replace(/^_+|_+$/g, '');

                    const first = safeName(therapist.firstName);
                    const last = safeName(therapist.lastName);
                    const basePrefix = `${first}_${last}_${therapist.id}`;

                    if (folder === ValidFolders.LICENCE) {
                        const modalId = req.query.modalId as string;
                        console.log("Modal id: ", modalId);
                        if (!modalId) {
                            return cb(new Error('modalId is required for licence uploads'), '');
                        }

                        const modal = await this.modalService.findOne(modalId);
                        if (!modal) {
                            return cb(new Error('Invalid modalId'), '');
                        }

                        const fileName = `${basePrefix}_${modalId}${ext}`;
                        const fullPath = path.join(uploadDir, fileName);

                        if (fs.existsSync(fullPath)) {
                            fs.unlinkSync(fullPath);
                        }

                        cb(null, fileName);
                    }  else if (folder === ValidFolders.PROFILE) {
                        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
                            return cb(new Error('Only image files are allowed for profile uploads'), '');
                        }

                        const fileName = `${basePrefix}${ext}`;
                        const fullPath = path.join(uploadDir, fileName);

                        if (fs.existsSync(fullPath)) {
                            fs.unlinkSync(fullPath);
                        }

                        cb(null, fileName);
                    } else {
                        return cb(new Error('Unsupported folder type'), '');
                    }
                } catch (err: any) {
                  cb(new Error(err.message || 'File validation error'), undefined);
                }
              })();
            },
          }),
          fileFilter: (req, file, cb) => {
            if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
              console.warn('Rejected file type:', file.mimetype);
            }
            cb(null, true);
          },
          limits: {
            fileSize: MAX_FILE_SIZE,
          },
        }).single(FILE_UPLOAD_KEY);

        upload(req, req.res as any, (err: any) => {
          if (err) {
            reject(new BadRequestException(err.message));
          } else {
            resolve();
          }
        });
      }),
    ).pipe(switchMap(() => next.handle()));
  }
}
