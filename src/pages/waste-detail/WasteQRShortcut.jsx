import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { fieldCheckUrl } from '../../waste-tracking.jsx';

export function WasteQRShortcut({ waste, legId }) {
  const [qr, setQr] = useState(null);
  useEffect(() => {
    if (!legId) return;
    let active = true;
    async function prepare() {
      try {
        const src = await QRCode.toDataURL(fieldCheckUrl(waste.id, legId), {
          width: 176, margin: 2, errorCorrectionLevel: 'M',
        });
        if (active) setQr({ legId, src });
      } catch { /* The link still opens the full QR page. */ }
    }
    prepare();
    return () => { active = false; };
  }, [waste.id, legId]);
  return <a className="detail-qr-shortcut" href={`/wastes/${waste.id}?tab=transport`}
    aria-label={`${waste.name} QR 및 운송 현황 열기`} title="QR · 운송 현황">
    {legId && qr?.legId === legId ? <img src={qr.src} alt="" width="58" height="58" /> : <span aria-hidden="true">▦</span>}
  </a>;
}
