import 'dotenv/config';
import { ingestEf } from './ingest-ipeds-ef';

async function main() {
  console.log('Backfill started…');
  await ingestEf();
  // TODO: add E12/ADM/GR ingestors using same pattern.
  console.log('Backfill complete.');
}
main().catch(e => { console.error(e); process.exit(1); });
