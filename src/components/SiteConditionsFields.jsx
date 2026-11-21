import { SITE_CONDITIONS, YES_NO_OPTIONS } from '../lib/siteConditions.js';

/** 사업장 판정 고정값 입력란. 모르면 비워 두면 문진에서 물어본다 */
export function SiteConditionsFields({ draft, onChange, fieldClassName, disabled }) {
  const set = (key, value) => onChange({ ...draft, [key]: value });
  return SITE_CONDITIONS.map((c) => (
    <label className={fieldClassName} key={c.key}>
      <span>{c.label}</span>
      {c.type === 'number' ? (
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={draft[c.key]}
          onChange={(event) => set(c.key, event.target.value)}
          placeholder="모르면 비워 두세요"
          disabled={disabled}
        />
      ) : (
        <select value={draft[c.key]} onChange={(event) => set(c.key, event.target.value)} disabled={disabled}>
          {YES_NO_OPTIONS.map((o) => <option value={o.value} key={o.value}>{o.label}</option>)}
        </select>
      )}
      {c.help && <small>{c.help}</small>}
    </label>
  ));
}
