// 서버 응답을 화면용으로 맞춘다. ui-contract(ui-v1)의 새 필드가 아직 없는 서버에서도 화면이 깨지지 않도록
// 기존 필드(ui.question.options, verdict.candidates/conditions, ui.requested_documents)로 채운다.
// 채운 항목은 `_fallback` 배열에 이름을 남긴다(개발 확인용).
import { EVIDENCE_LABEL, NEXT_ACTION, STATUS_LABEL } from './labels.js';

/**
 * @typedef {{key: string, label: string, type: string, unit: string|null, parent: string|null, values: {value: string, label: string}[]}} CatalogFact
 * @typedef {{label: string, value: any, kind: 'value'|'unknown'|'none_all'|'expand'}} Option
 * @typedef {{key: string, unit: 'fact'|'group', facts: string[], options: Option[], text: string, help: string|null,
 *   input: 'choice'|'group'|'material_group'|'material'|'number'|'code', value_type: string|null, allow_unknown: boolean,
 *   allow_free_number: boolean, items: {key: string, label: string}[], answered_items: {key: string, label: string, value_label: string}[],
 *   measure_unit?: string|null, terms: {term: string, plain: string, example: string|null}[]}} Question
 * @typedef {{key: string, label: string, value: any, value_label: string, status: string, source_type: string, source_label: string,
 *   quote: string|null, recorded_at: string|null, editable: boolean, edit: any}} BoardFact
 * @typedef {{facts: BoardFact[], pending: {key: string, label: string, reason: string}[], progress: {questions_asked: number, max_questions: number}|null,
 *   candidates_count: number, top_candidates: {code: string|null, name: string|null, outcome: string|null}[],
 *   documents_needed: {evidence_type: string, label: string, facts: string[], fact_labels: string[]}[], _derived?: boolean}} Board
 */

/** @type {Record<string, CatalogFact>} */
let catalog = {};

/** @param {CatalogFact[]} list */
export function setCatalog(list) {
  catalog = Object.fromEntries((Array.isArray(list) ? list : []).map((f) => [f.key, f]));
}
export function getCatalog() {
  return catalog;
}
/** @param {string} key */
export function factLabel(key) {
  return catalog[key]?.label || null;
}

const isRange = (v) => v && typeof v === 'object' && ('lo' in v || 'hi' in v);

/** @param {any} q @param {string} message @returns {Question|null} */
export function normalizeQuestion(q, message = '') {
  if (!q) return null;
  const fb = [];
  const options = Array.isArray(q.options) ? q.options : [];
  const cat = catalog[q.key];
  let input = q.input;
  if (!input) {
    fb.push('input');
    if (q.unit === 'group') input = 'group';
    else if (q.key === 'annex4_code') input = 'code';
    else if (q.key === 'material_group' || Object.values(catalog).some((f) => f.parent === q.key)) input = 'material_group';
    else if (q.key === 'material' || cat?.parent) input = 'material';
    else if (cat?.type === 'number' || options.some((o) => isRange(o.value))) input = 'number';
    else input = 'choice';
  }
  let items = q.items;
  if (!Array.isArray(items)) {
    fb.push('items');
    items = q.unit === 'group' ? (q.facts || []).map((k) => ({ key: k, label: factLabel(k) })).filter((i) => i.label) : [];
  }
  if (q.text == null) fb.push('text');
  return {
    ...q,
    options,
    facts: q.facts || [q.key],
    text: q.text ?? message,
    help: q.help ?? null,
    input,
    value_type: q.value_type ?? cat?.type ?? null,
    allow_unknown: q.allow_unknown ?? options.some((o) => o.kind === 'unknown'),
    allow_free_number: q.allow_free_number ?? input === 'number',
    items,
    answered_items: Array.isArray(q.answered_items) ? q.answered_items : [],
    terms: Array.isArray(q.terms) ? q.terms : [],
    measure_unit: q.measure_unit ?? cat?.unit ?? null,
    _fallback: fb,
  };
}

/** @param {any} rd @param {any[]} boardDocs */
function normalizeDoc(rd, boardDocs = []) {
  const same = boardDocs.find((d) => d.evidence_type === rd.evidence_type);
  const facts = rd.facts || same?.facts || [];
  return {
    ...rd,
    facts,
    label: rd.label || same?.label || EVIDENCE_LABEL[rd.evidence_type] || rd.evidence_type,
    fact_labels: rd.fact_labels || same?.fact_labels || facts.map((k) => factLabel(k) || k),
  };
}

