import { ExternalLink, ShieldCheck, Signal, TriangleAlert } from "lucide-react";
import { Panel, PanelHeader, SectionHeader, StatCard } from "./ui/Panel";

export function AboutPage() {
  return (
    <div className="space-y-8">
      <section className="panel p-6">
        <p className="eyebrow mb-2 text-hub-crisis/90">About Ebola Situation View</p>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-hub-text">
          Situational awareness for Ebola virus disease public information
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-hub-muted">
          Ebola Situation View helps response and program teams monitor public information related to Ebola virus disease
          outbreaks, with emphasis on the DRC/Uganda outbreak corridor and related regional signals. It brings together
          parsed official situation counts, public RSS/news signals, geographic tagging, source-tier labels, and optional
          briefing synthesis in one view.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Official counts"
          value="MoH · WHO · ECDC"
          hint="Used for confirmed cases and deaths"
          icon={ShieldCheck}
          tone="verified"
        />
        <StatCard
          label="Public signals"
          value="RSS · News"
          hint="Filtered for EVD relevance and geography"
          icon={Signal}
          tone="info"
        />
        <StatCard
          label="Important limit"
          value="Not surveillance"
          hint="Media signals are not confirmed case counts"
          icon={TriangleAlert}
          tone="caution"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel noPadding>
          <PanelHeader eyebrow="Data streams" title="What the app combines" />
          <div className="space-y-4 px-5 pb-5 text-sm leading-relaxed text-hub-muted">
            <div>
              <h3 className="mb-1 font-medium text-hub-text">Official situation data</h3>
              <p>
                Confirmed case and death counters are parsed from selected official pages, currently Uganda Ministry
                of Health, WHO Disease Outbreak News, and ECDC. These cards link back to the source page so users can
                verify the reported figures, reporting dates, and any differences between sources.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-medium text-hub-text">Public information signals</h3>
              <p>
                RSS and news feeds are scanned for Ebola relevance, outbreak language, geography, response operations,
                and cross-border signals. Source-tier labels distinguish configured primary feeds from Google News
                aggregators; they are heuristics for triage, not publisher-level verification. These signals help teams
                spot relevant public information quickly, but they do not replace official situation reports.
              </p>
            </div>
          </div>
        </Panel>

        <Panel noPadding>
          <PanelHeader eyebrow="Interpretation" title="How to use it safely" />
          <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-hub-muted">
            <p>
              Use the <span className="font-medium text-hub-text">Official situation</span> section for confirmed
              case/death figures, and use the map, feed, timeline, and alerts as situational awareness aids.
            </p>
            <p>
              Source tiers distinguish configured primary feeds such as WHO, CDC, and ReliefWeb from aggregator feeds.
              Automated severity and relevance scores are designed for triage, not confirmation.
            </p>
            <p>
              Briefings synthesize currently indexed public signals using the configured synthesis provider. They cite
              article IDs when source articles are available, and should be reviewed against official source links before
              operational decisions.
            </p>
          </div>
        </Panel>
      </section>

      <section>
        <SectionHeader
          eyebrow="Architecture"
          title="Technical documentation"
          description="The repository includes a deeper architecture document with diagrams, data-flow notes, API surface, deployment model, and extension points."
        />
        <Panel>
          <a
            href="https://github.com/aiforglobalgood/ebola/blob/main/docs/architecture.md"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-hub-info hover:text-hub-text"
          >
            Open architecture document on GitHub
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="mt-3 text-sm leading-relaxed text-hub-muted">
            If the GitHub link is unavailable, see <code className="font-mono text-hub-text">docs/architecture.md</code>{" "}
            in this repository checkout.
          </p>
        </Panel>
      </section>
    </div>
  );
}
