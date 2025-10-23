import Client from './Client'

export default async function Page({ params }: { params: Promise<{ unitid: string }> }) {
  const { unitid } = await params
  return <Client unitid={unitid} />
}
