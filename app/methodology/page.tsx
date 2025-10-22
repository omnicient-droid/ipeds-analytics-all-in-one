export const dynamic = 'force-static';
export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 prose">
      <h1>Methodology & Notes</h1>
      <h2>Data Sources</h2>
      <p>Primary source: IPEDS, accessed programmatically. Current focus: Fall Enrollment (EF), 12‑Month Enrollment (E12), Admissions (ADM), and Graduation Rates (GR).</p>
      <h2>Race & Ethnicity</h2>
      <ul>
        <li>Hispanic/Latino is reported regardless of race.</li>
        <li>Nonresident Alien and Race/Ethnicity Unknown are shown separately.</li>
        <li>“Two or more races” appears in recent years; some older series omit it.</li>
      </ul>
      <h2>Timing</h2>
      <p>IPEDS releases are periodic. We poll monthly and refresh when a new year or release stage becomes available.</p>
      <h2>Community Colleges</h2>
      <p>Community colleges (2‑year) are marked with an asterisk (*) for clarity (e.g., SMC*).</p>
    </main>
  );
}
