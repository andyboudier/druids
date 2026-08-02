//
//  ContentView.swift
//  DLPC Watch Watch App
//

import SwiftUI
import Combine
import Foundation

// MARK: - Day

enum ChukkaDay: String, CaseIterable, Identifiable {
    // Druids club chukkas: Thursday 17:30, Saturday 11:00, Sunday 11:00.
    // Keep in step with DAY_KEYS in src/DruidsApp.jsx.
    case thu, sat, sun

    var id: String { rawValue }

    var label: String {
        switch self {
        case .thu: return "Thu"
        case .sat: return "Sat"
        case .sun: return "Sun"
        }
    }

    var fullLabel: String {
        switch self {
        case .thu: return "Thursday"
        case .sat: return "Saturday"
        case .sun: return "Sunday"
        }
    }

    // Matches the app's storageKey() scheme: every day is suffixed.
    var scheduleKey: String { "schedule-\(rawValue)" }
    var rosterKey: String { "roster-\(rawValue)" }

    static func upcoming() -> ChukkaDay {
        // Calendar weekday: 1 = Sunday … 7 = Saturday.
        switch Calendar.current.component(.weekday, from: Date()) {
        case 1:       return .sun
        case 2, 3, 4: return .thu   // Mon–Wed look ahead to Thursday
        case 5:       return .thu
        default:      return .sat   // Fri, Sat
        }
    }
}

// MARK: - Models (match the JSON the web app stores)

struct Player: Codable, Identifiable {
    var id = UUID()
    let name: String
    let handicap: Int?

    enum CodingKeys: String, CodingKey { case name, handicap }

    var display: String {
        if let handicap { return "\(name)  (\(handicap))" }
        return name
    }
}

struct Chukka: Codable, Identifiable {
    let number: Int
    let time: String
    let teamA: [Player]
    let teamB: [Player]

    var id: Int { number }
}

struct Schedule: Codable {
    let chukkas: [Chukka]
}

// MARK: - Firestore REST envelope

private struct FirestoreDocument: Decodable {
    let fields: Fields?
    struct Fields: Decodable { let value: StringValue? }
    struct StringValue: Decodable { let stringValue: String? }
}

// MARK: - Data store (Firestore REST API — no SDK needed)

enum LoadState {
    case loading
    case schedule(Schedule)
    case roster([Player])
    case empty
    case error(String)
}

private let kProjectID = "druids-lodge-polo"
private let kApiKey = "AIzaSyBEPZpBeZLmUQdtzGCY7UCIwnGzP8f1xpQ"

/// Fetches one `shared/<key>` document and returns the inner JSON object the web
/// app stored (already unwrapped from the Firestore string-field envelope), or
/// nil for a missing document.
private func fetchSharedJSON(key: String) async throws -> Any? {
    let path = "https://firestore.googleapis.com/v1/projects/\(kProjectID)/databases/(default)/documents/shared/\(key)?key=\(kApiKey)"
    guard let url = URL(string: path) else { return nil }
    let (data, response) = try await URLSession.shared.data(from: url)
    guard let http = response as? HTTPURLResponse else { return nil }
    if http.statusCode == 404 { return nil }
    guard http.statusCode == 200 else { return nil }
    guard let env = try JSONSerialization.jsonObject(with: data) as? [String: Any],
          let fields = env["fields"] as? [String: Any],
          let value = fields["value"] as? [String: Any],
          let s = value["stringValue"] as? String,
          let inner = s.data(using: .utf8) else { return nil }
    return try JSONSerialization.jsonObject(with: inner)
}

@MainActor
final class ChukkaStore: ObservableObject {
    @Published var state: LoadState

    init() {
        state = .loading
    }

    func load(day: ChukkaDay) {
        state = .loading
        Task { await fetch(day: day) }
    }

    private func fetch(day: ChukkaDay) async {
        do {
            if let schedule = try await getDocument(Schedule.self, key: day.scheduleKey),
               !schedule.chukkas.isEmpty {
                state = .schedule(schedule)
                return
            }
            if let players = try await getDocument([Player].self, key: day.rosterKey),
               !players.isEmpty {
                state = .roster(players)
                return
            }
            state = .empty
        } catch {
            state = .error("No connection")
        }
    }

