import React, { useState, useMemo, useRef, useEffect } from 'react';

// ── Desktop fixture board ───────────────────────────────────────────────────
// A three-pane workspace for building a tournament on a laptop: the fixture's
// teams on the left, its days and matches in the middle, the selected match's
// detail on the right.
//
// This is a second *view* of the fixture editor, not a second implementation.
// Every mutation goes through the updDay / updMatch / updTeam / setDraft
// functions handed in from the club app, which are the same ones the mobile
// editor uses and which write straight to Firestore. Nothing is duplicated, so
// the two views cannot drift apart in behaviour.
//
// Mobile is untouched: the club app only renders this above the desktop
// breakpoint, and renders exactly what it always did below it.
//
// Why teams-first. Across every TPPC fixture with squads entered, teams are
// reused heavily — one fixture ran five teams over eight matches with a squad
// appearing four times. The mobile editor makes you retype a squad per match;
// here a team is built once in the rail and dragged into as many matches as it
// plays. Editing it in the rail updates every match it appears in.

const clone = (o) => JSON.parse(JSON.stringify(o));
const fmtH = (h) => (h === null || h === undefined || h === '' ? '' : (Number(h) > 0 ? `+${h}` : String(h).replace('-', '−')));
const norm = (s) => (s || '').trim().toLowerCase();

// Team handicap: sum the counted players, else the stored team figure. Mirrors
// teamHandicap() in tournamentPdf.js — a blank handicap is unset, not zero.
const squadHandicap = (team) => {
  const players = (team && team.players) || [];
  const hs = players
    .map(p => (p && p.handicap !== null && p.handicap !== undefined && p.handicap !== '' ? Number(p.handicap) : null))
    .filter(n => n !== null && Number.isFinite(n));
  if (hs.length) return hs.slice(0, 4).reduce((a, b) => a + b, 0);
  const stored = team && team.handicap;
  if (stored === null || stored === undefined || stored === '') return null;
  const n = Number(stored);
  return Number.isFinite(n) ? n : null;
};

// Goals on handicap, per HPA: difference × chukkas ÷ 6, part-goals rounded up to
// a half, awarded to the lower-handicap side.
const headStart = (match) => {
  const a = squadHandicap(match.teamA);
  const b = squadHandicap(match.teamB);
  if (a === null || b === null || a === b) return null;
  const n = Number(match.chukkas);
  const chukkas = Number.isFinite(n) && n > 0 ? n : 4;
  const units = Math.abs(a - b) * chukkas;
  const goals = Math.floor(units / 6) + (units % 6 > 0 ? 0.5 : 0);
  if (!goals) return null;
  return { key: a < b ? 'teamA' : 'teamB', goals };
};
const fmtGoals = (g) => (g === 0.5 ? '½' : (g % 1 ? `${Math.floor(g)}½` : String(g)));

