import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import * as fs from 'fs';
import multer from 'multer';
import * as path from 'path';
import { Observable, from, switchMap } from 'rxjs';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MIME_TYPES,
  FILE_UPLOAD_KEY,
  MAX_FILE_SIZE,
  Tmp_Files_Dir,
  ValidFolders,
} from 'src/common/constants';
import { ModalService } from 'src/modal/modal.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadInterceptor implements NestInterceptor {
  constructor(
    private readonly modalService: ModalService,
    private readonly subscriptionService: SubscriptionService
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
              const dest = path.join(Tmp_Files_Dir);
              fs.mkdirSync(dest, { recursive: true });
              cb(null, dest);
            },
            filename: (req, file, cb) => {
              (async () => {
                try {
                    const token = req.user as any;
                    const uploadDir = Tmp_Files_Dir;
                    const ext = path.extname(file.originalname);

                    if (folder === ValidFolders.LICENCE) {
                      const modalId = req.query.modalId as string;
                      if (!modalId) {
                        return cb(new Error('modalId is required for licence uploads'), '');
                      }

                      const modal = await this.modalService.findOne(modalId);
                      if (!modal) {
                        return cb(new Error('Invalid modalId'), '');
                      }

                      const uuid = uuidv4();
                      const basePrefix = `${token.id}_${modalId}_${uuid}`;
                      const filename = `${basePrefix}${ext}`;

                      fs.mkdirSync(uploadDir, { recursive: true });

                      const fullPath = path.join(uploadDir, filename);
                      if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                      }

                      cb(null, filename);
                    } else if (folder === ValidFolders.PROFILE) {
                        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
                          return cb(new Error('Only image files are allowed for profile uploads'), '');
                        }

                        const basePrefix = `${token.id}`;
                        const fileName = `${basePrefix}${ext}`;

                        fs.mkdirSync(uploadDir, { recursive: true });

                        const fullPath = path.join(uploadDir, fileName);

                        if (fs.existsSync(fullPath)) {
                          fs.unlinkSync(fullPath);
                        }

                        cb(null, fileName);
                    } 
                    else if (folder === ValidFolders.DEGREE) {
                        const filename = `${token.id}_degree${ext}`;
                        cb(null, filename);
                      } else if (folder === ValidFolders.GOV_ID) {
                        const filename = `${token.id}_govid${ext}`;
                        cb(null, filename);
                      } else if (folder === ValidFolders.PROFESSIONAL_LICENSE) {
                        const filename = `${token.id}_prolicense${ext}`;
                        cb(null, filename);
                      } else if (folder === ValidFolders.WORK_EXPERIENCE) {
                        const filename = `${token.id}_cv${ext}`;
                        cb(null, filename);
                      } else if (folder === ValidFolders.SPECIAL_TRAINING) {
                        const filename = `${token.id}_training${ext}`;
                        cb(null, filename);
                      } else if (folder === ValidFolders.PAYMENT) {
                        const subscriptionId = req.query.subscriptionId as string;
                        if (!subscriptionId) {
                          return cb(new Error('subscriptionId is required for payment uploads'), '');
                        }

                        const subscription = await this.subscriptionService.findOne(subscriptionId);
                        if (!subscription) {
                          return cb(new Error('Invalid subscriptionId'), '');
                        }

                        const uuid = uuidv4();
                        const filename = `${token.id}_${subscriptionId}_${uuid}${ext}`;

                        fs.mkdirSync(uploadDir, { recursive: true });

                        const fullPath = path.join(uploadDir, filename);
                        if (fs.existsSync(fullPath)) {
                          fs.unlinkSync(fullPath);
                        }

                        cb(null, filename);
                      }
                    else {
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
              console.warn('Rejected file type: - upload.interceptor.ts:119', file.mimetype);
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