    private func getDocument<T: Decodable>(_ type: T.Type, key: String) async throws -> T? {
        let path = "https://firestore.googleapis.com/v1/projects/\(kProjectID)/databases/(default)/documents/shared/\(key)?key=\(kApiKey)"
        guard let url = URL(string: path) else { return nil }

        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse else { return nil }
        if http.statusCode == 404 { return nil }
        guard http.statusCode == 200 else { return nil }

        let document = try JSONDecoder().decode(FirestoreDocument.self, from: data)
        guard let inner = document.fields?.value?.stringValue,
              let innerData = inner.data(using: .utf8) else { return nil }
        return try JSONDecoder().decode(T.self, from: innerData)
    }
}

// MARK: - Root view (Chukkas | Live)

enum AppTab { case chukkas, live }

struct ContentView: View {
    @State private var tab: AppTab = .chukkas

    var body: some View {
        NavigationStack {
            VStack(spacing: 5) {
                TopTabs(selection: $tab)
                switch tab {
                case .chukkas: ChukkasScreen()
                case .live:    LiveScreen()
                }
            }
            .navigationTitle(tab == .live ? "Live" : "Chukkas")
        }
    }
}

struct TopTabs: View {
    @Binding var selection: AppTab
    private let clubGold = Color(red: 0.992, green: 0.710, blue: 0.082)  // #FDB515

    var body: some View {
        HStack(spacing: 3) {
            pill("Chukkas", .chukkas)
            pill("Live", .live)
        }
        .padding(.horizontal, 4)
    }

    @ViewBuilder
    private func pill(_ title: String, _ value: AppTab) -> some View {
        Button { selection = value } label: {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
        .background(selection == value ? clubGold : Color.gray.opacity(0.25))
        .foregroundColor(selection == value ? .white : .gray)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

// MARK: - Chukkas screen (the per-day draw)

struct ChukkasScreen: View {
    @StateObject private var store = ChukkaStore()
    @State private var day: ChukkaDay = ChukkaDay.upcoming()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        VStack(spacing: 5) {
            DayPicker(day: $day)
            ScrollView { content }
        }
        .onChange(of: scenePhase, initial: true) {
            if scenePhase == .active { store.load(day: day) }
        }
        .onChange(of: day) { store.load(day: day) }
    }

    @ViewBuilder
    private var content: some View {
        switch store.state {
        case .loading:
            ProgressView().padding(.top, 24)
        case .error(let message):
            MessageView(title: "Couldn't load", detail: message)
        case .empty:
            MessageView(title: "Nothing booked",
                        detail: "No one is on the \(day.fullLabel) roster yet.")
        case .roster(let players):
            RosterView(players: players, day: day)
        case .schedule(let schedule):
            VStack(spacing: 6) {
                ForEach(schedule.chukkas) { ChukkaCard(chukka: $0) }
            }
            .padding(.horizontal, 4)
            .padding(.bottom, 8)
        }
    }
}

// MARK: - Day picker

struct DayPicker: View {
    @Binding var day: ChukkaDay
    private let clubGold = Color(red: 0.992, green: 0.710, blue: 0.082)  // #FDB515

    var body: some View {
        HStack(spacing: 3) {
            ForEach(ChukkaDay.allCases) { option in
                Button {
                    day = option
                } label: {
                    Text(option.label)
                        .font(.system(size: 12, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                }
                .buttonStyle(.plain)
                .background(day == option ? clubGold : Color.gray.opacity(0.25))
                .foregroundColor(day == option ? .white : .gray)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }
        }
        .padding(.horizontal, 4)
    }
}

// MARK: - Chukka card

struct ChukkaCard: View {
    let chukka: Chukka

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Chukka \(chukka.number)")
                    .font(.system(size: 14, weight: .bold))
                Spacer()
                Text(chukka.time)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            TeamRow(label: "Blue", players: chukka.teamA, color: .blue)
            TeamRow(label: "White", players: chukka.teamB, color: .white)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.gray.opacity(0.18))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct TeamRow: View {
    let label: String
    let players: [Player]
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                Circle()
                    .fill(color)
                    .frame(width: 7, height: 7)
                Text(label)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(color)
            }
            if players.isEmpty {
                Text("—").font(.system(size: 12)).foregroundColor(.secondary)
            } else {
                ForEach(players) { player in
                    Text(player.display).font(.system(size: 12))
                }
            }
        }
    }
}

// MARK: - Roster fallback

struct RosterView: View {
    let players: [Player]
    let day: ChukkaDay

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Draw not published yet")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.orange)
            Text("\(players.count) booked for \(day.fullLabel):")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
            ForEach(players) { player in
                Text(player.display).font(.system(size: 13))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 8)
        .padding(.bottom, 8)
    }
}

