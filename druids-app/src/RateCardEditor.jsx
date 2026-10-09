import React, { useEffect, useMemo, useState } from 'react';

// Admin area → Rate card. Every price the app charges, in one place an admin
// can change: lessons and coaching (with the own-pony price where a line has
// one), non-member chukka fees, pony hire per chukka with the military
// discount, and tournament entry. Saving writes the shared `rate-card`
// document (see mergeRateCard in PoloChukkas.jsx); new bookings use it at
// once.
//
// Props: rates (the card in force), defaults (the printed card), doc (the
// saved changes, for who changed it and when), ponyLabels, entryLabels,
// onSave(doc | null) — null goes back to the printed card. The clubs' cards
// differ in shape, so the shape is described rather than assumed:
//   tiers          the two prices on each lesson line: [[key, label], …]
//                  (TPPC and Vaux civilian/military; Druids standard/student)
//   chukkaFeeLabels  one box per key of rates.chukkaFee
//   discountKey / discountLabel   the per-chukka pony-hire discount
//   ownPony        false for a club that sells no own-pony lesson price

const S = {
  card: { border: '1px solid var(--line)', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px', background: 'var(--cream-pale)' },
  h: { fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', margin: '22px 0 8px' },
  label: { display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' },
  hint: { fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 },
  num: { width: '100%', padding: '9px 10px', fontSize: '15px' },
  btn: { background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink)', padding: '11px 14px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' },
};

const str = (v) => (v == null ? '' : String(v));
const TIERS = [['civ', 'Civilian'], ['mil', 'Military']];
const CHUKKA_FEE_LABELS = { civ: 'Civilian, per chukka', mil: 'Military / veteran, per chukka' };
const toDraft = (r, tiers, discountKey) => ({
  lessons: r.lessons.map(l => {
    const row = { id: l.id, label: l.label };
    tiers.forEach(([t]) => { row[t] = str(l[t]); row[`own_${t}`] = l.own ? str(l.own[t]) : ''; });
    return row;
  }),
  chukkaFee: Object.fromEntries(Object.entries(r.chukkaFee).map(([k, v]) => [k, str(v)])),
  ponyHire: Object.fromEntries(Object.entries(r.ponyHire).map(([k, v]) => [k, str(v)])),
  discount: str(r[discountKey]),
  entry: Object.fromEntries(Object.entries(r.entry).map(([c, opts]) => [c, opts.map(o => ({ id: o.id, label: o.label, fee: str(o.fee) }))])),
});
const ok = (v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;
const n = (v) => Math.round(Number(v) * 100) / 100;

function Money({ id, label, value, onChange, optional }) {
  const bad = value !== '' ? !ok(value) : !optional;
  return (
    <label htmlFor={id} style={{ display: 'block', minWidth: 0 }}>
      <span style={S.label}>{label}</span>
      <div style={{ position: 'relative' }}>
        <span aria-hidden="true" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>£</span>
        <input id={id} className="input-field" type="number" inputMode="decimal" min="0" step="0.01" value={value}
          placeholder={optional ? '—' : ''} onChange={e => onChange(e.target.value)} aria-invalid={bad}
          style={{ ...S.num, paddingLeft: 22, borderColor: bad ? 'var(--danger)' : undefined }} />
      </div>
    </label>
  );
}

export default function RateCardEditor({
  rates, defaults, doc, ponyLabels = {}, entryLabels = {}, onSave,
  tiers = TIERS, chukkaFeeLabels = CHUKKA_FEE_LABELS,
  discountKey = 'milPonyDiscount', discountLabel = 'Military discount, per chukka',
  ownPony = true,
}) {
  const start = useMemo(() => toDraft(rates, tiers, discountKey), [rates]); // eslint-disable-line react-hooks/exhaustive-deps
  const [d, setD] = useState(start);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: '', text: '' });
  useEffect(() => { setD(start); }, [start]);

  const changed = JSON.stringify(d) !== JSON.stringify(start);
  const problems = [];
  d.lessons.forEach(l => {
    if (!l.label.trim()) problems.push('Every lesson line needs a name.');
    if (tiers.some(([t]) => !ok(l[t]))) problems.push(`${l.label || 'A lesson'}: ${tiers.map(([, lab]) => lab.toLowerCase()).join(' and ')} prices are needed.`);
    const own = tiers.map(([t]) => l[`own_${t}`]);
    if (own.some(v => v !== '') && !own.every(ok)) problems.push(`${l.label}: give every own-pony price, or leave them all blank.`);
  });
  if (Object.values(d.chukkaFee).some(v => !ok(v))) problems.push('Chukka fees need a price.');
  Object.entries(d.ponyHire).forEach(([k, v]) => { if (!ok(v)) problems.push(`Pony hire (${ponyLabels[k] || k}) needs a price.`); });
  if (!ok(d.discount)) problems.push(`The ${discountLabel.replace(/,.*$/, '').toLowerCase()} needs a figure (0 for none).`);
  Object.entries(d.entry).forEach(([c, opts]) => opts.forEach(o => { if (!o.label.trim() || !ok(o.fee)) problems.push(`${entryLabels[c] || c} entry: each line needs a name and a fee.`); }));
  const uniqueProblems = [...new Set(problems)];

  const setLesson = (i, k, v) => setD(x => ({ ...x, lessons: x.lessons.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const setEntry = (c, i, k, v) => setD(x => ({ ...x, entry: { ...x.entry, [c]: x.entry[c].map((o, j) => (j === i ? { ...o, [k]: v } : o)) } }));

  const save = async () => {
    if (!changed || uniqueProblems.length) return;
    setBusy(true); setMsg({ kind: '', text: '' });
    const printedOwn = new Set(defaults.lessons.filter(l => l.own).map(l => l.id));
    const out = {
      lessons: d.lessons.map(l => {
        const row = { id: l.id, label: l.label.trim() };
        tiers.forEach(([t]) => { row[t] = n(l[t]); });
        if (ownPony && tiers.every(([t]) => l[`own_${t}`] !== '')) row.own = Object.fromEntries(tiers.map(([t]) => [t, n(l[`own_${t}`])]));
        else if (printedOwn.has(l.id)) row.own = null; // the printed card has one; the admin took it away
        return row;
      }),
      chukkaFee: Object.fromEntries(Object.entries(d.chukkaFee).map(([k, v]) => [k, n(v)])),
      ponyHire: Object.fromEntries(Object.entries(d.ponyHire).map(([k, v]) => [k, n(v)])),
      [discountKey]: n(d.discount),
      entry: Object.fromEntries(Object.entries(d.entry).map(([c, opts]) => [c, opts.map(o => ({ id: o.id, label: o.label.trim(), fee: n(o.fee) }))])),
    };
    try { await onSave(out); setMsg({ kind: 'ok', text: 'Saved. New bookings use these prices from now on.' }); }
    catch (e) { setMsg({ kind: 'err', text: 'That didn’t save — check your connection and try again.' }); }
    setBusy(false);
  };
  const backToPrinted = async () => {
    if (!window.confirm('Go back to the printed rate card? Every change made here is removed.')) return;
    setBusy(true);
    try { await onSave(null); setMsg({ kind: 'ok', text: 'Back to the printed rate card.' }); }
    catch (e) { setMsg({ kind: 'err', text: 'That didn’t save — check your connection and try again.' }); }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '90px' }}>
      <h2 className="display" style={{ margin: '0 0 4px', fontSize: '26px' }}>Rate card</h2>
      <div style={S.hint}>
        The prices members see when they book. Changes apply to new bookings at once.
        {doc && doc.updatedAt ? <> Last changed {new Date(doc.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}{doc.updatedBy ? ` by ${doc.updatedBy}` : ''}.</> : ' Showing the printed card.'}
      </div>

      <div style={S.h}>Lessons and coaching</div>
      <div style={{ ...S.hint, marginBottom: '8px' }}>{ownPony ? 'The first two prices include a club pony. The own-pony prices are used when the rider brings their own; leave them blank where there is no separate price.' : `${tiers.map(([, lab]) => lab).join(' and ')} prices for each lesson.`}</div>
      {d.lessons.map((l, i) => (
        <div key={l.id} style={S.card}>
          <label style={S.label} htmlFor={`rc-${l.id}-label`}>Name</label>
          <input id={`rc-${l.id}-label`} className="input-field" type="text" value={l.label} onChange={e => setLesson(i, 'label', e.target.value)} style={{ width: '100%', padding: '9px 10px', fontSize: '14px', marginBottom: '10px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px' }}>
            {tiers.map(([t, lab]) => <Money key={t} id={`rc-${l.id}-${t}`} label={lab} value={l[t]} onChange={v => setLesson(i, t, v)} />)}
            {ownPony && tiers.map(([t, lab]) => <Money key={`own-${t}`} id={`rc-${l.id}-own${t}`} label={`Own pony · ${lab.toLowerCase()}`} value={l[`own_${t}`]} optional onChange={v => setLesson(i, `own_${t}`, v)} />)}
          </div>
        </div>
      ))}

      <div style={S.h}>Chukka fees · non-members</div>
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px' }}>
          {Object.keys(d.chukkaFee).map(k => (
            <Money key={k} id={`rc-cf-${k}`} label={chukkaFeeLabels[k] || k} value={d.chukkaFee[k]} onChange={v => setD(x => ({ ...x, chukkaFee: { ...x.chukkaFee, [k]: v } }))} />
          ))}
        </div>
        <div style={{ ...S.hint, marginTop: '8px' }}>Memberships that include chukka fees pay nothing here.</div>
      </div>

      <div style={S.h}>Pony hire · per chukka</div>
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px' }}>
          {Object.keys(d.ponyHire).map(k => (
            <Money key={k} id={`rc-ph-${k}`} label={ponyLabels[k] || k} value={d.ponyHire[k]} onChange={v => setD(x => ({ ...x, ponyHire: { ...x.ponyHire, [k]: v } }))} />
          ))}
          <Money id="rc-ph-discount" label={discountLabel} value={d.discount} onChange={v => setD(x => ({ ...x, discount: v }))} />
        </div>
      </div>

      <div style={S.h}>Tournament entry · per team</div>
      {Object.entries(d.entry).map(([c, opts]) => (
        <div key={c} style={S.card}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>{entryLabels[c] || c}</div>
          {opts.map((o, i) => (
            <div key={o.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
              <label style={{ display: 'block', minWidth: 0 }}>
                <span style={S.label}>Entry</span>
                <input className="input-field" type="text" value={o.label} onChange={e => setEntry(c, i, 'label', e.target.value)} style={{ width: '100%', padding: '9px 10px', fontSize: '14px' }} />
              </label>
              <Money id={`rc-en-${o.id}`} label="Fee" value={o.fee} onChange={v => setEntry(c, i, 'fee', v)} />
            </div>
          ))}
        </div>
      ))}

      {uniqueProblems.length > 0 && changed && (
        <div role="alert" style={{ ...S.card, borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '13px' }}>
          {uniqueProblems.slice(0, 4).map(p => <div key={p}>{p}</div>)}
        </div>
      )}
      {msg.text && (
        <div role="status" style={{ fontSize: '13px', margin: '8px 0', color: msg.kind === 'err' ? 'var(--danger)' : 'var(--burgundy)' }}>{msg.text}</div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
        <button type="button" className="btn-primary" disabled={!changed || uniqueProblems.length > 0 || busy} onClick={save}
          style={{ flex: '1 1 180px', opacity: !changed || uniqueProblems.length > 0 || busy ? 0.55 : 1 }}>
          {busy ? 'Saving…' : changed ? 'Save the rate card' : 'No changes yet'}
        </button>
        {changed && <button type="button" style={S.btn} disabled={busy} onClick={() => { setD(start); setMsg({ kind: '', text: '' }); }}>Undo changes</button>}
        {doc && <button type="button" style={S.btn} disabled={busy} onClick={backToPrinted}>Back to the printed card</button>}
      </div>
    </div>
  );
}
