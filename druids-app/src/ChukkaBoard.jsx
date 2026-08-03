import React, { useState, useMemo, useRef } from 'react';

// ── Desktop chukka board ────────────────────────────────────────────────────
// A three-pane workspace for running a club chukka day on a laptop: the day's
// roster on the left, the draw in the middle, the day's settings on the right.
//
// Like FixtureBoard, this is a second *view*, not a second implementation.
// Every mutation goes through functions handed in from the club app — the same
// ones the phone uses — so the two views cannot drift apart. Mobile renders
// exactly what it always did; this only mounts above the desktop breakpoint.
//
// The centre offers two readings of one draw:
//
//   Chukka cards  what the phone shows, but with both sides visible at once
//                 and a live handicap balance per chukka.
//   Player grid   the players × chukkas table that tournamentPdf.js already
//                 prints and the app has never shown on screen. Reading across
//                 a row exposes back-to-back chukkas; reading down a column
//                 exposes lopsided sides. Click a cell to move someone.
//
// teamA is Blue and teamB is White throughout, matching buildSchedule().

const fmtH = (h) => (h === null || h === undefined || h === '' ? '—' : (Number(h) > 0 ? `+${h}` : String(h).replace('-', '−')));
// <input type="time"> only accepts a zero-padded HH:MM. The app stores times
// through fmtTime(), which writes '9:30' rather than '09:30', so pad on the way
// in and the field would otherwise silently render blank.
const hhmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const padTime = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
};
const sideOf = (ck, id) => (
  ck.teamA.some(p => p.id === id) ? 'A'
    : ck.teamB.some(p => p.id === id) ? 'B'
      : null
);

