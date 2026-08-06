import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import * as tls from 'tls';

const axios = require(require.resolve('axios', { paths: [require.resolve('@nestjs/axios')] }));

const DEFAULT_TELEBIRR_CA_URL = 'http://secure.globalsign.com/cacert/gsgccr3evtlsca2025.crt';
const GENERATED_PEM_NAME = 'gsgccr3evtlsca2025.pem';

export type TelebirrCaBundle = {
  caBundlePath: string | null;
  httpsAgent?: https.Agent;
  cleanup: () => Promise<void>;
};

function normalizePem(contents: Buffer): string {
  const text = contents.toString('utf8').trim();
  if (text.startsWith('-----BEGIN CERTIFICATE-----')) {
    return `${text}\n`;
  }

  const base64 = contents.toString('base64').match(/.{1,64}/g)?.join('\n');
  if (!base64) {
    throw new Error('Failed to convert Telebirr CA certificate to PEM');
  }

  return `-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----\n`;
}

export async function prepareTelebirrCaBundle(): Promise<TelebirrCaBundle> {
  const explicitPath = process.env.TELEBIRR_CA_BUNDLE_PATH;
  if (explicitPath) {
    const caBundlePath = path.resolve(explicitPath);
    return {
      caBundlePath,
      httpsAgent: new https.Agent({
        ca: [...tls.rootCertificates, fs.readFileSync(caBundlePath, 'utf8')],
      }),
      cleanup: async () => undefined,
    };
  }

  const certUrl = process.env.TELEBIRR_CA_CERT_URL || DEFAULT_TELEBIRR_CA_URL;
  const response = await axios.get(certUrl, {
    responseType: 'arraybuffer',
    timeout: 20000,
    validateStatus: (status: number) => status >= 200 && status < 300,
  });

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'telebirr-ca-'));
  const caBundlePath = path.join(tempDir, GENERATED_PEM_NAME);
  const pem = normalizePem(Buffer.from(response.data));
  await fsp.writeFile(caBundlePath, pem, 'utf8');

  return {
    caBundlePath,
    httpsAgent: new https.Agent({
      ca: [...tls.rootCertificates, pem],
    }),
    cleanup: async () => {
      await fsp.rm(tempDir, { recursive: true, force: true });
    },
  };
}
