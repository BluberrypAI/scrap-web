import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { MagnetLink } from '../landing/LandingMotion.jsx';

export function WasteQRShortcut({ waste }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let active = true;
    async function prepare() {
      try {
        const src = await QRCode.toDataURL(`${location.origin}/#/track/${encodeURIComponent(waste.id)}`, {
          width: 176, margin: 2, errorCorrectionLevel: 'M',
        });
        if (active) setImage(src);
      } catch { /* The link still opens the full QR page. */ }
    }
    prepare();
    return () => { active = false; };
  }, [waste.id]);
  return <MagnetLink className="detail-qr-shortcut" href={`/wastes/${waste.id}/tracking`}
    aria-label={`${waste.name} QR 및 운송 현황 열기`} title="QR · 운송 현황"
    radius={100} maxX={6} maxY={6}>
    {image ? <img src={image} alt="" width="58" height="58" /> : <span aria-hidden="true">▦</span>}
  </MagnetLink>;
}