export default function ChukkaBoard({
  // Which day
  clubName, dayKeys, dayConfig, dayKey, setDayKey, rosterCounts,
  // The day's data
  players, schedule, throwInMin, ground, groundOptions, chukkaTime, totalChukkas,
  // Draw state
  published, setPublished, bookingClosed, manualClosed, toggleManualClosed,
  // Settings
  onThrowIn, onGround,
  // Roster edits
  adjustChukkas, removePlayer, toggleVip, toggleNoConsecutive, togglePonyHire,
  movePlayer, sortByChukkas, updateAvail,
  // Draw edits
  setCell, onGenerate, onClearDraw,
  // Exports and snapshots
  onWhatsApp, onXLSX, onPNG, rosterBackups = [], loadBackups, restoreBackup,
  // The sign-up form, wired straight to the phone's handleAdd
  signUp, handicapOptions,
  error, onClose,
}) {
  const [view, setView] = useState('cards'); // 'cards' | 'grid'
  const [expanded, setExpanded] = useState(null); // roster row open for detail
  const [showBackups, setShowBackups] = useState(false);
  const [dropTarget, setDropTarget] = useState(null); // `${chukkaIdx}:${side}`
  const dragged = useRef(null);

  const cfg = dayConfig[dayKey];
  const chukkas = (schedule && schedule.chukkas) || [];

  // ── What the captain actually squints at a draw to check ────────────────
  // Worst handicap gap between the two sides in any one chukka, and the number
  // of times someone who asked not to play back-to-back was given back-to-back
  // anyway. Both recompute from the draw, so hand edits show up immediately.
  const stats = useMemo(() => {
    let worst = 0;
    chukkas.forEach(ck => { worst = Math.max(worst, Math.abs(ck.sumA - ck.sumB)); });
    let clashes = 0;
    const clashIds = new Set();
    players.forEach(p => {
      if (!p.noConsecutive) return;
      for (let c = 1; c < chukkas.length; c++) {
        if (sideOf(chukkas[c], p.id) && sideOf(chukkas[c - 1], p.id)) { clashes++; clashIds.add(p.id); }
      }
    });
    const slots = chukkas.reduce((s, ck) => s + ck.playerCount, 0);
    return { worst, clashes, clashIds, slots };
  }, [chukkas, players]);

  // Riders in the order the schedule sees them (roster order = draw priority),
  // which is also the order the grid rows read in.
  const drawn = useMemo(() => {
    const counts = new Map();
    players.forEach(p => counts.set(p.id, chukkas.reduce((n, ck) => n + (sideOf(ck, p.id) ? 1 : 0), 0)));
    return counts;
  }, [players, chukkas]);

  const S = styles;

  const dropOn = (chukkaIdx, side) => (e) => {
    e.preventDefault();
    setDropTarget(null);
    const id = dragged.current;
    dragged.current = null;
    if (id === null || id === undefined) return;
    setCell(chukkaIdx, id, side);
  };

  return (
    <div style={S.wrap}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={S.bar}>
        <div style={S.barName}>{clubName}</div>
        <span style={S.sep} />
        <div style={S.dayPick} role="group" aria-label="Chukka day">
          {dayKeys.map(k => (
            <button key={k} onClick={() => setDayKey(k)} aria-pressed={k === dayKey}
              style={{ ...S.dayBtn, ...(k === dayKey ? S.dayBtnOn : null) }}>
              <span>{dayConfig[k].short || dayConfig[k].fullLabel}</span>
              <small style={S.dayBtnSub}>{rosterCounts[k] || 0} signed up</small>
            </button>
          ))}
        </div>
        <span style={bookingClosed ? S.chipShut : S.chipOpen}>
          {bookingClosed ? 'Sign-ups closed' : 'Sign-ups open'}
        </span>
        <div style={{ flex: 1 }} />
        {schedule
          ? <button onClick={onGenerate} style={S.btnGhost}>Redraw teams</button>
          : <button onClick={onGenerate} style={S.btnGold} disabled={players.length < 4}>Draw the teams</button>}
        {schedule && (
          <button onClick={() => setPublished(!published)} style={published ? S.btnGhost : S.btnGold}>
            {published ? 'Unpublish draw' : 'Publish draw'}
          </button>
        )}
        <button onClick={onClose} style={S.btnGhost} aria-label="Close the board">Done</button>
      </div>

      <div style={S.shell}>
        {/* ── Left: the roster ───────────────────────────────────────────── */}
        <aside style={S.rail}>
          <div style={S.railHead}>
            <span style={S.eyebrow}>Roster · {cfg.fullLabel}</span>
            <span style={S.eyebrow}>{players.length}</span>
          </div>

          <details style={S.signup}>
            <summary style={S.signupHead}>＋ Add a player</summary>
            <div style={S.signupBody}>
              <input list="playerdb-names" value={signUp.name} onChange={e => signUp.setName(e.target.value)}
                placeholder="Name" style={S.inpFull} />
              {signUp.suggestions.length > 0 && (
                <div style={S.sugg}>
                  {signUp.suggestions.map(s => (
                    <button key={s.name} onClick={() => signUp.fillFromMember(s)} style={S.suggChip}>
                      {s.name}{s.handicap != null ? ` ${fmtH(s.handicap)}` : ''}
                    </button>
                  ))}
                </div>
              )}
              <div style={S.two}>
                <select value={signUp.handicap} onChange={e => signUp.setHandicap(e.target.value)} style={S.inpFull}>
                  <option value="">Handicap…</option>
                  {handicapOptions.map(h => <option key={h} value={String(h)}>{fmtH(h)}</option>)}
                </select>
                <input type="number" min="1" max={String(signUp.maxChukkas)}
                  value={signUp.fixedChukkas ? String(signUp.fixedChukkas) : signUp.chukkas}
                  onChange={e => signUp.setChukkas(e.target.value)}
                  disabled={!!signUp.fixedChukkas} placeholder="Chukkas" style={S.inpFull} />
              </div>
              <input value={signUp.mobile} onChange={e => signUp.setMobile(e.target.value)}
                placeholder="Mobile (optional)" style={S.inpFull} />
              <div style={S.flagRow}>
                {!cfg.instructional && (
                  <label style={S.check}>
                    <input type="checkbox" checked={signUp.noConsecutive}
                      onChange={e => signUp.setNoConsecutive(e.target.checked)} style={S.cbox} />
                    No back-to-back
                  </label>
                )}
                <label style={S.check}>
                  <input type="checkbox" checked={signUp.ponyHire}
                    onChange={e => signUp.setPonyHire(e.target.checked)} style={S.cbox} />
                  Hiring a pony
                </label>
                <label style={S.check}>
                  <input type="checkbox" checked={signUp.vip}
                    onChange={e => signUp.setVip(e.target.checked)} style={S.cbox} />
                  Priority
                </label>
              </div>
              <button onClick={signUp.submit} style={{ ...S.btnGold, width: '100%', marginTop: 6 }}>Add to roster</button>
              {error ? <div style={S.err}>{error}</div> : null}
            </div>
          </details>

          {players.length > 1 && (
            <div style={S.railTools}>
              <button onClick={sortByChukkas} style={S.linkBtn}>Sort by chukkas wanted</button>
              <span style={S.hintInline}>Order sets draw priority</span>
            </div>
          )}

          <div style={S.plist}>
            {players.length === 0 && (
              <p style={S.hint}>Nobody has signed up for this {cfg.fullLabel} yet.</p>
            )}
            {players.map((p, i) => {
              const open = expanded === p.id;
              const got = drawn.get(p.id) || 0;
              const short = schedule && got < p.chukkas;
              return (
                <div key={p.id} style={S.pWrap}>
                  <div draggable={!!schedule}
                    onDragStart={(e) => { dragged.current = p.id; e.dataTransfer.effectAllowed = 'move'; }}
                    style={S.pRow}
                    title={schedule ? 'Drag onto a side, or click for detail' : 'Click for detail'}>
                    <span style={S.hcap}>{fmtH(p.handicap)}</span>
                    <button onClick={() => setExpanded(open ? null : p.id)} style={S.pName}>{p.name}</button>
                    <span style={S.flags}>
                      {p.vip ? <span style={S.flagVip} title="Priority — never trimmed by capacity">P</span> : null}
                      {p.noConsecutive ? <span style={{ ...S.flag, ...(stats.clashIds.has(p.id) ? S.flagBad : null) }} title="Asked not to play back-to-back">NC</span> : null}
                      {p.ponyHire ? <span style={S.flagPony} title="Hiring a pony">🐴</span> : null}
                    </span>
                    {schedule ? (
                      <span style={short ? S.gotShort : S.got} title={`Playing ${got} of ${p.chukkas} requested`}>{got}/{p.chukkas}</span>
                    ) : (
                      <span style={S.stepper}>
                        <button onClick={() => adjustChukkas(p.id, -1)} style={S.stepBtn} aria-label={`One fewer chukka for ${p.name}`}>−</button>
                        <span style={S.ck}>{p.chukkas}</span>
                        <button onClick={() => adjustChukkas(p.id, 1)} style={S.stepBtn} aria-label={`One more chukka for ${p.name}`}>+</button>
                      </span>
                    )}
                  </div>

                  {open && (
                    <div style={S.pDetail}>
                      {schedule && (
                        <div style={S.detailRow}>
                          <span style={S.fieldLabel}>Chukkas wanted</span>
                          <span style={S.stepper}>
                            <button onClick={() => adjustChukkas(p.id, -1)} style={S.stepBtn}>−</button>
                            <span style={S.ck}>{p.chukkas}</span>
                            <button onClick={() => adjustChukkas(p.id, 1)} style={S.stepBtn}>+</button>
                          </span>
                        </div>
                      )}
                      <div style={S.detailRow}>
                        <span style={S.fieldLabel}>Available</span>
                        <input type="time" value={padTime(p.availableFrom)} onChange={e => updateAvail(p.id, 'availableFrom', e.target.value)} style={S.inpSm} />
                        <span style={S.hintInline}>to</span>
                        <input type="time" value={padTime(p.availableTo)} onChange={e => updateAvail(p.id, 'availableTo', e.target.value)} style={S.inpSm} />
                      </div>
                      <div style={S.flagRow}>
                        <label style={S.check}><input type="checkbox" checked={!!p.vip} onChange={() => toggleVip(p.id)} style={S.cbox} />Priority</label>
                        {!cfg.instructional && (
                          <label style={S.check}><input type="checkbox" checked={!!p.noConsecutive} onChange={() => toggleNoConsecutive(p.id)} style={S.cbox} />No back-to-back</label>
                        )}
                        <label style={S.check}><input type="checkbox" checked={!!p.ponyHire} onChange={() => togglePonyHire(p.id)} style={S.cbox} />Pony hire</label>
                      </div>
                      <div style={S.detailRow}>
                        <button onClick={() => movePlayer(p.id, -1)} disabled={i === 0} style={S.linkBtn}>↑ Earlier</button>
                        <button onClick={() => movePlayer(p.id, 1)} disabled={i === players.length - 1} style={S.linkBtn}>↓ Later</button>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => removePlayer(p.id)} style={S.linkDanger}>Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Centre: the draw ───────────────────────────────────────────── */}
        <main style={S.canvas}>
          <div style={S.top}>
            <div>
              <h2 style={S.ttl}>{cfg.fullLabel} Chukkas</h2>
              <div style={S.sub}>
                Throw-in {chukkaTime(0, throwInMin)}
                {ground ? ` · ${ground}` : ''}
                {schedule ? ` · ${schedule.numChukkas} chukkas from ${players.length} riders` : ` · ${players.length} riders, ${totalChukkas} chukkas booked`}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            {schedule && (
              <div style={S.seg} role="group" aria-label="View">
                <button onClick={() => setView('cards')} aria-pressed={view === 'cards'}
                  style={{ ...S.segBtn, ...(view === 'cards' ? S.segOn : null) }}>Chukka cards</button>
                <button onClick={() => setView('grid')} aria-pressed={view === 'grid'}
                  style={{ ...S.segBtn, ...(view === 'grid' ? S.segOn : null) }}>Player grid</button>
              </div>
            )}
          </div>

          {!schedule ? (
            <div style={S.empty}>
              <p style={S.hint}>
                {players.length < 4
                  ? `${players.length} of the 4 riders a chukka needs. Add players on the left.`
                  : 'Everyone is signed up. Draw the teams to build the day.'}
              </p>
              {players.length >= 4 && <button onClick={onGenerate} style={S.btnGold}>Draw the teams</button>}
            </div>
          ) : (
            <>
              <div style={S.stats}>
                <Stat n={players.length} label="Riders" />
                <Stat n={schedule.numChukkas} label="Chukkas" />
                <Stat n={stats.slots} label="Rider-chukkas" />
                <Stat n={`±${stats.worst}`} label="Worst imbalance" good={stats.worst === 0} />
                <Stat n={stats.clashes} label="Back-to-back clashes" bad={stats.clashes > 0} />
              </div>

              {schedule.reduced && schedule.reduced.length > 0 && (
                <div style={S.warn}>
                  <b>Reduced.</b> {schedule.reduced.map(r => `${r.player.name} wanted ${r.requested}, playing ${r.given}`).join(' · ')}
                  <div style={S.warnSub}>Later sign-ups give way to riders who booked earlier.</div>
                </div>
              )}
              {schedule.capped && schedule.capped.length > 0 && (
                <div style={S.warn}>
                  <b>Capped at {schedule.numChukkas}.</b> {schedule.capped.map(u => `${u.player.name} wanted ${u.requested}`).join(' · ')}
                  <div style={S.warnSub}>They asked for more chukkas than the day has — they're playing all of them.</div>
                </div>
              )}

              {view === 'cards' ? (
                chukkas.map((ck, idx) => {
                  const diff = Math.abs(ck.sumA - ck.sumB);
                  return (
                    <div key={ck.idx} style={S.card}>
                      <div style={S.cardHead}>
                        <span style={S.ckNo}>Chukka {ck.number}</span>
                        <span style={S.ckTime}>{ck.time}</span>
                        {ck.playerCount < 4 && <span style={S.thin}>Only {ck.playerCount} riders</span>}
                        <div style={{ flex: 1 }} />
                        <span style={S.balLabel}>Balance</span>
                        <span style={S.balBar}>
                          <i style={{ ...S.balFill, ...(diff === 0
                            ? { left: '47%', width: '6%', background: '#2e6f4e' }
                            : { left: '50%', width: `${Math.min(50, Math.max(3, diff * 10))}%` }) }} />
                        </span>
                        <span style={{ ...S.balNum, ...(diff === 0 ? S.balEven : null) }}>{diff === 0 ? 'even' : `±${diff}`}</span>
                      </div>
                      <div style={S.sides}>
                        {['A', 'B'].map(side => (
                          <React.Fragment key={side}>
                            {side === 'B' && <div style={S.vs}><span style={S.vsV}>v</span></div>}
                            <div
                              onDragOver={(e) => { e.preventDefault(); setDropTarget(`${idx}:${side}`); }}
                              onDragLeave={() => setDropTarget(null)}
                              onDrop={dropOn(idx, side)}
                              style={{ ...S.sideBox, ...(side === 'A' ? S.sideA : S.sideB),
                                ...(dropTarget === `${idx}:${side}` ? S.sideOver : null) }}>
                              <div style={S.sideHead}>
                                <span>{side === 'A' ? 'Blue' : 'White'}</span>
                                <div style={{ flex: 1 }} />
                                <span style={S.sideSum}>{fmtH(side === 'A' ? ck.sumA : ck.sumB)} · {(side === 'A' ? ck.teamA : ck.teamB).length}</span>
                              </div>
                              <ul style={S.sideList}>
                                {(side === 'A' ? ck.teamA : ck.teamB).map(p => (
                                  <li key={p.id} draggable
                                    onDragStart={(e) => { dragged.current = p.id; e.dataTransfer.effectAllowed = 'move'; }}
                                    style={S.sideLi}>
                                    <span style={S.liH}>{fmtH(p.handicap)}</span>
                                    <span style={S.liName}>{p.name}</span>
                                    <button onClick={() => setCell(idx, p.id, side === 'A' ? 'B' : 'A')}
                                      title="Move to the other side" style={S.liBtn}>⇄</button>
                                    <button onClick={() => setCell(idx, p.id, null)}
                                      title={`Take ${p.name} out of this chukka`} style={S.liX}>×</button>
                                  </li>
                                ))}
                                {(side === 'A' ? ck.teamA : ck.teamB).length === 0 && (
                                  <li style={S.sideEmpty}>Drag a rider here</li>
                                )}
                              </ul>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      <div style={S.spare}>
                        {players.filter(p => !sideOf(ck, p.id)).map(p => (
                          <button key={p.id} onClick={() => setCell(idx, p.id, ck.teamA.length <= ck.teamB.length ? 'A' : 'B')}
                            style={S.spareChip} title={`Add ${p.name} to chukka ${ck.number}`}>
                            ＋ {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div style={S.gridWrap}>
                    <table style={S.grid}>
                      <thead>
                        <tr>
                          <th style={{ ...S.th, ...S.thName }}>Rider</th>
                          <th style={S.th}>H</th>
                          {chukkas.map(ck => (
                            <th key={ck.idx} style={S.th}>
                              {ck.number}<small style={S.thTime}>{ck.time}</small>
                            </th>
                          ))}
                          <th style={S.th}>Ck</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map(p => {
                          const clash = stats.clashIds.has(p.id);
                          const got = drawn.get(p.id) || 0;
                          return (
                            <tr key={p.id}>
                              <td style={{ ...S.tdName, ...(clash ? S.tdClash : null) }}>
                                {p.name}{p.noConsecutive ? <span style={S.ncTag}> NC</span> : null}
                              </td>
                              <td style={S.tdH}>{fmtH(p.handicap)}</td>
                              {chukkas.map((ck, idx) => {
                                const s = sideOf(ck, p.id);
                                const next = s === 'A' ? 'B' : s === 'B' ? null : 'A';
                                return (
                                  <td key={ck.idx}
                                    onClick={() => setCell(idx, p.id, next)}
                                    title={s ? `${p.name} — ${s === 'A' ? 'Blue' : 'White'}. Click to move to ${next === 'B' ? 'White' : next === 'A' ? 'Blue' : 'out'}.` : `Put ${p.name} into chukka ${ck.number} on Blue`}
                                    style={{ ...S.tdCell, ...(s === 'A' ? S.cellA : s === 'B' ? S.cellB : null) }}>
                                    {s === 'A' ? 'B' : s === 'B' ? 'W' : ''}
                                  </td>
                                );
                              })}
                              <td style={{ ...S.tdFoot, ...(got < p.chukkas ? S.tdShort : null) }}>{got}/{p.chukkas}</td>
                            </tr>
                          );
                        })}
                        <tr style={S.footRow}>
                          <td style={{ ...S.tdName, ...S.tdFootName }}>Handicap each side</td>
                          <td style={S.tdH} />
                          {chukkas.map(ck => (
                            <td key={ck.idx} style={{ ...S.tdFoot, ...(ck.sumA === ck.sumB ? S.tdEven : null) }}>
                              {fmtH(ck.sumA)}/{fmtH(ck.sumB)}
                            </td>
                          ))}
                          <td style={S.tdFoot} />
                        </tr>
                        <tr style={S.footRow}>
                          <td style={{ ...S.tdName, ...S.tdFootName }}>Riders on the pitch</td>
                          <td style={S.tdH} />
                          {chukkas.map(ck => (
                            <td key={ck.idx} style={{ ...S.tdFoot, ...(ck.playerCount < 4 ? S.tdShort : null) }}>
                              {ck.teamA.length}v{ck.teamB.length}
                            </td>
                          ))}
                          <td style={S.tdFoot} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p style={S.gridNote}>
                    Click a cell to cycle Blue → White → out. Reading across a row shows whether
                    someone is playing back-to-back; reading down a column shows whether the sides
                    are even. <b>NC</b> marks riders who asked not to play back-to-back — a red name
                    means the draw gave them consecutive chukkas anyway.
                  </p>
                </>
              )}

              <div style={S.addRow}>
                <button onClick={onClearDraw} style={S.btnDanger}>Clear the draw</button>
              </div>
            </>
          )}
        </main>

        {/* ── Right: the day ─────────────────────────────────────────────── */}
        <aside style={S.insp}>
          <div style={S.inspHead}>{cfg.fullLabel} settings</div>

          <Section title="The session">
            <Field label="Throw-in">
              <input key={dayKey} type="time" defaultValue={hhmm(throwInMin)}
                onBlur={e => e.target.value && onThrowIn(e.target.value)} style={S.inpFull} />
            </Field>
            <Field label="Ground">
              <select value={ground || ''} onChange={e => onGround(e.target.value)} style={S.inpFull}>
                <option value="">— not set —</option>
                {groundOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <div style={S.hint}>
              {(ground || '').trim().toLowerCase() === 'arena'
                ? 'The arena draws 3 a side.'
                : 'Grass draws 4 a side.'}
            </div>
            <label style={S.check}>
              <input type="checkbox" checked={!!manualClosed} onChange={toggleManualClosed} style={S.cbox} />
              Close sign-ups — the day is full
            </label>
            <div style={S.hint}>Otherwise sign-ups close on their own 24 hours before throw-in.</div>
          </Section>

          {schedule && (
            <Section title="The draw">
              <div style={published ? S.bannerOk : S.bannerWarn}>
                {published
                  ? <><b>Published.</b> Everyone signed up can see their side and chukka times.</>
                  : <><b>Not published.</b> Riders see the roster but not the teams. Publish when you're happy with it.</>}
              </div>
              <div style={S.hint}>Editing a published draw unpublishes it, so nobody rides off a stale team sheet.</div>
            </Section>
          )}

          {schedule && (
            <Section title="Share">
              <button onClick={onWhatsApp} style={S.btnWide}>Send to the club WhatsApp</button>
              <button onClick={onPNG} style={S.btnWide}>Download as an image</button>
              <button onClick={onXLSX} style={S.btnWide}>Download as a spreadsheet</button>
            </Section>
          )}

          {loadBackups && (
          <Section title="Roster snapshots">
            <button onClick={() => { const n = !showBackups; setShowBackups(n); if (n) loadBackups(); }} style={S.btnWide}>
              {showBackups ? 'Hide snapshots' : 'Show snapshots'}
            </button>
            {showBackups && (
              rosterBackups.length === 0
                ? <div style={S.hint}>No snapshots yet — they're captured automatically as rosters change.</div>
                : <div style={S.backups}>
                  {rosterBackups.map((b, i) => {
                    const counts = dayKeys
                      .map(k => { const a = b.rosters && b.rosters[k]; return (Array.isArray(a) && a.length) ? `${dayConfig[k].short} ${a.length}` : null; })
                      .filter(Boolean).join(' · ');
                    return (
                      <div key={i} style={S.backupRow}>
                        <div style={{ minWidth: 0 }}>
                          <div style={S.backupWhen}>{new Date(b.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                          <div style={S.hintInline}>{counts || 'empty'}</div>
                        </div>
                        <button onClick={() => restoreBackup(b)} style={S.linkBtn}>Restore</button>
                      </div>
                    );
                  })}
                </div>
            )}
          </Section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ n, label, good, bad }) {
  return (
    <div style={styles.stat}>
      <b style={{ ...styles.statN, ...(good ? styles.statGood : null), ...(bad ? styles.statBad : null) }}>{n}</b>
      <span style={styles.statL}>{label}</span>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div style={styles.fieldStack}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}
function Section({ title, children }) {
  return (
    <section style={styles.section}>
      <h3 style={styles.sectionH}>{title}</h3>
      {children}
    </section>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
// Inline objects on the app's CSS variables, matching FixtureBoard.
const styles = {
  wrap: { position: 'fixed', inset: 0, zIndex: 50, background: 'var(--cream)', display: 'flex', flexDirection: 'column' },
  bar: { height: 54, flexShrink: 0, background: 'var(--burgundy)', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' },
  barName: { fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 500, whiteSpace: 'nowrap' },
  sep: { width: 1, height: 22, background: 'rgba(250,249,247,0.2)' },
  dayPick: { display: 'flex', gap: 2, background: 'rgba(250,249,247,0.09)', borderRadius: 8, padding: 3 },
  dayBtn: { font: 'inherit', fontSize: 12, fontWeight: 600, padding: '4px 12px', border: 0, borderRadius: 6, background: 'transparent', color: 'rgba(250,249,247,0.62)', cursor: 'pointer', textAlign: 'center' },
  dayBtnOn: { background: 'var(--gold-bright)', color: 'var(--ink)' },
  dayBtnSub: { display: 'block', fontWeight: 500, fontSize: 9.5, opacity: 0.8 },
  chipOpen: { fontSize: 10, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 99, background: 'rgba(120,200,150,0.18)', color: '#8ed3a8' },
  chipShut: { fontSize: 10, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 99, background: 'rgba(211,122,111,0.2)', color: '#e79a90' },

  shell: { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '300px minmax(0,1fr) 300px' },
  rail: { overflowY: 'auto', background: '#fff', borderRight: '1px solid var(--line)' },
  canvas: { overflowY: 'auto', padding: '0 20px 60px' },
  insp: { overflowY: 'auto', background: '#fff', borderLeft: '1px solid var(--line)' },

  railHead: { position: 'sticky', top: 0, zIndex: 5, background: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px 10px', borderBottom: '1px solid var(--line)' },
  eyebrow: { fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 },
  railTools: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 0' },

  signup: { margin: 10, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--cream-warm)' },
  signupHead: { fontSize: 11.5, fontWeight: 700, cursor: 'pointer', listStyle: 'none' },
  signupBody: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 9 },
  sugg: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  suggChip: { font: 'inherit', fontSize: 11, padding: '3px 7px', borderRadius: 99, border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', cursor: 'pointer' },
  flagRow: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  err: { fontSize: 11.5, color: 'var(--danger)', lineHeight: 1.45 },

  plist: { padding: '8px 10px 24px' },
  pWrap: { marginBottom: 2 },
  pRow: { display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 7, border: '1px solid transparent', cursor: 'grab' },
  pName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5, textAlign: 'left', background: 'none', border: 0, padding: 0, font: 'inherit', color: 'var(--ink)', cursor: 'pointer' },
  hcap: { fontSize: 11, fontWeight: 700, width: 26, textAlign: 'center', padding: '2px 0', borderRadius: 4, background: 'var(--cream-warm)', flexShrink: 0 },
  flags: { display: 'flex', gap: 3, flexShrink: 0 },
  flag: { fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: 'var(--cream-warm)', color: 'var(--muted)' },
  flagBad: { background: '#fbeeec', color: 'var(--danger)' },
  flagVip: { fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: 'rgba(251,180,21,0.2)', color: 'var(--gold)' },
  flagPony: { fontSize: 10 },
  got: { fontSize: 11, fontWeight: 700, color: 'var(--muted)', flexShrink: 0 },
  gotShort: { fontSize: 11, fontWeight: 700, color: 'var(--danger)', flexShrink: 0 },
  stepper: { display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 },
  stepBtn: { width: 19, height: 19, border: '1px solid var(--line)', background: '#fff', color: 'var(--muted)', borderRadius: 4, font: 'inherit', fontSize: 12, lineHeight: 1, cursor: 'pointer', padding: 0 },
  ck: { fontSize: 11.5, width: 14, textAlign: 'center', fontWeight: 600 },
  pDetail: { padding: '4px 8px 10px 34px', display: 'flex', flexDirection: 'column', gap: 7 },
  detailRow: { display: 'flex', alignItems: 'center', gap: 6 },

  top: { position: 'sticky', top: 0, zIndex: 6, background: 'var(--cream)', padding: '14px 0 10px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  ttl: { fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, margin: 0, fontWeight: 600 },
  sub: { fontSize: 11.5, color: 'var(--muted)' },
  seg: { display: 'inline-flex', border: '1px solid var(--line)', borderRadius: 7, overflow: 'hidden' },
  segBtn: { font: 'inherit', fontSize: 11.5, fontWeight: 600, padding: '6px 13px', border: 0, background: '#fff', color: 'var(--muted)', cursor: 'pointer' },
  segOn: { background: 'var(--burgundy)', color: 'var(--cream)' },

  stats: { display: 'flex', gap: 18, padding: '12px 0 14px', flexWrap: 'wrap' },
  stat: { display: 'flex', flexDirection: 'column', gap: 1 },
  statN: { fontSize: 19, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  statL: { fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 },
  statGood: { color: '#2e6f4e' },
  statBad: { color: 'var(--danger)' },

  warn: { marginBottom: 10, padding: '10px 12px', background: '#fdf4e6', border: '1px solid #e8d5a0', borderRadius: 6, fontSize: 12, color: '#8a5a1a', lineHeight: 1.5 },
  warnSub: { fontSize: 11, opacity: 0.85, marginTop: 3 },

  card: { background: '#fff', border: '1px solid var(--line)', borderRadius: 9, marginBottom: 10 },
  cardHead: { display: 'flex', alignItems: 'center', gap: 9, padding: '8px 13px', borderBottom: '1px solid var(--line)' },
  ckNo: { fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 600 },
  ckTime: { fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' },
  thin: { fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#fdf4e6', color: '#8a5a1a' },
  balLabel: { fontSize: 11, color: 'var(--muted)' },
  balBar: { width: 70, height: 5, borderRadius: 99, background: 'var(--cream-warm)', position: 'relative', overflow: 'hidden', display: 'inline-block' },
  balFill: { position: 'absolute', top: 0, bottom: 0, background: 'var(--gold-bright)', borderRadius: 99 },
  balNum: { fontSize: 11.5, fontWeight: 700, minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  balEven: { color: '#2e6f4e' },

  sides: { display: 'grid', gridTemplateColumns: '1fr 46px 1fr', padding: '11px 13px 4px' },
  sideBox: { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', minHeight: 92 },
  sideA: { background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)' },
  sideB: { background: 'var(--white-team)', borderColor: 'var(--white-team-border)' },
  sideOver: { boxShadow: 'inset 0 0 0 2px var(--gold-bright)' },
  sideHead: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 7 },
  sideSum: { fontSize: 11.5, fontWeight: 700, letterSpacing: 0, fontVariantNumeric: 'tabular-nums' },
  sideList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  sideLi: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'grab' },
  sideEmpty: { fontSize: 11.5, opacity: 0.6 },
  liH: { fontSize: 10.5, opacity: 0.75, width: 20, flexShrink: 0 },
  liName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  liBtn: { background: 'none', border: 0, color: 'inherit', opacity: 0.55, cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '0 2px' },
  liX: { background: 'none', border: 0, color: 'inherit', opacity: 0.55, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' },
  vs: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  vsV: { fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic', fontSize: 13, color: 'var(--muted)' },
  spare: { display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px 13px 11px' },
  spareChip: { font: 'inherit', fontSize: 10.5, padding: '3px 8px', borderRadius: 99, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' },

  gridWrap: { overflowX: 'auto', background: '#fff', border: '1px solid var(--line)', borderRadius: 9 },
  grid: { borderCollapse: 'collapse', width: '100%', fontSize: 12 },
  th: { background: 'var(--burgundy)', color: 'var(--cream)', fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, padding: '8px 6px', border: '1px solid var(--line)', position: 'sticky', top: 0 },
  thName: { textAlign: 'left', paddingLeft: 11, minWidth: 160 },
  thTime: { display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 0, textTransform: 'none', opacity: 0.7 },
  footRow: { background: 'var(--cream-warm)' },
  tdFootName: { fontSize: 11, color: 'var(--muted)', fontWeight: 600 },
  tdName: { textAlign: 'left', padding: '6px 11px', fontSize: 12.5, whiteSpace: 'nowrap', border: '1px solid var(--line)' },
  tdClash: { color: 'var(--danger)', fontWeight: 600 },
  ncTag: { fontSize: 9.5, opacity: 0.75 },
  tdH: { textAlign: 'center', width: 38, color: 'var(--muted)', fontSize: 11.5, border: '1px solid var(--line)', fontVariantNumeric: 'tabular-nums' },
  tdCell: { textAlign: 'center', width: 52, height: 32, cursor: 'pointer', fontWeight: 700, fontSize: 11, border: '1px solid var(--line)' },
  cellA: { background: 'var(--blue)', color: '#fff' },
  cellB: { background: 'var(--white-team)', color: 'var(--ink)', boxShadow: 'inset 0 0 0 1px var(--white-team-border)' },
  tdFoot: { textAlign: 'center', fontSize: 11, color: 'var(--muted)', border: '1px solid var(--line)', fontVariantNumeric: 'tabular-nums' },
  tdEven: { color: '#2e6f4e' },
  tdShort: { color: 'var(--danger)', fontWeight: 700 },
  gridNote: { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55, maxWidth: '72ch', margin: '10px 2px 0' },

  addRow: { display: 'flex', gap: 8, margin: '16px 0 20px' },
  empty: { padding: '48px 0', textAlign: 'center' },

  inspHead: { padding: '13px 15px', borderBottom: '1px solid var(--line)', fontSize: 11, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, position: 'sticky', top: 0, background: '#fff', zIndex: 3 },
  section: { padding: '13px 15px', borderBottom: '1px solid var(--line)' },
  sectionH: { fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, margin: '0 0 9px', fontWeight: 600 },
  fieldStack: { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 },
  fieldLabel: { fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 },
  two: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  check: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, cursor: 'pointer' },
  cbox: { width: 14, height: 14, accentColor: 'var(--burgundy)' },
  hint: { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, margin: '6px 0 0' },
  hintInline: { fontSize: 10.5, color: 'var(--muted)' },
  bannerOk: { fontSize: 11.5, lineHeight: 1.5, padding: '9px 11px', borderRadius: 7, background: '#eef5f0', border: '1px solid #cfe3d6', color: '#2e6f4e' },
  bannerWarn: { fontSize: 11.5, lineHeight: 1.5, padding: '9px 11px', borderRadius: 7, background: 'var(--cream-warm)', border: '1px solid var(--line)', color: 'var(--ink)' },
  backups: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, maxHeight: 220, overflowY: 'auto' },
  backupRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid var(--line)', paddingBottom: 6 },
  backupWhen: { fontSize: 12 },

  inpFull: { font: 'inherit', fontSize: 12.5, padding: '6px 9px', border: '1px solid var(--line)', borderRadius: 6, background: '#fff', color: 'var(--ink)', width: '100%' },
  inpSm: { font: 'inherit', fontSize: 11.5, padding: '4px 6px', border: '1px solid var(--line)', borderRadius: 5, background: '#fff', color: 'var(--ink)' },

  btnGold: { font: 'inherit', fontSize: 12, fontWeight: 600, padding: '7px 13px', borderRadius: 6, border: '1px solid var(--gold-bright)', background: 'var(--gold-bright)', color: 'var(--ink)', cursor: 'pointer' },
  btnGhost: { font: 'inherit', fontSize: 12, fontWeight: 600, padding: '7px 13px', borderRadius: 6, border: '1px solid rgba(250,249,247,0.3)', background: 'transparent', color: 'var(--cream)', cursor: 'pointer' },
  btnWide: { font: 'inherit', fontSize: 12, fontWeight: 600, padding: '7px 13px', borderRadius: 6, border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', cursor: 'pointer', width: '100%', marginBottom: 7 },
  btnDanger: { font: 'inherit', fontSize: 11, padding: '6px 11px', borderRadius: 6, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' },
  linkBtn: { background: 'none', border: 0, padding: 0, font: 'inherit', fontSize: 11, color: 'var(--burgundy)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 },
  linkDanger: { background: 'none', border: 0, padding: 0, font: 'inherit', fontSize: 11, color: 'var(--danger)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 },
};
