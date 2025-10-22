export default function AdminScorecard(){
  return (
    <main style={{padding:24}}>
      <h1>Admissions (College Scorecard) – Admin</h1>
      <p>This page exists so the /admin/scorecard link resolves.</p>
      <ol>
        <li>Run a small ingest in Terminal to verify: <code>node scripts/scorecard_ingest.mjs 2019 2020</code></li>
        <li>Then load all years: <code>node scripts/scorecard_ingest.mjs 2000 $(( $(date +%Y) - 1 ))</code></li>
      </ol>
    </main>
  );
}
