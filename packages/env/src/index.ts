import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(import.meta.dirname, '../../../.env') });

// TODO: add type-checking
export const env = {
   ...process.env,
};
