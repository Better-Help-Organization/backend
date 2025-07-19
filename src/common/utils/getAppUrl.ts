import { Request } from 'express';

export function getAppUrl(req: Request): string {
    const env = process.env.NODE_ENV
    const protocol = 'https';
    const host = req.get('host');
    return `${protocol}://${host}/${env}`;
  }