// MARK: - Message view

struct MessageView: View {
    let title: String
    let detail: String

    var body: some View {
        VStack(spacing: 6) {
            Text(title).font(.system(size: 14, weight: .semibold))
            Text(detail)
                .font(.system(size: 12))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .padding(.top, 12)
    }
}

// MARK: - Live game models (mirror fixtureDetails[fixtureId].days[].matches[])

struct LivePlayer: Identifiable {
    let id = UUID()
    let name: String
    let handicap: Double?
    let goals: Double?
    let shirtNo: String?
}

struct LiveTeam {
    let name: String
    let handicap: Double?
    let players: [LivePlayer]
}

struct LiveMatch: Identifiable {
    let id: String
    let time: String?
    let label: String?
    let scoreA: Double?
    let scoreB: Double?
    let chukkas: Double?
    let ended: Bool
    let currentChukka: Int      // chukka in play (1-based); 0 = not started
    let teamA: LiveTeam
    let teamB: LiveTeam

    /// A raw score has been entered = the game is being / has been scored.
    var hasScore: Bool { scoreA != nil || scoreB != nil }
    /// A chukka is under way and the game hasn't been marked full-time.
    var isLive: Bool { currentChukka > 0 && !ended }
}

struct LiveGameItem: Identifiable {
    let id: String           // fixtureId|dayId|matchId
    let fixtureName: String
    let dateLabel: String?
    let ground: String?
    let match: LiveMatch
}

// MARK: - Lenient JSON helpers

private func anyNum(_ v: Any?) -> Double? {
    if let d = v as? Double { return d }
    if let i = v as? Int { return Double(i) }
    if let n = v as? NSNumber { return n.doubleValue }
    if let s = v as? String { return Double(s) }
    return nil
}

private func anyStr(_ v: Any?) -> String? {
    if let s = v as? String { return s }
    if let n = v as? NSNumber { return n.stringValue }
    return nil
}

private func nm(_ s: String, _ fallback: String) -> String { s.isEmpty ? fallback : s }

// MARK: - Shirt numbers, team handicap & line-up order (port the web app)

/// Leading-integer parse, mirroring JS parseInt("3A", 10) == 3 and
/// parseInt("A", 10) == NaN. Returns nil when there's no leading digit.
private func leadingInt(_ s: String?) -> Int? {
    guard let s = s else { return nil }
    var digits = ""
    for ch in s.trimmingCharacters(in: .whitespaces) {
        if ch.isNumber { digits.append(ch) } else { break }
    }
    return Int(digits)
}

/// Authoritative team handicap = sum of the four playing players' handicaps.
/// The playing four are the players wearing shirts 1–4 when at least four
/// shirt numbers are allocated; otherwise the four highest handicaps. Falls
/// back to the stored team handicap. Ports tournamentPdf.js `teamHandicap`.
private func liveTeamHandicap(_ t: LiveTeam) -> Double? {
    let players = t.players
    let numbered = players
        .map { (p: $0, no: leadingInt($0.shirtNo)) }
        .filter { ($0.no ?? 0) >= 1 }
    let counted: [LivePlayer]
    if numbered.count >= 4 {
        counted = numbered.sorted { ($0.no ?? 0) < ($1.no ?? 0) }.prefix(4).map { $0.p }
    } else {
        counted = players.sorted { ($0.handicap ?? -.infinity) > ($1.handicap ?? -.infinity) }.prefix(4).map { $0 }
    }
    let hs = counted.compactMap { $0.handicap }
    if !hs.isEmpty { return hs.reduce(0, +) }
    return t.handicap
}

/// Line-up order: ascending by shirt number once allocated; unnumbered players
/// keep their original order at the end. Stable. Mirrors the phone's live list.
private func orderedLivePlayers(_ players: [LivePlayer]) -> [LivePlayer] {
    func key(_ p: LivePlayer) -> (empty: Bool, num: Int, str: String) {
        let s = (p.shirtNo ?? "").trimmingCharacters(in: .whitespaces)
        if s.isEmpty { return (true, Int.max, "") }
        return (false, leadingInt(s) ?? Int.max, s)
    }
    return players.enumerated().sorted { a, b in
        let ka = key(a.element), kb = key(b.element)
        if ka.empty != kb.empty { return !ka.empty }           // numbered before blank
        if ka.empty && kb.empty { return a.offset < b.offset }  // blanks keep order
        if ka.num != kb.num { return ka.num < kb.num }          // numeric ascending
        if ka.str != kb.str { return ka.str < kb.str }          // then lexical
        return a.offset < b.offset                               // stable tie-break
    }.map { $0.element }
}

private func ordinalShort(_ n: Int) -> String {
    let suffix: String
    if (n % 100) >= 11 && (n % 100) <= 13 {
        suffix = "th"
    } else {
        switch n % 10 {
        case 1: suffix = "st"
        case 2: suffix = "nd"
        case 3: suffix = "rd"
        default: suffix = "th"
        }
    }
    return "\(n)\(suffix)"
}

/// "Full time", "2nd chukka", or nil when the game hasn't started.
private func matchStatus(_ m: LiveMatch) -> String? {
    if m.ended { return "Full time" }
    if m.currentChukka > 0 { return "\(ordinalShort(m.currentChukka)) chukka" }
    return nil
}

// MARK: - Handicap head-start (ports the web app's liveDisplayScore)

private func matchChukkas(_ m: LiveMatch) -> Double {
    let c = m.chukkas ?? 0
    return c > 0 ? c : 4
}

/// Goals given to the lower-handicap team: (|hA - hB| * chukkas) / 6, any
/// fraction counted as half a goal. Returned for the requested side only.
private func headStart(_ m: LiveMatch, teamA: Bool) -> Double {
    let hA = liveTeamHandicap(m.teamA) ?? 0
    let hB = liveTeamHandicap(m.teamB) ?? 0
    if hA == hB { return 0 }
    let units = abs(hA - hB) * matchChukkas(m)
    let whole = floor(units / 6)
    let goals = whole + (units.truncatingRemainder(dividingBy: 6) > 0 ? 0.5 : 0)
    let lowerIsA = hA < hB
    return (teamA == lowerIsA) ? goals : 0
}

private func displayScore(_ m: LiveMatch, teamA: Bool) -> Double {
    ((teamA ? m.scoreA : m.scoreB) ?? 0) + headStart(m, teamA: teamA)
}

private func fmtHalf(_ n: Double) -> String {
    let whole = Int(floor(n))
    let half = (n - floor(n)) >= 0.5
    if half { return whole == 0 ? "½" : "\(whole)½" }
    return "\(whole)"
}

private func fmtNum(_ n: Double?) -> String? {
    guard let n else { return nil }
    return n == n.rounded() ? String(Int(n)) : String(n)
}

// True when a day label like "Saturday 30th May" / "Sun 7 June" falls on the
// device's current date (day-of-month + month; year is absent from labels).
private let liveMonthNames = ["january", "february", "march", "april", "may", "june",
                              "july", "august", "september", "october", "november", "december"]
private func isLabelToday(_ label: String?) -> Bool {
    guard let raw = label?.lowercased(), !raw.isEmpty else { return false }
    var month: Int? = nil
    for (i, m) in liveMonthNames.enumerated() {
        if raw.range(of: m) != nil || raw.range(of: String(m.prefix(3))) != nil { month = i + 1; break }
    }
    var digits = ""
    for ch in raw {
        if ch.isNumber { digits.append(ch); if digits.count == 2 { break } }
        else if !digits.isEmpty { break }
    }
    guard let mo = month, let dy = Int(digits), dy >= 1, dy <= 31 else { return false }
    let comp = Calendar.current.dateComponents([.day, .month], from: Date())
    return comp.day == dy && comp.month == mo
}

// MARK: - Live store

@MainActor
final class LiveStore: ObservableObject {
    enum Phase { case loading, loaded, error(String) }
    @Published var phase: Phase = .loading
    @Published var items: [LiveGameItem] = []

