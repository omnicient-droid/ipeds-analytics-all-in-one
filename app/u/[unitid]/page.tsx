import Client from './Client';
export const dynamic = 'force-dynamic';
export default function Page({ params }: { params: { unitid: string } }) {
  const unitid = Number(params.unitid);
  return <Client unitid={unitid} />;
}