export default function FixtureBoard({
  fixture, draft, setDraft, updDay, updMatch, updTeam, moveMatch,
  teamsDb, playerDb, groundOptions, teamColours, teamColourKey,
  saveTeam, deleteTeam, setTeamColour,
  interestCount, interestClosesAt, interestClosed,
  onClose, onPrint,
}) {
  const days = draft.days || [];
  const [dayIx, setDayIx] = useState(0);
  const [sel, setSel] = useState({ di: 0, mi: 0 });
  const [tab, setTab] = useState('teams');
  const [search, setSearch] = useState('');
  // Separate from the players search so switching tabs doesn't carry a query
  // across into a list where it means something different.
  const [teamSearch, setTeamSearch] = useState('');
  const [dropTarget, setDropTarget] = useState(null); // `${di}:${mi}:${tk}`
  const [adding, setAdding] = useState(false);        // the "new team" form is open
  const [newName, setNewName] = useState('');
  const [openKey, setOpenKey] = useState(null);       // which team card is expanded
  // The touch route to a drop. Holds the same payload shape as dragged.current:
  // a team object, or { player }. See the comment on Slot's onClick for why a
  // drag-only board is unusable on an iPad.
  const [picked, setPicked] = useState(null);
  const pickedIs = (payload) => {
    if (!picked || !payload) return false;
    if (payload.player) return !!picked.player && norm(picked.player.name) === norm(payload.player.name);
    return !picked.player && norm(picked.name) === norm(payload.name);
  };
  // Escape cancels a pick, matching the new-team form and the search boxes.
  React.useEffect(() => {
    if (!picked) return undefined;
    const on = (e) => { if (e.key === 'Escape') setPicked(null); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [picked]);
  const dragged = useRef(null);

  const day = days[Math.min(dayIx, Math.max(0, days.length - 1))] || null;
  const selMatch = (days[sel.di] && (days[sel.di].matches || [])[sel.mi]) || null;

  // ── The fixture's teams ──────────────────────────────────────────────────
  // Built from the squads already drawn into matches, so the rail always
  // reflects the fixture rather than the whole club directory. Each entry
  // carries the matches it appears in, which is what makes an edit in the rail
  // able to write through to every one of them.
  const teams = useMemo(() => {
    const map = new Map();
    days.forEach((d, di) => (d.matches || []).forEach((m, mi) => ['teamA', 'teamB'].forEach((tk) => {
      const t = m[tk];
      const name = (t && t.name || '').trim();
      if (!name || name.toUpperCase() === 'TBC') return;
      const key = norm(name);
      if (!map.has(key)) map.set(key, { name, players: clone(t.players || []), handicap: t.handicap ?? null, slots: [] });
      map.get(key).slots.push({ di, mi, tk });
    })));
    return [...map.values()].sort((a, b) => b.slots.length - a.slots.length || a.name.localeCompare(b.name));
  }, [days]);

  // Squads in the club's teams directory that aren't in this fixture yet.
  const availableTeams = useMemo(() => {
    const inFixture = new Set(teams.map(t => norm(t.name)));
    return Object.values(teamsDb || {})
      .filter(t => t && (t.name || '').trim() && !inFixture.has(norm(t.name)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teamsDb, teams]);

  // Both rail lists are filtered by the same query, so a search says what the
  // rail can show as a whole — a team you half-remember is found whether or not
  // it is already in this fixture, which is exactly when you go looking for it.
  const teamQuery = norm(teamSearch);
  const shownTeams = useMemo(
    () => (teamQuery ? teams.filter(t => norm(t.name).includes(teamQuery)) : teams),
    [teams, teamQuery],
  );
  const shownAvailable = useMemo(
    () => (teamQuery ? availableTeams.filter(t => norm(t.name).includes(teamQuery)) : availableTeams),
    [availableTeams, teamQuery],
  );

  const players = useMemo(() => {
    const q = norm(search);
    return (playerDb || [])
      .filter(p => p && p.active !== false && (!q || norm(p.name).includes(q)))
      .sort((a, b) => (b.handicap ?? -99) - (a.handicap ?? -99) || (a.name || '').localeCompare(b.name || ''));
  }, [playerDb, search]);

  const colourOf = (name) => {
    const key = teamColourKey ? teamColourKey(name) : null;
    return (teamColours || []).find(c => c.key === key) || null;
  };

  // Write a squad into every match it plays in, so a swap made once in the rail
  // propagates. This is the whole point of building teams rather than matches.
  const writeSquadEverywhere = (teamName, nextPlayers, nextHandicap) => {
    const key = norm(teamName);
    let next = clone(draft);
    (next.days || []).forEach(d => (d.matches || []).forEach(m => ['teamA', 'teamB'].forEach(tk => {
      if (m[tk] && norm(m[tk].name) === key) {
        m[tk] = { ...m[tk], players: clone(nextPlayers), handicap: nextHandicap ?? m[tk].handicap ?? null };
      }
    })));
    setDraft(next);
  };

  const renameTeamEverywhere = (from, to) => {
    const key = norm(from);
    const clean = (to || '').trim();
    if (!clean) return;
    let next = clone(draft);
    (next.days || []).forEach(d => (d.matches || []).forEach(m => ['teamA', 'teamB'].forEach(tk => {
      if (m[tk] && norm(m[tk].name) === key) m[tk] = { ...m[tk], name: clean };
    })));
    setDraft(next);
  };

  // ── Creating a team ──────────────────────────────────────────────────────
  // A team only belongs to a fixture by playing in one of its matches, so a
  // brand-new team is written to the club's teams directory and listed under
  // "Not in this fixture" until it is dragged into a match. That also means it
  // is available to every future fixture, which is how squads actually recur.
  const nameTaken = useMemo(() => {
    const key = norm(newName);
    if (!key) return false;
    return teams.some(t => norm(t.name) === key) || Object.keys(teamsDb || {}).some(k => norm(k) === key);
  }, [newName, teams, teamsDb]);

  const createTeam = () => {
    const name = (newName || '').trim().replace(/\s+/g, ' ');
    if (!name || nameTaken || !saveTeam) return;
    saveTeam({ name, handicap: null, players: [] });
    setNewName('');
    setAdding(false);
    setOpenKey(norm(name)); // open it straight away so the squad can be typed in
  };

  // Renaming a directory team is a key change, so it is a delete plus a write
  // rather than an in-place edit — hence its own handler.
  const renameStoredTeam = (from, to) => {
    const clean = (to || '').trim();
    if (!clean || !saveTeam) return;
    const prev = (teamsDb || {})[norm(from)] || {};
    saveTeam({ ...prev, name: clean }, from);
    if (openKey === norm(from)) setOpenKey(norm(clean));
  };

  const assignTeam = (di, mi, tk, team) => {
    updTeam(di, mi, tk, () => ({
      name: team.name,
      handicap: team.handicap ?? null,
      players: clone(team.players || []),
    }));
  };

  const addDay = () => setDraft({ ...draft, days: [...days, { id: `d${Date.now()}`, dateLabel: '', ground: '', matches: [] }] });
  const addMatch = (di) => updDay(di, d => ({
    ...d,
    matches: [...(d.matches || []), {
      id: `m${Date.now()}`, time: '', label: '', chukkas: 4, division: '',
      teamA: { name: '', handicap: null, players: [] },
      teamB: { name: '', handicap: null, players: [] },
      umpires: '', commentator: '', goalJudges: '', timekeeper: '', notes: '',
    }],
  }));
  const duplicateMatch = (di, mi) => updDay(di, d => {
    const ms = [...(d.matches || [])];
    const copy = clone(ms[mi]);
    copy.id = `m${Date.now()}`;
    delete copy.scoreA; delete copy.scoreB; delete copy.liveChukka;
    ms.splice(mi + 1, 0, copy);
    return { ...d, matches: ms };
  });
  const removeMatch = (di, mi) => updDay(di, d => ({ ...d, matches: (d.matches || []).filter((_, i) => i !== mi) }));

  const published = !!draft.published;
  const setPublished = (v) => setDraft({ ...draft, published: v, publishedAt: v ? Date.now() : null });

  const S = styles;

  return (
    <div style={S.wrap}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={S.bar}>
        <div style={S.barName}>{fixture.name}</div>
        {fixture.level ? <div style={S.barLevel}>{fixture.level}</div> : null}
        <div style={S.barDate}>{fixture.date}</div>
        <span style={published ? S.chipLive : S.chipDraft}>{published ? 'Published' : 'Draft'}</span>
        <div style={{ flex: 1 }} />
        <button onClick={onPrint} style={S.btnGhost}>Programme PDF</button>
        <button onClick={() => setPublished(!published)} style={published ? S.btnGhost : S.btnGold}>
          {published ? 'Unpublish' : 'Publish programme'}
        </button>
        <button onClick={onClose} style={S.btnGhost} aria-label="Close the board">Done</button>
      </div>

      <div style={S.shell}>
        {/* ── Left: teams ──────────────────────────────────────────────── */}
        <aside style={S.rail}>
          <div style={S.tabs} role="tablist">
            <button role="tab" aria-selected={tab === 'teams'} onClick={() => setTab('teams')}
              style={{ ...S.tab, ...(tab === 'teams' ? S.tabOn : null) }}>Teams · {teams.length}</button>
            <button role="tab" aria-selected={tab === 'players'} onClick={() => setTab('players')}
              style={{ ...S.tab, ...(tab === 'players' ? S.tabOn : null) }}>Players · {(playerDb || []).length}</button>
          </div>

          {picked && (
            <div style={S.placing} role="status">
              <span style={{ flex: 1 }}>
                Placing <strong>{picked.player ? picked.player.name : picked.name}</strong> — tap a match slot
              </span>
              <button onClick={() => setPicked(null)} style={S.btnPlainSm}>Cancel</button>
            </div>
          )}

          {tab === 'teams' ? (
            <div style={S.railBody}>
              {teams.length + availableTeams.length > 0 && (
                <input value={teamSearch} onChange={e => setTeamSearch(e.target.value)}
                  placeholder={`Search ${teams.length + availableTeams.length} teams…`} style={S.search}
                  onKeyDown={e => { if (e.key === 'Escape') setTeamSearch(''); }} />
              )}
              {adding ? (
                <form style={S.newTeam} onSubmit={(e) => { e.preventDefault(); createTeam(); }}>
                  <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Team name" style={S.inpFull}
                    onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewName(''); } }} />
                  {nameTaken && <div style={S.hint}>A team called “{newName.trim()}” already exists.</div>}
                  <div style={S.newTeamRow}>
                    <button type="submit" disabled={!newName.trim() || nameTaken} style={S.btnGoldSm}>Create team</button>
                    <button type="button" onClick={() => { setAdding(false); setNewName(''); }} style={S.btnPlainSm}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setAdding(true)} style={S.addTeamBtn}>＋ New team</button>
              )}

              {!teamQuery && teams.length === 0 && !adding && (
                <p style={S.hint}>No teams in this fixture yet. Create one above, or type a name
                  straight into a match slot — either way it lands here and can be dragged into
                  every other match it plays.</p>
              )}
              {teamQuery && shownTeams.length === 0 && shownAvailable.length === 0 && (
                <p style={S.hint}>No team matches “{teamSearch.trim()}”.</p>
              )}
              {shownTeams.map(t => (
                <TeamCard
                  key={norm(t.name)} team={t} colour={colourOf(t.name)}
                  teamColours={teamColours} setColour={(k) => setTeamColour(t.name, k)}
                  open={openKey === norm(t.name)}
                  onToggle={() => setOpenKey(openKey === norm(t.name) ? null : norm(t.name))}
                  onDragStart={() => { dragged.current = t; }}
                  picked={picked} setPicked={setPicked}
                  onRename={(v) => { const wasOpen = openKey === norm(t.name); renameTeamEverywhere(t.name, v); if (wasOpen) setOpenKey(norm(v)); }}
                  onPlayers={(ps) => writeSquadEverywhere(t.name, ps, t.handicap)}
                  playerDb={playerDb}
                />
              ))}

              {shownAvailable.length > 0 && (
                <>
                  <div style={S.railHead}>Not in this fixture</div>
                  {shownAvailable.map(t => (
                    <TeamCard
                      key={norm(t.name)} team={{ ...t, slots: [] }} colour={colourOf(t.name)}
                      teamColours={teamColours} setColour={(k) => setTeamColour(t.name, k)}
                      open={openKey === norm(t.name)}
                      onToggle={() => setOpenKey(openKey === norm(t.name) ? null : norm(t.name))}
                      onDragStart={() => { dragged.current = t; }}
                      picked={picked} setPicked={setPicked}
                      onRename={(v) => { const wasOpen = openKey === norm(t.name); renameStoredTeam(t.name, v); if (wasOpen) setOpenKey(norm(v)); }}
                      onPlayers={(ps) => saveTeam({ ...t, players: ps })}
                      onDelete={deleteTeam ? () => deleteTeam(t.name) : null}
                      playerDb={playerDb}
                    />
                  ))}
                </>
              )}
            </div>
          ) : (
            <div style={S.railBody}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${(playerDb || []).length} members…`} style={S.search} />
              <div style={S.hint}>Drag a player onto any squad slot, or tap to pick then tap the slot.</div>
              {players.map(p => (
                <div key={p.id} draggable
                  onDragStart={(e) => { dragged.current = { player: p }; e.dataTransfer.effectAllowed = 'copy'; }}
                  onClick={() => setPicked(pickedIs({ player: p }) ? null : { player: p })}
                  role="button" aria-pressed={pickedIs({ player: p })}
                  style={{ ...S.pRow, ...(pickedIs({ player: p }) ? S.pickedRow : null) }}>
                  <span style={S.hcap}>{p.handicap === null || p.handicap === undefined ? '—' : fmtH(p.handicap)}</span>
                  <span style={S.pName}>{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── Centre: days and matches ─────────────────────────────────── */}
        <main style={S.canvas}>
          <div style={S.dayTabs} role="tablist">
            {days.map((d, i) => (
              <button key={d.id || i} role="tab" aria-selected={i === dayIx} onClick={() => setDayIx(i)}
                style={{ ...S.dayTab, ...(i === dayIx ? S.dayTabOn : null) }}>
                <span>{(d.dateLabel || `Day ${i + 1}`).split(' ').slice(0, 2).join(' ')}</span>
                <small style={S.dayTabSub}>{(d.matches || []).length} {(d.matches || []).length === 1 ? 'match' : 'matches'}</small>
              </button>
            ))}
            <button onClick={addDay} style={S.dayTab}>＋ Add day</button>
          </div>

          {day && (
            <>
              <div style={S.dayMeta}>
                <Field label="Day">
                  <input value={day.dateLabel || ''} onChange={e => updDay(dayIx, d => ({ ...d, dateLabel: e.target.value }))}
                    placeholder="Saturday 30th May" style={{ ...S.inp, minWidth: 220 }} />
                </Field>
                <Field label="Ground">
                  <select value={day.ground || ''} onChange={e => updDay(dayIx, d => ({ ...d, ground: e.target.value }))} style={S.inp}>
                    <option value="">Ground…</option>
                    {(groundOptions || []).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <label style={S.check} title="A presentation at the end of the day, after everything else. For one that follows a particular match, tick Prize on that match instead.">
                  <input type="checkbox" checked={!!day.prizegiving}
                    onChange={e => updDay(dayIx, d => ({ ...d, prizegiving: e.target.checked }))} style={S.cbox} />
                  Prizegiving at the end
                </label>
                <div style={{ flex: 1 }} />
                <button onClick={() => { const ds = days.filter((_, i) => i !== dayIx); setDraft({ ...draft, days: ds }); setDayIx(0); }}
                  style={S.btnDanger}>Remove day</button>
              </div>

              {(day.matches || []).map((m, mi) => {
                const hs = headStart(m);
                const isSel = sel.di === dayIx && sel.mi === mi;
                return (
                  <div key={m.id || mi} style={{ ...S.match, ...(isSel ? S.matchSel : null) }}
                    onClick={() => setSel({ di: dayIx, mi })}>
                    <div style={S.mHead}>
                      <input value={m.time || ''} onChange={e => updMatch(dayIx, mi, x => ({ ...x, time: e.target.value }))}
                        placeholder="Time" style={{ ...S.inpSm, width: 62, textAlign: 'center' }} />
                      <input type="number" min="1" value={m.chukkas ?? ''} title="Chukkas — drives the handicap head start"
                        onChange={e => updMatch(dayIx, mi, x => ({ ...x, chukkas: e.target.value === '' ? null : Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                        style={{ ...S.inpSm, width: 46, textAlign: 'center' }} />
                      <input value={m.division || ''} onChange={e => updMatch(dayIx, mi, x => ({ ...x, division: e.target.value }))}
                        placeholder="Div" title="Division, e.g. I, II, III — groups teams on the division team-sheet PDF"
                        style={{ ...S.inpSm, width: 52, textAlign: 'center' }} />
                      <input value={m.label || ''} onChange={e => updMatch(dayIx, mi, x => ({ ...x, label: e.target.value }))}
                        placeholder="Label e.g. Final" style={{ ...S.inpSm, flex: 1, minWidth: 100, fontWeight: 600 }} />
                      {/* Prizegiving belongs to a match, not to the day: a tournament
                          can present after its 4 goal final and again after the 0 goal
                          one. Tick as many matches as there are presentations.
                          The time is optional — left blank it is presented straight
                          after this match, which is what usually happens. */}
                      <label style={{ ...S.check, flexShrink: 0 }} title="Prizegiving after this match"
                        onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={!!m.prizegiving}
                          onChange={e => updMatch(dayIx, mi, x => ({ ...x, prizegiving: e.target.checked }))}
                          style={S.cbox} />
                        Prize
                      </label>
                      {m.prizegiving ? (
                        <input value={typeof m.prizegiving === 'string' ? m.prizegiving : ''}
                          onChange={e => updMatch(dayIx, mi, x => ({ ...x, prizegiving: e.target.value.trim() ? e.target.value : true }))}
                          onClick={e => e.stopPropagation()}
                          placeholder="after" title="Prizegiving time — leave blank for straight after this match"
                          style={{ ...S.inpSm, width: 62, textAlign: 'center', flexShrink: 0 }} />
                      ) : null}
                      <button onClick={(e) => { e.stopPropagation(); moveMatch(dayIx, mi, -1); }} title="Move up" style={S.iconBtn}>↑</button>
                      <button onClick={(e) => { e.stopPropagation(); moveMatch(dayIx, mi, 1); }} title="Move down" style={S.iconBtn}>↓</button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateMatch(dayIx, mi); }} title="Duplicate match" style={S.iconBtn}>⧉</button>
                      <button onClick={(e) => { e.stopPropagation(); removeMatch(dayIx, mi); }} title="Remove match" style={S.iconDanger}>×</button>
                    </div>

                    <div style={S.slots}>
                      <Slot side="A" match={m} tk="teamA" di={dayIx} mi={mi}
                        colour={colourOf((m.teamA || {}).name)}
                        over={dropTarget === `${dayIx}:${mi}:teamA`}
                        setOver={setDropTarget} dragged={dragged}
                        assignTeam={assignTeam} updTeam={updTeam}
                        picked={picked} setPicked={setPicked} />
                      <div style={S.vs}>
                        <span style={S.vsV}>v</span>
                        {hs && (
                          <span style={S.vsHs}>
                            +{fmtGoals(hs.goals)}<br />
                            {((m[hs.key] || {}).name || '').split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <Slot side="B" match={m} tk="teamB" di={dayIx} mi={mi}
                        colour={colourOf((m.teamB || {}).name)}
                        over={dropTarget === `${dayIx}:${mi}:teamB`}
                        setOver={setDropTarget} dragged={dragged}
                        assignTeam={assignTeam} updTeam={updTeam}
                        picked={picked} setPicked={setPicked} />
                    </div>

                    {(m.umpires || m.commentator) && (
                      <div style={S.offs}>
                        {m.umpires ? <span><b style={S.offsB}>Umpires</b> {m.umpires}</span> : null}
                        {m.commentator ? <span><b style={S.offsB}>Commentator</b> {m.commentator}</span> : null}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={S.addRow}>
                <button onClick={() => addMatch(dayIx)} style={S.addBtn}>＋ Add match</button>
                {(day.matches || []).length > 0 && (
                  <button onClick={() => duplicateMatch(dayIx, (day.matches || []).length - 1)} style={S.addBtn}>⧉ Duplicate last</button>
                )}
              </div>
            </>
          )}

          {days.length === 0 && (
            <div style={S.empty}>
              <p style={S.hint}>No days yet.</p>
              <button onClick={addDay} style={S.btnGold}>＋ Add the first day</button>
            </div>
          )}
        </main>

        {/* ── Right: inspector ─────────────────────────────────────────── */}
        <aside style={S.insp}>
          {selMatch ? (
            <>
              <div style={S.inspHead}>
                {selMatch.time || '—'}{selMatch.label ? ` · ${selMatch.label}` : ''}
              </div>
              <Section title="Officials">
                <Field label="Umpires" stack>
                  <input value={selMatch.umpires || ''} onChange={e => updMatch(sel.di, sel.mi, m => ({ ...m, umpires: e.target.value }))} style={S.inpFull} />
                </Field>
                <Field label="Commentator" stack>
                  <input value={selMatch.commentator || ''} onChange={e => updMatch(sel.di, sel.mi, m => ({ ...m, commentator: e.target.value }))} style={S.inpFull} />
                </Field>
                <Field label="Goal judges" stack>
                  <input value={selMatch.goalJudges || ''} onChange={e => updMatch(sel.di, sel.mi, m => ({ ...m, goalJudges: e.target.value }))} style={S.inpFull} />
                </Field>
                <Field label="Timekeeper" stack>
                  <input value={selMatch.timekeeper || ''} onChange={e => updMatch(sel.di, sel.mi, m => ({ ...m, timekeeper: e.target.value }))} style={S.inpFull} />
                </Field>
              </Section>

              <Section title="Result">
                <div style={S.two}>
                  <Field label={(selMatch.teamA || {}).name || 'Team A'} stack>
                    <NumField value={selMatch.scoreA} inputMode="numeric"
                      onCommit={(v) => updMatch(sel.di, sel.mi, m => ({ ...m, scoreA: v }))} style={S.inpFull} />
                  </Field>
                  <Field label={(selMatch.teamB || {}).name || 'Team B'} stack>
                    <NumField value={selMatch.scoreB} inputMode="numeric"
                      onCommit={(v) => updMatch(sel.di, sel.mi, m => ({ ...m, scoreB: v }))} style={S.inpFull} />
                  </Field>
                </div>
              </Section>

              <Section title="Programme">
                <label style={S.check}>
                  <input type="checkbox" checked={!!selMatch.pageBreakBefore} style={S.cbox}
                    onChange={e => updMatch(sel.di, sel.mi, m => ({ ...m, pageBreakBefore: e.target.checked }))} />
                  Page break before this match
                </label>
                <label style={S.check}>
                  <input type="checkbox" checked={!!selMatch.teamListOnly} style={S.cbox}
                    onChange={e => updMatch(sel.di, sel.mi, m => ({ ...m, teamListOnly: e.target.checked }))} />
                  Team list only — no result line
                </label>
                <Field label="Notes" stack>
                  <input value={selMatch.notes || ''} onChange={e => updMatch(sel.di, sel.mi, m => ({ ...m, notes: e.target.value }))} style={S.inpFull} />
                </Field>
              </Section>
            </>
          ) : (
            <div style={S.inspHead}>Select a match</div>
          )}

          <Section title="Registering interest">
            <div style={interestClosed ? S.bannerWarn : S.bannerOk}>
              {interestClosesAt
                ? (interestClosed
                    ? <><b>Closed.</b> Registering shut at the end of {interestClosesAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, the day before the fixture.</>
                    : <><b>Open.</b> Closes at the end of {interestClosesAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} — the day before the fixture.</>)
                : <>The fixture's date can't be read, so registering stays open.</>}
            </div>
            <div style={S.hint}>{interestCount} {interestCount === 1 ? 'player has' : 'players have'} registered.
              Once closed, only a captain can add someone.</div>
          </Section>

          <Section title="Publishing">
            <div style={published ? S.bannerOk : S.bannerWarn}>
              {published
                ? <><b>Published.</b> Every member sees the running order, squads and programme on the Fixtures tab.</>
                : <><b>Not published.</b> Members see the fixture but not the draw. Build it in peace, then publish.</>}
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}

// ── Team card in the rail ──────────────────────────────────────────────────
// A number field that lets you type.
//
// The obvious `onChange={e => set(Number(e.target.value))}` fights the typist:
// the value has to round-trip through Number() on every keystroke, and "-" is
// not a number — so the minus sign is thrown away as fast as it is typed and a
// handicap of -2 cannot be entered at all. A stray letter is worse: Number()
// returns NaN and the box fills with "NaN".
//
// So keep whatever was typed while the field has focus, publish the parsed
// value only when there is one, and drop back to the stored value on blur.
function NumField({ value, onCommit, allowNegative = false, ...rest }) {
  const [draft, setDraft] = useState(null); // null = showing the stored value
  const stored = Number.isFinite(value) ? value : '';
  const pattern = allowNegative ? /^-?\d{0,2}$/ : /^\d{0,3}$/;
  return (
    <input
      {...rest}
      value={draft !== null ? draft : stored}
      onChange={(e) => {
        const raw = e.target.value;
        if (!pattern.test(raw)) return; // ignore anything that can never be a number
        setDraft(raw);
        if (raw === '' ) onCommit(null);
        else if (raw !== '-') onCommit(Number(raw));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

function TeamCard({ team, colour, teamColours, setColour, open, onToggle, onDragStart, picked, setPicked, onRename, onPlayers, onDelete, playerDb }) {
  // The name is edited locally and saved on blur or Enter, not on every
  // keystroke. Renaming as you type meant the team's own name changed under it
  // — and since the card is keyed and tracked by that name, every letter tore
  // the card down, rebuilt it, and collapsed it. One letter per reopen.
  const [draftName, setDraftName] = useState(team.name);
  useEffect(() => { setDraftName(team.name); }, [team.name]);
  const commitName = () => {
    const next = draftName.trim();
    if (!next || next === team.name) { setDraftName(team.name); return; }
    onRename(next);
  };
  const S = styles;
  const isPicked = !!picked && !picked.player && norm(picked.name) === norm(team.name);
  const inFixture = (team.slots || []).length > 0;
  const setPlayer = (i, patch) => {
    const ps = clone(team.players || []);
    while (ps.length <= i) ps.push({ name: '', handicap: null });
    ps[i] = { ...ps[i], ...patch };
    onPlayers(ps);
  };
  // Typing a name that matches the club database pulls the handicap in with it,
  // which is the swap-out case: change the name, the handicap follows.
  const onName = (i, value) => {
    const rec = (playerDb || []).find(p => norm(p.name) === norm(value));
    setPlayer(i, rec && rec.handicap !== null && rec.handicap !== undefined
      ? { name: value, handicap: rec.handicap }
      : { name: value });
  };
  const rows = Math.max(4, (team.players || []).length);

  return (
    <div draggable onDragStart={onDragStart}
      style={{ ...S.team, ...(isPicked ? S.teamPicked : null) }}
      title="Drag into a match, or use ＋ to place it by tapping">
      <div style={S.teamHead} onClick={onToggle}>
        <ColourDot colour={colour} />
        <span style={S.teamName}>{team.name}</span>
        <span style={S.hcap}>{fmtH(squadHandicap(team)) || '—'}</span>
        <span style={S.apps} title={inFixture ? `Plays ${team.slots.length} matches in this fixture` : 'Not in this fixture yet'}>
          {inFixture ? `${team.slots.length}×` : 'unused'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setPicked(isPicked ? null : team); }}
          aria-pressed={isPicked}
          title={isPicked ? 'Tap a match slot to place it, or tap again to cancel' : 'Pick up, then tap a match slot'}
          style={{ ...S.pick, ...(isPicked ? S.pickOn : null) }}>{isPicked ? '✓' : '＋'}</button>
        <span style={S.caret}>{open ? '▾' : '▸'}</span>
      </div>
      {open ? (
        <div style={S.teamBody} onClick={e => e.stopPropagation()}>
          <input
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
              if (e.key === 'Escape') { setDraftName(team.name); e.currentTarget.blur(); }
            }}
            title="Rename the team — press Enter or tap away to save"
            style={{ ...S.inpFull, marginBottom: 6 }} />
          <datalist id="fb-players">
            {(playerDb || []).map(p => <option key={p.id} value={p.name} />)}
          </datalist>
          {Array.from({ length: rows }).map((_, i) => {
            const p = (team.players || [])[i] || {};
            return (
              <div key={i} style={S.pEdit}>
                <span style={S.shirt}>{i + 1}</span>
                <input list="fb-players" value={p.name || ''} onChange={e => onName(i, e.target.value)}
                  placeholder="Name" style={{ ...S.inpSm, flex: 1, minWidth: 0 }} />
                <NumField value={p.handicap} onCommit={(h) => setPlayer(i, { handicap: h })}
                  allowNegative placeholder="H" title="Handicap — a minus sign is allowed"
                  style={{ ...S.inpSm, width: 38, textAlign: 'center' }} />
              </div>
            );
          })}
          {teamColours && setColour && (
            <div style={S.swatches}>
              <span style={S.fieldLabel}>Shirts</span>
              {teamColours.map(c => (
                <button key={c.key} onClick={() => setColour(c.key === (colour && colour.key) ? null : c.key)}
                  aria-pressed={!!colour && colour.key === c.key} title={c.name}
                  style={{ ...S.swatch, background: c.hex,
                    ...(colour && colour.key === c.key ? S.swatchOn : null) }}>
                  <span style={S.srOnly}>{c.name}</span>
                </button>
              ))}
              {colour && (
                <button onClick={() => setColour(null)} style={S.linkClear} title="No shirt colour">clear</button>
              )}
            </div>
          )}
          <div style={S.teamFoot}>
            <span style={S.hint}>
              {inFixture
                ? `Edits apply to ${team.slots.length === 1 ? 'the one match' : `all ${team.slots.length} matches`} this team plays.`
                : 'Drag it onto a match slot to put it in this fixture.'}
            </span>
            {onDelete && (
              <button onClick={onDelete} style={S.linkDanger}
                title="Remove this team from the club directory">Delete</button>
            )}
          </div>
        </div>
      ) : (
        <ul style={S.teamList}>
          {(team.players || []).filter(p => (p.name || '').trim()).map((p, i) => (
            <li key={i} style={S.teamLi}>
              <span style={S.shirt}>{i + 1}</span>
              <span style={S.liName}>{p.name}</span>
              <span style={S.liH}>{fmtH(p.handicap)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── A team slot on a match ─────────────────────────────────────────────────
function Slot({ side, match, tk, di, mi, colour, over, setOver, dragged, assignTeam, updTeam, picked, setPicked }) {
  const S = styles;
  const team = match[tk] || {};
  const name = (team.name || '').trim();
  const key = `${di}:${mi}:${tk}`;

  // Shared by the mouse drop and the tap-to-place route, so the two can never
  // diverge in what they actually do to the match.
  const place = (payload) => {
    if (!payload) return;
    if (payload.player) {
      const ps = clone(team.players || []);
      const at = ps.findIndex(p => !(p.name || '').trim());
      const entry = { name: payload.player.name, handicap: payload.player.handicap ?? null };
      if (at >= 0) ps[at] = entry; else ps.push(entry);
      updTeam(di, mi, tk, t => ({ ...t, players: ps }));
    } else {
      assignTeam(di, mi, tk, payload);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setOver(null);
    const payload = dragged.current;
    dragged.current = null;
    place(payload);
  };

  // iPadOS never fires dragstart from a finger — HTML5 drag-and-drop is
  // mouse-only there — so on a tablet the rail could not be used at all, even
  // though the board deliberately renders at that size (the desktop breakpoint
  // is 1024px; an iPad in landscape is 1180-1366). Tap a team, then tap a slot.
  const onClick = () => {
    if (!picked) return;
    place(picked);
    setPicked(null);
  };

  const base = side === 'A' ? S.slotA : S.slotB;
  const tint = colour ? { background: colour.hex, color: colour.text, borderColor: colour.hex } : null;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(key); }}
      onDragLeave={() => setOver(null)}
      onDrop={onDrop}
      onClick={onClick}
      role={picked ? 'button' : undefined}
      aria-label={picked ? `Place ${picked.player ? picked.player.name : picked.name} here` : undefined}
      style={{ ...S.slot, ...base, ...(tint || {}), ...(name ? null : S.slotEmpty), ...(over ? S.slotOver : null), ...(picked ? S.slotArmed : null) }}
    >
      {name ? (
        <>
          <div style={S.slotHead}>
            <span style={S.slotName}>{name}</span>
            <span style={S.slotH}>{fmtH(squadHandicap(team))}</span>
            <button title="Clear this team" onClick={(e) => { e.stopPropagation(); updTeam(di, mi, tk, () => ({ name: '', handicap: null, players: [] })); }}
              style={S.slotX}>×</button>
          </div>
          <ol style={S.slotList}>
            {(team.players || []).filter(p => (p.name || '').trim()).map((p, i) => (
              <li key={i} style={S.slotLi}>
                <span style={S.shirt}>{i + 1}</span>
                <span style={S.liName}>{p.name}</span>
                <span style={S.liH}>{fmtH(p.handicap)}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <span style={S.slotHint}>{picked ? 'Tap to place here' : 'Drag a team here, or tap one in the rail'}</span>
      )}
    </div>
  );
}

function ColourDot({ colour }) {
  return <span aria-hidden="true" title={colour ? `Shirts: ${colour.name}` : 'No shirt colour set'}
    style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
      background: colour ? colour.hex : 'transparent',
      border: colour ? '1px solid rgba(0,0,0,0.25)' : '1px dashed var(--line)' }} />;
}
function Field({ label, children, stack }) {
  return (
    <div style={stack ? styles.fieldStack : styles.field}>
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
// Inline objects, matching how the rest of the app is written, and drawing on
// the same CSS variables so the board inherits the club palette.
const styles = {
  wrap: { position: 'fixed', inset: 0, zIndex: 50, background: 'var(--cream)', display: 'flex', flexDirection: 'column' },
  bar: { height: 54, flexShrink: 0, background: 'var(--burgundy)', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' },
  barName: { fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 500 },
  barLevel: { fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.75 },
  barDate: { fontSize: 11.5, opacity: 0.75 },
  chipDraft: { fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 99, background: 'rgba(251,180,21,0.18)', color: 'var(--gold-bright)' },
  chipLive: { fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 99, background: 'rgba(120,200,150,0.18)', color: '#8ed3a8' },

  shell: { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '300px minmax(0,1fr) 330px' },
  rail: { overflowY: 'auto', background: '#fff', borderRight: '1px solid var(--line)' },
  canvas: { overflowY: 'auto', padding: '0 20px 60px' },
  insp: { overflowY: 'auto', background: '#fff', borderLeft: '1px solid var(--line)' },

  tabs: { display: 'flex', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: '#fff', zIndex: 3 },
  tab: { flex: 1, padding: '11px 6px', border: 0, background: 'transparent', font: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', cursor: 'pointer', borderBottom: '2px solid transparent' },
  tabOn: { color: 'var(--ink)', borderBottomColor: 'var(--gold-bright)' },
  railBody: { padding: 12 },
  railHead: { fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, margin: '16px 0 7px' },

  team: { border: '1px solid var(--line)', borderRadius: 8, marginBottom: 8, background: '#fff', cursor: 'grab' },
  teamHead: { display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', cursor: 'pointer' },
  teamName: { fontWeight: 700, fontSize: 12.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  apps: { fontSize: 10, color: 'var(--muted)' },
  caret: { fontSize: 10, color: 'var(--muted)' },
  teamBody: { padding: '0 10px 10px', cursor: 'default' },
  teamList: { listStyle: 'none', margin: 0, padding: '0 10px 8px', display: 'flex', flexDirection: 'column', gap: 2 },
  teamLi: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 },
  pEdit: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 },
  teamFoot: { display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 2 },
  swatches: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, margin: '8px 0 2px' },
  swatch: { width: 17, height: 17, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.22)', padding: 0, cursor: 'pointer', flexShrink: 0 },
  swatchOn: { boxShadow: '0 0 0 2px var(--cream-pale), 0 0 0 4px var(--gold-bright)' },
  linkClear: { background: 'none', border: 0, padding: 0, font: 'inherit', fontSize: 10.5, color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' },
  addTeamBtn: { width: '100%', padding: '9px 10px', border: '1px dashed var(--line)', borderRadius: 8, background: 'transparent', font: 'inherit', fontSize: 12, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', marginBottom: 10 },
  newTeam: { border: '1px solid var(--gold-bright)', borderRadius: 8, padding: 10, marginBottom: 10, background: 'var(--cream-warm)', display: 'flex', flexDirection: 'column', gap: 7 },
  newTeamRow: { display: 'flex', gap: 6 },
  btnGoldSm: { font: 'inherit', fontSize: 11.5, fontWeight: 600, padding: '6px 11px', borderRadius: 6, border: '1px solid var(--gold-bright)', background: 'var(--gold-bright)', color: 'var(--ink)', cursor: 'pointer' },
  btnPlainSm: { font: 'inherit', fontSize: 11.5, padding: '6px 11px', borderRadius: 6, border: '1px solid var(--line)', background: '#fff', color: 'var(--muted)', cursor: 'pointer' },
  linkDanger: { background: 'none', border: 0, padding: 0, font: 'inherit', fontSize: 11, color: 'var(--danger)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, marginLeft: 'auto', flexShrink: 0 },
  dirTeam: { display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', border: '1px dashed var(--line)', borderRadius: 7, marginBottom: 6, cursor: 'grab' },
  dirName: { flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  search: { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, font: 'inherit', fontSize: 12, marginBottom: 6 },
  pRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderRadius: 5, cursor: 'grab', fontSize: 12 },
  pName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  dayTabs: { display: 'flex', alignItems: 'flex-end', gap: 4, padding: '12px 0 0', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--cream)', zIndex: 4 },
  dayTab: { padding: '8px 14px', border: '1px solid transparent', borderBottom: 0, borderRadius: '7px 7px 0 0', background: 'transparent', font: 'inherit', fontSize: 12, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', textAlign: 'left' },
  dayTabOn: { background: '#fff', borderColor: 'var(--line)', color: 'var(--ink)' },
  dayTabSub: { display: 'block', fontWeight: 500, fontSize: 10, color: 'var(--muted)' },
  dayMeta: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 0 12px' },

  match: { background: '#fff', border: '1px solid var(--line)', borderRadius: 9, marginBottom: 10, cursor: 'pointer' },
  matchSel: { borderColor: 'var(--gold-bright)', boxShadow: '0 0 0 3px rgba(251,180,21,0.15)' },
  mHead: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' },
  slots: { display: 'grid', gridTemplateColumns: '1fr 78px 1fr', padding: '10px 12px 12px', alignItems: 'stretch' },
  slot: { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', minHeight: 104 },
  slotA: { background: 'var(--white-team)', borderColor: 'var(--white-team-border)' },
  slotB: { background: 'var(--blue)', color: '#fff', borderColor: 'var(--blue)' },
  slotEmpty: { background: 'var(--cream-warm)', borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' },
  slotOver: { borderColor: 'var(--gold-bright)', boxShadow: 'inset 0 0 0 2px rgba(251,180,21,0.35)' },
  slotArmed: { outline: '2px dashed var(--gold-bright)', outlineOffset: 2, cursor: 'pointer' },
  pick: { border: '1px solid var(--line)', background: '#fff', borderRadius: 5, width: 22, height: 22, lineHeight: '18px', padding: 0, font: 'inherit', fontSize: 13, color: 'var(--muted)', cursor: 'pointer', flexShrink: 0 },
  pickOn: { background: 'var(--gold-bright)', borderColor: 'var(--gold-bright)', color: '#3a2d05', fontWeight: 700 },
  teamPicked: { boxShadow: '0 0 0 2px var(--gold-bright)' },
  pickedRow: { boxShadow: 'inset 0 0 0 2px var(--gold-bright)' },
  placing: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', margin: '0 0 6px', borderRadius: 6, background: 'rgba(251,180,21,0.16)', border: '1px solid var(--gold-bright)', fontSize: 11.5 },
  slotHead: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  slotName: { fontWeight: 700, fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  slotH: { fontSize: 11, fontWeight: 700 },
  slotX: { background: 'none', border: 0, color: 'inherit', opacity: 0.5, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' },
  slotList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  slotLi: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 },
  slotHint: { fontSize: 11.5 },
  shirt: { fontSize: 9.5, width: 12, opacity: 0.6, flexShrink: 0 },
  liName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  liH: { fontSize: 10.5, opacity: 0.7 },
  vs: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 },
  vsV: { fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic', fontSize: 13, color: 'var(--muted)' },
  vsHs: { fontSize: 10, fontWeight: 700, color: 'var(--gold)', textAlign: 'center', lineHeight: 1.25 },
  offs: { padding: '0 12px 10px', fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 14, flexWrap: 'wrap' },
  offsB: { color: 'var(--ink)', fontWeight: 600 },

  addRow: { display: 'flex', gap: 8, margin: '4px 0 20px' },
  addBtn: { flex: 1, padding: 10, border: '1px dashed var(--line)', borderRadius: 8, background: 'transparent', font: 'inherit', fontSize: 12, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer' },
  empty: { padding: '48px 0', textAlign: 'center' },

  inspHead: { padding: '13px 15px', borderBottom: '1px solid var(--line)', fontSize: 11, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, position: 'sticky', top: 0, background: '#fff', zIndex: 3 },
  section: { padding: '13px 15px', borderBottom: '1px solid var(--line)' },
  sectionH: { fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, margin: '0 0 9px', fontWeight: 600 },
  field: { display: 'flex', alignItems: 'center', gap: 6 },
  fieldStack: { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 },
  fieldLabel: { fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 },
  two: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '5px 0', cursor: 'pointer' },
  cbox: { width: 15, height: 15, accentColor: 'var(--burgundy)' },
  hint: { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, margin: '6px 0 0' },
  bannerOk: { fontSize: 11.5, lineHeight: 1.5, padding: '9px 11px', borderRadius: 7, background: '#eef5f0', border: '1px solid #cfe3d6', color: '#2e6f4e' },
  bannerWarn: { fontSize: 11.5, lineHeight: 1.5, padding: '9px 11px', borderRadius: 7, background: 'var(--cream-warm)', border: '1px solid var(--line)', color: 'var(--ink)' },

  inp: { font: 'inherit', fontSize: 12.5, padding: '6px 9px', border: '1px solid var(--line)', borderRadius: 6, background: '#fff', color: 'var(--ink)' },
  inpSm: { font: 'inherit', fontSize: 12, padding: '5px 7px', border: '1px solid var(--line)', borderRadius: 5, background: '#fff', color: 'var(--ink)' },
  inpFull: { font: 'inherit', fontSize: 12.5, padding: '6px 9px', border: '1px solid var(--line)', borderRadius: 6, background: '#fff', color: 'var(--ink)', width: '100%' },
  hcap: { fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--cream-warm)', flexShrink: 0 },

  btnGold: { font: 'inherit', fontSize: 12, fontWeight: 600, padding: '7px 13px', borderRadius: 6, border: '1px solid var(--gold-bright)', background: 'var(--gold-bright)', color: 'var(--ink)', cursor: 'pointer' },
  btnGhost: { font: 'inherit', fontSize: 12, fontWeight: 600, padding: '7px 13px', borderRadius: 6, border: '1px solid rgba(250,249,247,0.3)', background: 'transparent', color: 'var(--cream)', cursor: 'pointer' },
  btnDanger: { font: 'inherit', fontSize: 11, padding: '6px 11px', borderRadius: 6, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' },
  iconBtn: { background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '2px 4px' },
  iconDanger: { background: 'none', border: 0, color: 'var(--danger)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '2px 4px' },
};
