import { generateTournamentPdf } from '../src/tournamentPdf.js';
window.__run = () => generateTournamentPdf(
  { id: 'oct-17', month: 'October', date: 'Sat 17 & Sun 18 October', name: 'Clock Tower Trophy', level: 'Open' },
  { days: [{ id: 'sat', dateLabel: 'Saturday 17th October', ground: 'Main Ground', prizegiving: true,
    matches: [{ id: 'm1', time: '11:00', label: 'Semi-Final', chukkas: 4,
      teamA: { name: 'Druids Lodge', handicap: 2, players: [
        { name: 'A. Smith', handicap: 1, shirtNo: 1 }, { name: 'B. Jones', handicap: 1, shirtNo: 2 },
        { name: 'C. Brown', handicap: 0, shirtNo: 3 }, { name: 'D. Green', handicap: 0, shirtNo: 4 }] },
      teamB: { name: 'Stonehenge', handicap: 1, players: [
        { name: 'E. White', handicap: 1, shirtNo: 1 }, { name: 'F. Black', handicap: 0, shirtNo: 2 },
        { name: 'G. Grey', handicap: 0, shirtNo: 3 }, { name: 'H. Gold', handicap: 0, shirtNo: 4 }] },
      umpires: 'A. Umpire & B. Umpire', notes: '', scoreA: 5, scoreB: 3 }] }] });
window.__ready = true;
