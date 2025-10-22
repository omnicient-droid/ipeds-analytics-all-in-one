import 'dotenv/config';
import { ingestEf } from './ingest-ipeds-ef';

async function main() {
  console.log('Starting backfill…');
  await ingestEf();
  // TODO: add ingest for E12, ADM, GR here as you implement them.
  console.log('Backfill done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
