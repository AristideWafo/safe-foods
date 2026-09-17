import { URL } from 'node:url';
import { cp, mkdir } from 'node:fs/promises';
const destination = new URL('../public/scanbot-engine/', import.meta.url);
await mkdir(destination, { recursive: true });
await cp(new URL('../node_modules/scanbot-web-sdk/bundle/bin/barcode-scanner/', import.meta.url), destination, { recursive: true });
