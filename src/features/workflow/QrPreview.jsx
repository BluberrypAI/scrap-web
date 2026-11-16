import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function QrPreview({ image, url, label, description, openLink = false }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeButton = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeButton.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); trigger.current?.focus(); };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return <>
    <button ref={trigger} type="button" className="wf-qr-preview" onClick={() => { setCopied(false); setOpen(true); }} aria-label={`${label} 크게 보기`}>
      <img src={image} alt="" width="156" height="156" />
      <span>{label} · 크게 보기</span>
    </button>
    {open && createPortal(<div className="wf-qr-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="wf-qr-dialog" role="dialog" aria-modal="true" aria-label={label}>
        <div className="wf-qr-dialog-head"><div><span>QR 상세 보기</span><h2>{label}</h2></div><button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="닫기">×</button></div>
        <img src={image} alt={label} width="280" height="280" />
        <p>{description}</p>
        <div className="wf-qr-dialog-actions">
          <button type="button" onClick={copy}>{copied ? '링크 복사됨' : '링크 복사'}</button>
          {openLink && <a href={url} target="_blank" rel="noopener noreferrer">새 탭에서 열기</a>}
        </div>
      </section>
    </div>, document.body)}
  </>;
}