    func load() { Task { await fetch() } }

    private func fetch() async {
        do {
            async let detailsTask = fetchSharedJSON(key: "fixture-details")
            async let fixturesTask = fetchSharedJSON(key: "fixtures")
            let details = try await detailsTask
            let fixtures = try await fixturesTask
            let names = parseFixtureNames(fixtures)
            items = parseDetails(details, names: names)
            phase = .loaded
        } catch {
            phase = .error("No connection")
        }
    }

    private func parseFixtureNames(_ raw: Any?) -> [String: String] {
        var map: [String: String] = [:]
        if let arr = raw as? [[String: Any]] {
            for f in arr {
                if let id = anyStr(f["id"]) { map[id] = anyStr(f["name"]) ?? id }
            }
        }
        return map
    }

    private func parseTeam(_ t: Any?) -> LiveTeam {
        guard let obj = t as? [String: Any] else {
            return LiveTeam(name: "", handicap: nil, players: [])
        }
        let players = (obj["players"] as? [[String: Any]] ?? []).map {
            LivePlayer(name: anyStr($0["name"]) ?? "",
                       handicap: anyNum($0["handicap"]),
                       goals: anyNum($0["goals"]),
                       shirtNo: anyStr($0["shirtNo"]))
        }
        return LiveTeam(name: anyStr(obj["name"]) ?? "",
                        handicap: anyNum(obj["handicap"]),
                        players: players)
    }

