import { useState, type ReactNode } from "react";
import { TowerAlert } from "../api";
import { AlertPanel } from "./BriefingPanel";
import { ScrollSection, SectionHeader } from "./ui/Panel";

type FeedTab = "verified" | "media";

export function SignalFeedsSection({
  verified,
  media,
}: {
  verified: TowerAlert[];
  media: TowerAlert[];
}) {
  const [tab, setTab] = useState<FeedTab>("verified");

  return (
    <ScrollSection
      defaultHeight={480}
      header={
        <div className="mb-0 flex flex-wrap items-end justify-between gap-3">
          <SectionHeader
            eyebrow="Signals"
            title={tab === "verified" ? "Primary source EVD signals" : "Media mentions"}
            description={
              tab === "verified"
                ? "WHO · ReliefWeb · CDC — highest trust tier"
                : "Headlines & aggregators — not confirmed case counts"
            }
            className="mb-0"
          />
          <div className="flex gap-2 pb-1">
            <FeedTabButton active={tab === "verified"} onClick={() => setTab("verified")} tone="verified">
              Verified ({verified.length})
            </FeedTabButton>
            <FeedTabButton active={tab === "media"} onClick={() => setTab("media")} tone="caution">
              Media ({media.length})
            </FeedTabButton>
          </div>
        </div>
      }
    >
      {tab === "verified" ? (
        <AlertPanel
          alerts={verified}
          emptyMessage="No primary-source alerts match this filter."
          variant="verified"
        />
      ) : (
        <AlertPanel alerts={media} emptyMessage="No media signals match this filter." variant="media" />
      )}
    </ScrollSection>
  );
}

function FeedTabButton({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: "verified" | "caution";
  children: ReactNode;
}) {
  const activeClass =
    tone === "verified"
      ? "border-hub-verified/40 bg-hub-verified-soft text-hub-verified"
      : "border-hub-caution/40 bg-hub-caution-soft text-hub-caution";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 font-mono text-2xs uppercase tracking-wide transition ${
        active ? activeClass : "border-hub-border bg-hub-surface text-hub-muted hover:text-hub-text"
      }`}
    >
      {children}
    </button>
  );
}
