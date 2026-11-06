import Link from 'next/link';
import { assertDevOnly } from '../guard';

// Mock entry only. No form, no inputs, no credentials, no session.
export default function Giris() {
  assertDevOnly();
  return (
    <main className="a-entry" id="a-main">
      <div className="a-sheet">
        <div className="a-sheet-tb">
          <div>
            <span className="a-tb-k">Çizen</span>
            <span className="a-tb-v a-serif">Admin · prototip</span>
          </div>
          <div>
            <span className="a-tb-k">Pafta</span>
            <span className="a-tb-v a-serif">Prototip girişi</span>
          </div>
          <div>
            <span className="a-tb-k">Rev.</span>
            <span className="a-tb-v a-num">A</span>
          </div>
        </div>
        <div className="a-sheet-body">
          <p className="a-ph-k">ANTET</p>
          <h1 className="a-entry-t">Prototip girişi</h1>
          <p className="a-entry-l">Bu bir prototiptir. Kimlik doğrulama yoktur.</p>
          <p className="a-prose">
            Genel sitenin çizim bürosuna geçiyorsunuz: aynı paftayı, çizenin tarafından görürsünüz. Düzenlemeler
            sunucuya gitmez; yalnızca bu tarayıcı oturumunda saklanır ve geliştirme ortamı dışında bu alan hiç açılmaz.
          </p>
          <Link href="/admin" className="a-btn a-btn-primary a-entry-btn">
            Prototipe gir
          </Link>
          <p className="a-help">Gerçek oturum açma, ayrı ve sonraki bir aşamanın konusudur.</p>
        </div>
      </div>
    </main>
  );
}