    private func parseMatch(_ m: [String: Any]) -> LiveMatch {
        // liveChukka is either the string "ended" (full time) or a chukka number
        // (0 = not started). Mirrors the phone's curMatch.liveChukka.
        let lc = m["liveChukka"]
        let ended = (anyStr(lc)?.lowercased() == "ended")
        let curCk = ended ? 0 : max(0, Int(anyNum(lc) ?? 0))
        return LiveMatch(id: anyStr(m["id"]) ?? UUID().uuidString,
                  time: anyStr(m["time"]),
                  label: anyStr(m["label"]),
                  scoreA: anyNum(m["scoreA"]),
                  scoreB: anyNum(m["scoreB"]),
                  chukkas: anyNum(m["chukkas"]),
                  ended: ended,
                  currentChukka: curCk,
                  teamA: parseTeam(m["teamA"]),
                  teamB: parseTeam(m["teamB"]))
    }

    private func parseDetails(_ raw: Any?, names: [String: String]) -> [LiveGameItem] {
        guard let dict = raw as? [String: Any] else { return [] }
        var out: [LiveGameItem] = []
        for (fid, fv) in dict {
            guard let fobj = fv as? [String: Any] else { continue }
            let fixtureName = names[fid] ?? "Fixture"
            let days = fobj["days"] as? [[String: Any]] ?? []
            for d in days {
                let dayId = anyStr(d["id"]) ?? UUID().uuidString
                let dateLabel = anyStr(d["dateLabel"])
                let ground = anyStr(d["ground"])
                let matches = d["matches"] as? [[String: Any]] ?? []
                for mraw in matches {
                    let match = parseMatch(mraw)
                    out.append(LiveGameItem(id: "\(fid)|\(dayId)|\(match.id)",
                                            fixtureName: fixtureName,
                                            dateLabel: dateLabel,
                                            ground: ground,
                                            match: match))
                }
            }
        }
        out.sort { a, b in
            if a.match.hasScore != b.match.hasScore { return a.match.hasScore }
            let da = a.dateLabel ?? "", db = b.dateLabel ?? ""
            if da != db { return da < db }
            return (a.match.time ?? "") < (b.match.time ?? "")
        }
        return out
    }
}

// MARK: - Live screen

struct LiveScreen: View {
    @StateObject private var store = LiveStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ScrollView { content }
            .onChange(of: scenePhase, initial: true) {
                if scenePhase == .active { store.load() }
            }
            .task {
                // Light auto-refresh while the Live screen is visible.
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 20_000_000_000)
                    if Task.isCancelled { break }
                    store.load()
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        switch store.phase {
        case .loading:
            ProgressView().padding(.top, 24)
        case .error(let message):
            MessageView(title: "Couldn't load", detail: message)
        case .loaded:
            let todays = store.items.filter { isLabelToday($0.dateLabel) }
            if todays.isEmpty {
                MessageView(title: "No games today",
                            detail: "Only matches scheduled for today appear here.")
            } else {
                let inPlay = todays.filter { !$0.match.ended && ($0.match.isLive || $0.match.hasScore) }
                let fullTime = todays.filter { $0.match.ended }
                let notStarted = todays.filter { !$0.match.ended && !$0.match.isLive && !$0.match.hasScore }
                VStack(spacing: 6) {
                    if !inPlay.isEmpty {
                        SectionLabel("In play")
                        ForEach(inPlay) { item in
                            NavigationLink { LiveDetail(item: item) } label: { LiveCard(item: item) }
                                .buttonStyle(.plain)
                        }
                    }
                    if !fullTime.isEmpty {
                        SectionLabel("Full time")
                        ForEach(fullTime) { item in
                            NavigationLink { LiveDetail(item: item) } label: { LiveCard(item: item) }
                                .buttonStyle(.plain)
                        }
                    }
                    if !notStarted.isEmpty {
                        SectionLabel(inPlay.isEmpty && fullTime.isEmpty ? "Fixtures" : "Not started")
                        ForEach(notStarted) { item in
                            NavigationLink { LiveDetail(item: item) } label: { LiveCard(item: item) }
                                .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 4)
                .padding(.bottom, 8)
            }
        }
    }
}

struct SectionLabel: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 9, weight: .semibold))
            .foregroundColor(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 2)
    }
}

