const workstreams = [
  {
    title: "Geospatial intelligence",
    description: "Satellite data, historical comparisons, and human-reviewed observations.",
    status: "Foundation",
  },
  {
    title: "Community reporting",
    description: "Privacy-sensitive reporting workflows are not yet enabled.",
    status: "Planned",
  },
  {
    title: "AI research",
    description: "Reproducible models for environmental disturbance analysis.",
    status: "Research",
  },
  {
    title: "Drone network",
    description: "Simulation-first exploration of registered nodes and XNP.",
    status: "Future phase",
  },
];

export default function HomePage() {
  return (
    <main className="container">
      <header className="masthead">
        <div className="brand">XERSXES <span>GHANA</span></div>
        <span className="eyebrow">Development environment · v0.1</span>
      </header>
      <section className="hero">
        <p className="kicker">Environmental intelligence</p>
        <h1>Evidence-led monitoring for a healthier environment.</h1>
        <p className="intro">
          A research-led platform combining geospatial analysis, responsible reporting,
          and verifiable environmental observations.
        </p>
        <div className="notice">
          Prototype only. Do not submit confidential reports or sensitive evidence.
        </div>
      </section>
      <section aria-labelledby="workstreams-title">
        <div className="section-heading">
          <h2 id="workstreams-title">Engineering workstreams</h2>
          <p>Foundations first. Field systems later.</p>
        </div>
        <div className="grid">
          {workstreams.map((item) => (
            <article key={item.title} className="card">
              <span className="status">{item.status}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
      <footer>Built with care by the XERSXES engineering team.</footer>
    </main>
  );
}