/** @param {any} turn @returns {Board} */
export function normalizeBoard(turn) {
  const b = turn?.ui?.board;
  const verdict = turn?.verdict || {};
  if (b) {
    const docs = (b.documents_needed || []).map((d) => normalizeDoc(d));
    return {
      facts: b.facts || [],
      pending: b.pending || [],
      progress: b.progress || null,
      candidates_count: b.candidates_count ?? (verdict.candidates || []).length,
      top_candidates: b.top_candidates || (verdict.candidates || []).slice(0, 5),
      documents_needed: docs,
    };
  }
  // 서버가 보드를 아직 주지 않으면: 결론 조건·후보·요청 서류로만 그린다
  const cands = verdict.candidates || [];
  return {
    facts: [],
    pending: (verdict.conditions || [])
      .filter((c) => c.satisfied === null || c.satisfied === undefined)
      .map((c) => ({ key: c.fact, label: c.text, reason: c.evidence ? 'NEEDS_EVIDENCE' : 'MISSING' })),
    progress: null,
    candidates_count: cands.length,
    top_candidates: cands.slice(0, 5),
    documents_needed: (turn?.ui?.requested_documents || []).map((d) => normalizeDoc(d)),
    _derived: true,
  };
}

/** @param {any} turn */
function deriveResult(turn) {
  const v = turn.verdict || {};
  const code = v.waste_code || null;
  return {
    result_type: code ? 'WASTE_CODE' : 'NO_CODE',
    code,
    name: v.waste_name || null,
    category: v.category || null,
    outcome: v.outcome || null,
    conclusion: code ? `분류번호 ${code} ${v.waste_name || ''}로 판정됩니다`.replace(' 로', '로') : firstSentence(turn.message),
    next_step: code ? '확정하면 경로 추천으로 넘어갑니다' : '확정하면 다음 단계에서 어떻게 처리하면 되는지 안내해 드립니다',
    review: v.review || 'UNVERIFIED',
  };
}
function firstSentence(s = '') {
  const m = String(s).match(/^(.+?[다요])\./);
  return m ? m[1] : String(s);
}

/** TurnResponse → 화면용(ui.question/board/result/conflicts를 항상 채움) */
export function normalizeTurn(turn) {
  if (!turn) return null;
  const ui = turn.ui || {};
  const fb = [];
  if (!ui.board) fb.push('ui.board');
  if (turn.branch === 'FINAL_REVIEW' && !ui.result) fb.push('ui.result');
  if (turn.branch === 'RESOLVE_CONFLICT' && !ui.conflicts) fb.push('ui.conflicts');
  const board = normalizeBoard(turn);
  const question = normalizeQuestion(ui.question, turn.message);
  if (question?._fallback?.length) fb.push(...question._fallback.map((f) => `ui.question.${f}`));
  return {
    ...turn,
    verdict: { candidates: [], conditions: [], rationale: [], ...(turn.verdict || {}) },
    ui: {
      can_confirm: !!ui.can_confirm,
      suggested_replies: ui.suggested_replies || [],
      requested_documents: (ui.requested_documents || []).map((d) => normalizeDoc(d, board.documents_needed)),
      question,
      board,
      conflicts: Array.isArray(ui.conflicts) ? ui.conflicts : [],
      result: ui.result || (turn.branch === 'FINAL_REVIEW' ? deriveResult(turn) : null),
    },
    _fallback: fb,
  };
}

/** CaseOut → summary가 없으면 채운다 */
export function normalizeCase(c) {
  if (!c) return c;
  if (c.summary) return { ...c, summary: { ...c.summary, status_label: c.summary.status_label || STATUS_LABEL[c.status] || c.status } };
  const memoLine = (c.memo || '').split('\n')[0].trim().slice(0, 30);
  return {
    ...c,
    summary: {
      title: memoLine || '새 폐기물',
      code: null,
      outcome: null,
      result_label: null,
      status_label: STATUS_LABEL[c.status] || c.status,
      next_action: NEXT_ACTION[c.status] || '',
    },
    _fallback: ['summary'],
  };
}

/** CaseDetail → conversation이 없으면 메모와 마지막 턴 메시지로 채운다 */
export function normalizeDetail(d) {
  const fb = [];
  const kase = normalizeCase(d.case);
  let conversation = d.conversation;
  if (!Array.isArray(conversation)) {
    fb.push('conversation');
    conversation = [];
    if (kase.memo) conversation.push({ turn_id: null, role: 'user', text: kase.memo, quick_reply: null, at: kase.created_at });
    if (d.latest_turn) conversation.push({ turn_id: d.latest_turn.turn_id, role: 'assistant', text: d.latest_turn.message, branch: d.latest_turn.branch, question_key: d.latest_turn.ui?.question?.key || null, at: null });
  }
  return {
    ...d,
    case: kase,
    conversation,
    latest_turn: normalizeTurn(d.latest_turn),
    verdicts: d.verdicts || [],
    documents: d.documents || [],
    handoff: d.handoff ?? d.current_verdict?.handoff ?? null,
    _fallback: fb,
  };
}
