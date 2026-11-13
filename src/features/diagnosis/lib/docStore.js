/**
 * 올린 서류 원문을 이 브라우저 안(IndexedDB)에 보관한다. 검수 창 왼쪽에 원문을 띄울 때 쓴다.
 *
 * - 엔진은 원문 파일을 보관하지 않는다(읽은 글자·값만 저장). 원문은 사용자 PC 밖으로 나가지 않는다.
 * - 같은 브라우저에서는 새로고침하거나 창을 다시 열어도 남는다. 다른 기기·브라우저에서는 없다
 *   → 검수 창은 원문 대신 엔진이 원문에서 읽은 행 글자를 보여 준다.
 * - 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 조용히 아무것도 하지 않는다.
 * - 실제 서비스에서 서버가 원문 주소를 주면 그 주소를 먼저 쓴다(ReviewDialog의 fileUrl).
 */

const DB_NAME = 'wd-documents';
const STORE = 'files';

const key = (docId, version) => `${docId}@v${version ?? 1}`;

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB 없음'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** 원문 파일 보관. 실패해도 업로드 흐름은 그대로 간다 */
export async function saveDocumentFile(docId, version, file) {
  if (!docId || !file) return;
  try {
    await run('readwrite', (s) => s.put({ blob: file, name: file.name || 'document', type: file.type || '' }, key(docId, version)));
  } catch {
    /* 보관 못 함: 검수 창은 읽은 글자로 대신 보여 준다 */
  }
}

/** 보관한 원문 {blob, name, type} 또는 null */
export async function loadDocumentFile(docId, version) {
  try {
    return (await run('readonly', (s) => s.get(key(docId, version)))) || null;
  } catch {
    return null;
  }
}
