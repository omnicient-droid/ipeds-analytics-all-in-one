export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function EmbedIndex() {
  const examples = [
    {
      title: 'Admissions vs Enrollment (Columbia)',
      href: '/embed/series?codes=ADM.ADM_RATE,EF.FALL.UG.TOTAL&unitids=190150&transform=level&forecast=0&smooth=0&height=360',
    },
    {
      title: 'Enrollment by race (UNC) – factor',
      href: '/embed/series?codes=EF.FALL.UG.WHITE,EF.FALL.UG.BLACK,EF.FALL.UG.HISP,EF.FALL.UG.ASIAN&unitids=199120&transform=factor&forecast=0&smooth=0&height=380',
    },
    {
      title: 'Race shares (UNC) – stacked area',
      href: '/embed/area?codes=EF.FALL.UG.WHITE,EF.FALL.UG.BLACK,EF.FALL.UG.HISP,EF.FALL.UG.ASIAN&unitid=199120&height=380',
    },
    {
      title: 'Admissions rate KPI (Harvard)',
      href: '/embed/kpi?code=ADM.ADM_RATE&unitid=166027&label=Admissions%20rate&height=120',
    },
    {
      title: 'Compare admissions rate – Columbia vs Harvard',
      href: '/embed/compare?code=ADM.ADM_RATE&unitids=190150,166027&transform=level&height=360',
    },
    {
      title: 'YoY enrollment (Columbia)',
      href: '/embed/series?codes=EF.FALL.UG.TOTAL&unitids=190150&transform=yoy&forecast=0&smooth=0&height=360',
    },
  ]
  const origin = ''
  return (
    <div className="box">
      <div className="box-header">Embeds</div>
      <div className="box-body">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Copy the iframe code below to embed a live chart in any CMS. Tip: adjust codes, unitids,
          transform, and height.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {examples.map((e) => (
            <li key={e.title} style={{ margin: '12px 0' }}>
              <div style={{ fontWeight: 600 }}>{e.title}</div>
              <div className="text-xs" style={{ marginTop: 6 }}>
                <code>
                  {`<iframe src="${origin}${e.href}" width="100%" height="420" style="border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`}
                </code>
              </div>
              <div style={{ marginTop: 8 }}>
                <Link href={e.href} className="btn-primary">
                  Open preview
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