struct LiveCard: View {
    let item: LiveGameItem

    var body: some View {
        let m = item.match
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Text(item.fixtureName)
                    .font(.system(size: 11, weight: .semibold))
                    .lineLimit(1)
                Spacer()
                if m.isLive { Circle().fill(Color.red).frame(width: 6, height: 6) }
            }
            if let label = m.label, !label.isEmpty {
                Text(label + (m.time.map { " · \($0)" } ?? ""))
                    .font(.system(size: 10)).foregroundColor(.secondary).lineLimit(1)
            } else if let t = m.time {
                Text(t).font(.system(size: 10)).foregroundColor(.secondary)
            }
            if let st = matchStatus(m) {
                Text(st.uppercased())
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(m.ended ? .secondary : .green)
                    .lineLimit(1)
            }
            HStack(spacing: 6) {
                Text(nm(m.teamA.name, "Blue"))
                    .font(.system(size: 12, weight: .medium)).foregroundColor(.blue)
                    .lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                if m.hasScore || m.isLive || m.ended {
                    Text("\(fmtHalf(displayScore(m, teamA: true)))–\(fmtHalf(displayScore(m, teamA: false)))")
                        .font(.system(size: 14, weight: .bold)).monospacedDigit()
                } else {
                    Text("v").font(.system(size: 11)).foregroundColor(.secondary)
                }
                Text(nm(m.teamB.name, "White"))
                    .font(.system(size: 12, weight: .medium))
                    .lineLimit(1).frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.gray.opacity(0.18))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct LiveDetail: View {
    let item: LiveGameItem

    var body: some View {
        let m = item.match
        let hsA = headStart(m, teamA: true)
        let hsB = headStart(m, teamA: false)
        ScrollView {
            VStack(spacing: 8) {
                Text(item.fixtureName)
                    .font(.system(size: 13, weight: .bold))
                    .multilineTextAlignment(.center)
                if let dl = item.dateLabel {
                    Text(dl + (item.ground.map { " · \($0)" } ?? ""))
                        .font(.system(size: 10)).foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                if let label = m.label, !label.isEmpty {
                    Text(label).font(.system(size: 11, weight: .semibold)).foregroundColor(.orange)
                }
                if let st = matchStatus(m) {
                    Text(st.uppercased())
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(m.ended ? .secondary : .green)
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background((m.ended ? Color.secondary : Color.green).opacity(0.18))
                        .clipShape(Capsule())
                }

                HStack(alignment: .top, spacing: 8) {
                    VStack(spacing: 2) {
                        Text(nm(m.teamA.name, "Blue"))
                            .font(.system(size: 11, weight: .semibold)).foregroundColor(.blue)
                            .lineLimit(2).multilineTextAlignment(.center)
                        Text(fmtHalf(displayScore(m, teamA: true)))
                            .font(.system(size: 30, weight: .bold)).monospacedDigit()
                    }
                    .frame(maxWidth: .infinity)
                    Text("–").font(.system(size: 20, weight: .bold)).foregroundColor(.secondary)
                    VStack(spacing: 2) {
                        Text(nm(m.teamB.name, "White"))
                            .font(.system(size: 11, weight: .semibold))
                            .lineLimit(2).multilineTextAlignment(.center)
                        Text(fmtHalf(displayScore(m, teamA: false)))
                            .font(.system(size: 30, weight: .bold)).monospacedDigit()
                    }
                    .frame(maxWidth: .infinity)
                }

                if hsA > 0 || hsB > 0 {
                    let side = hsA > 0 ? nm(m.teamA.name, "Blue") : nm(m.teamB.name, "White")
                    Text("incl. \(fmtHalf(max(hsA, hsB))) on handicap to \(side)")
                        .font(.system(size: 9)).foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }

                PlayerGoals(team: m.teamA, fallback: "Blue", color: .blue, onColor: .white)
                PlayerGoals(team: m.teamB, fallback: "White", color: .white, onColor: .black)

                if !m.hasScore && !m.isLive && !m.ended {
                    Text("Not started yet").font(.system(size: 10)).foregroundColor(.secondary)
                }
            }
            .padding(8)
        }
        .navigationTitle("Live")
    }
}

struct PlayerGoals: View {
    let team: LiveTeam
    let fallback: String
    let color: Color
    let onColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Circle().fill(color).frame(width: 7, height: 7)
                Text(nm(team.name, fallback))
                    .font(.system(size: 11, weight: .semibold)).foregroundColor(color)
                if let h = fmtNum(liveTeamHandicap(team)) {
                    Spacer()
                    Text("h'cap \(h)").font(.system(size: 9)).foregroundColor(.secondary)
                }
            }
            if team.players.isEmpty {
                Text("—").font(.system(size: 11)).foregroundColor(.secondary)
            } else {
                ForEach(orderedLivePlayers(team.players)) { p in
                    HStack(spacing: 5) {
                        if let s = p.shirtNo, !s.trimmingCharacters(in: .whitespaces).isEmpty {
                            Text(s)
                                .font(.system(size: 10, weight: .bold)).monospacedDigit()
                                .foregroundColor(onColor)
                                .frame(width: 16, height: 16)
                                .background(color)
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.black.opacity(0.2), lineWidth: 0.5))
                        }
                        Text(nm(p.name, "—")).font(.system(size: 12)).lineLimit(1)
                        Spacer()
                        if let g = fmtNum(p.goals), g != "0" {
                            Text(g).font(.system(size: 12, weight: .semibold)).foregroundColor(.orange)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(Color.gray.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
