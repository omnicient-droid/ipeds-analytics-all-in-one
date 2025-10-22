import Link from 'next/link'
export default function Home(){
  return (
    <main className="container">
      <h1>Statipedia (prototype)</h1>
      <p>Read-only API examples:</p>
      <pre>GET /api/schools?query=Columbia</pre>
      <pre>GET /api/series?unitid=190150&codes=SC.ADM.RATE,SC.SAT.TOTAL25&from=2015&to=2020</pre>
      <ul>
        <li><Link href="/admin/scorecard">Admissions (Scorecard) ingester</Link></li>
        <li><Link href="/admin/fetch">IPEDS EF ingester</Link></li>
      </ul>
    </main>
  )
}
