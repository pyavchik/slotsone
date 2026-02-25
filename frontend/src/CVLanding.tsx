import './cvLanding.css';

const CV_PATH = '/QA_Oleksander_Pyavchik_CV.pdf';

export function CVLanding({ onOpenSlots }: { onOpenSlots: () => void }) {
  return (
    <main className="cv-page">
      <section className="cv-hero">
        <div>
          <p className="cv-kicker">QA Engineer Resume</p>
          <h1 className="cv-title">Oleksander Pyavchik</h1>
          <p className="cv-subtitle">Review the CV first, then launch the slots app.</p>
        </div>
        <div className="cv-actions">
          <a className="cv-link" href={CV_PATH} target="_blank" rel="noreferrer">
            Open PDF
          </a>
          <button type="button" className="cv-open-slots" onClick={onOpenSlots}>
            Open Slots App
          </button>
        </div>
      </section>

      <section className="cv-viewer-shell">
        <object data={CV_PATH} type="application/pdf" className="cv-viewer" aria-label="Oleksander Pyavchik CV PDF preview">
          <div className="cv-fallback">
            <p>PDF preview is not available in this browser.</p>
            <a href={CV_PATH} target="_blank" rel="noreferrer">
              Open CV PDF
            </a>
          </div>
        </object>
      </section>
    </main>
  );
}
