import Client from './Client';
import { SCHOOLS } from '@/lib/schools';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { unitid: string } }) {
  const unitid = Number(params.unitid);
  const school = Object.values(SCHOOLS).find(s=>s.unitid===unitid);
  return (
    <main>
      <h1 className="sr-only">
        {school?.name ?? `UNITID ${unitid}`}{(school as any)?.isCommunityCollege ? ' *' : ''}
      </h1>
      <Client unitid={unitid}/>
    </main>
  );
}
