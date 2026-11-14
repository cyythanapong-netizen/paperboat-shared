// The Squero Studio About dialog: the W3 Water mark, rippling, beside what this build is.
// Each app passes its own facts (versions, runtime, connection) and credits.
import type { ReactNode } from "react";
import { Modal } from "../Modal.tsx";
import { SqueroLogo } from "./SqueroLogo.tsx";

const CREATOR = { name: "Thanapong Chuangyanyong", href: "https://github.com/thanapong-chuangyanyong" };

export type AboutFact = { label: string; value: ReactNode };

export function AboutSquero({ product, runtime, facts, credits, onClose }: {
  /** The badge code: "OM", "MX". */
  product: string;
  /** The runtime under the mark: "OpenModelica", "Julia". */
  runtime: string;
  /** Label/value rows, licence included. */
  facts: readonly AboutFact[];
  /** The app's "Built on …" paragraph; the creator line follows it. */
  credits: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal title="About Squero Studio" label={`About Squero Studio ${product}`} className="about-dialog" onClose={onClose}>
        <div className="about-body">
          <div className="about-mark">
            <SqueroLogo product={product} height={34} running />
            <span className="lbl">{runtime}</span>
          </div>
          <div className="about-info">
            <dl className="about-facts">
              {facts.map((fact) => [
                <dt key={`${fact.label}:t`}>{fact.label}</dt>,
                <dd key={`${fact.label}:d`} className="mono">{fact.value}</dd>,
              ])}
            </dl>
            <section className="about-section">
              <h3>Credits</h3>
              <p>{credits}</p>
              <p>
                Created by{" "}
                <a href={CREATOR.href} target="_blank" rel="noreferrer">{CREATOR.name}</a>.
              </p>
              <p className="lbl">A PaperboatLab project.</p>
            </section>
          </div>
        </div>
        <footer className="modal-actions">
          <button type="button" className="key small" onClick={onClose}>Close</button>
        </footer>
    </Modal>
  );
}
