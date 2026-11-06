'use client';

import { useState } from 'react';
import { fullDate } from '@/lib/format';
import { publishChecks, revLetter } from '@/lib/publish';
import { DiffView } from '../../ui/DiffView';
import { PageHeader, Section } from '../../ui/PageHeader';
import { ConfirmDialog, EmptyState, Readout } from '../../ui/feedback';
import { ErrorLinks } from '../../ui/PublishDialog';
import { useAdmin } from '../../ui/store';
import { screenBySlug } from '../../screens';

const screen = screenBySlug('yayin')!;
const when = (at: string) => `${fullDate(at.slice(0, 10), 'tr')} (sim.)`;

/** Simulated publish: pending changes, checks, the revision list with restore, and the demo reset. */
export function YayinScreen() {
  const { state, pending, issues, restore, reset } = useAdmin();
  const { blocking, acknowledge } = publishChecks(issues);
  const [shown, setShown] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  return (
    <>
      <PageHeader
        kicker="Pafta 09"
        title={screen.title}
        lede={screen.lede}
        aside={<p className="a-help">Gerçek site bu işlemden etkilenmez.</p>}
      />
      <Section
        id="bekleyen"
        title="Bekleyen değişiklikler"
        note="Son simüle edilen yayından (ya da ilk durumdan) bu yana değişen alanlar."
      >
        <dl className="a-readouts">
          <Readout
            label="Yayınlanan"
            value={state.published ? `Rev. ${revLetter(state.published.rev)} — ${when(state.published.at)}` : '—'}
          />
          <Readout derived label="Bekleyen" value={pending.length} unit="alan" />
        </dl>
        <DiffView changes={pending} label="Bekleyen değişiklikler" />
      </Section>
      <Section
        id="denetimler"
        title="Denetimler"
        note="Hatalar yayını engeller; uyarılar için yayın penceresinde onay istenir."
      >
        {blocking.length === 0 && acknowledge.length === 0 ? (
          <p className="a-help">Denetim sorunu yok.</p>
        ) : (
          <>
            {blocking.length > 0 && (
              <div className="a-field">
                <h3 className="a-help">Yayını engelleyen hatalar ({blocking.length})</h3>
                <ErrorLinks issues={blocking} label="Hatalar" />
              </div>
            )}
            {acknowledge.map((g) => (
              <div className="a-field" key={g.group}>
                <h3 className="a-help">
                  {g.group} ({g.items.length})
                </h3>
                <ul className="a-pub-group" aria-label={g.group}>
                  {g.items.map((i) => (
                    <li key={`${i.fieldId}:${i.text}`}>{i.text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </Section>
      <Section
        id="revizyonlar"
        title="Revizyonlar"
        note="Her simüle edilen yayın bir revizyon kaydeder (en çok 10). Geri dönmek yalnızca bu tarayıcı oturumundaki çalışma durumunu değiştirir."
      >
        {state.revisions.length === 0 ? (
          <EmptyState title="Henüz revizyon yok." mark={`Rev. ${revLetter(state.rev)}`}>
            <p>İlk yayın simüle edildiğinde revizyon burada listelenir.</p>
          </EmptyState>
        ) : (
          <ul className="a-list" aria-label="Revizyonlar">
            {state.revisions.map((r) => (
              <li key={r.rev} className="a-rev-row">
                <p className="a-rev-title">
                  Rev. {revLetter(r.rev)} — {when(r.at)}: {r.changes.length} alan değişti
                </p>
                <div className="a-rec-tools">
                  <button
                    type="button"
                    className="a-btn"
                    aria-expanded={shown === r.rev}
                    onClick={() => setShown(shown === r.rev ? null : r.rev)}
                  >
                    Farkı göster
                  </button>
                  <button type="button" className="a-btn" onClick={() => setTarget(r.rev)}>
                    Bu revizyona dön (simülasyon)
                  </button>
                </div>
                {shown === r.rev && <DiffView changes={r.changes} label={`Rev. ${revLetter(r.rev)} farkı`} />}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section id="demo" title="Demo" note="Bu oturumdaki tüm mock düzenlemeleri, revizyonları ve eylem kaydını siler.">
        <div className="a-field">
          <button type="button" className="a-btn" onClick={() => setResetting(true)}>
            Demoyu sıfırla
          </button>
        </div>
      </Section>

      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        title="Bu revizyona dön (simülasyon)"
        confirmLabel="Geri dön"
        onConfirm={() => {
          if (target !== null) restore(target);
          setShown(null);
        }}
      >
        <p>
          Çalışma durumu {target === null ? '' : `Rev. ${revLetter(target)}`} içeriğine döner. Kaydedilmemiş
          değişiklikler kaybolur.
        </p>
        <p className="a-help">Gerçek site bu işlemden etkilenmez.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        title="Demoyu sıfırla (simülasyon)"
        confirmLabel="Sıfırla"
        onConfirm={reset}
      >
        <p>Bu oturumdaki tüm mock düzenlemeler, revizyonlar ve eylem kaydı silinir.</p>
        <p className="a-help">Gerçek site bu işlemden etkilenmez.</p>
      </ConfirmDialog>
    </>
  );
}
