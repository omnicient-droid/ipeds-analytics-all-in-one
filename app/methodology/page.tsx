export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 prose">
      <h1>Methodology & Notes</h1>
      <h2>Data Sources</h2>
      <p>Primary source: IPEDS (via the Urban Institute Education Data API). Metrics include Fall Enrollment (EF), 12-Month Enrollment (E12), Admissions (ADM), and Graduation Rates (GR).</p>
      <h2>Race & Ethnicity</h2>
      <ul>
        <li>Hispanic/Latino is reported regardless of race.</li>
        <li>Nonresident Alien and Race/Ethnicity Unknown are shown as their own categories.</li>
        <li>“Two or more races” appears starting in recent years; earlier series may not include it.</li>
      </ul>
      <h2>Release Timing</h2>
      <p>IPEDS releases are periodic; data are posted as Provisional and later as Final. We poll monthly and refresh when a new year or stage becomes available.</p>
      <h2>Comparability</h2>
      <p>Undergraduate Fall Enrollment (EF) shows a census snapshot; 12-Month Enrollment (E12) is unduplicated across the academic year. For community colleges (2-year), E12 may better reflect throughput.</p>
      <h2>Community Colleges</h2>
      <p>We mark community colleges with an asterisk (*) for clarity (e.g., SMC*).</p>
    </main>
  );
}
