'use client'
import { useState } from 'react'
export default function CompareClient() {
  const [unitids, setUnitids] = useState<string>('190150,166027')
  const [codes, setCodes] = useState<string>('EF.EFYTOTL')
  return (
    <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>Interactive compare (client)</h2>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#666' }}>UNITIDs (comma-separated)</div>
        <input value={unitids} onChange={(e)=>setUnitids(e.target.value)}
               style={{ width:'100%', padding:8, border:'1px solid #ccc', borderRadius:6 }}
               placeholder="190150,166027" />
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#666' }}>Metric codes</div>
        <input value={codes} onChange={(e)=>setCodes(e.target.value)}
               style={{ width:'100%', padding:8, border:'1px solid #ccc', borderRadius:6 }}
               placeholder="EF.EFYTOTL,EF.EFWHITT" />
      </label>
      <p style={{ fontSize:12, color:'#666' }}>
        Tip: later this can call <code>/api/compare?unitids=...&codes=...</code>.
      </p>
    </section>
  )
}
