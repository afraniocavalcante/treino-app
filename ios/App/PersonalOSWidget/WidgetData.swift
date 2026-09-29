import Foundation

// Espelha exatamente o JSON de GET /api/widget-data (ver
// scripts/widget-data.source.ts, a fonte de verdade dessa forma).
// Codable (não só Decodable) porque WidgetCache precisa salvar isso de volta
// em disco pra reaparecer instantaneamente logo após um toque — ver o
// comentário em WidgetCache.swift.

struct WidgetRing: Codable {
    var done: Double
    var total: Double

    var fraction: Double { total > 0 ? min(1, done / total) : 0 }
    var label: String { "\(Int(done))/\(Int(total))" }
}

struct WidgetRings: Codable {
    var treino: WidgetRing
    var refeicoes: WidgetRing
    var suplementos: WidgetRing
}

struct WidgetStreak: Codable {
    var days: Int
    var todayFullyDone: Bool
}

struct WidgetTrip: Codable {
    var city: String
    var daysAway: Int
    var carrier: String
    var flightNumber: String
}

enum WidgetEventKind: String, Codable {
    case treino
    case meal
    case suplemento

    var icon: String {
        switch self {
        case .treino: return "dumbbell.fill"
        case .meal: return "fork.knife"
        case .suplemento: return "pills.fill"
        }
    }
}

struct BuilderGroup: Codable {
    var key: String
    var title: String
    var items: [String]
}

struct WidgetEvent: Codable, Identifiable {
    var time: String
    var title: String
    var sub: String
    var kind: WidgetEventKind
    var done: Bool
    // Suplemento: a key que toggleSupplement espera de volta.
    // Refeição "list" pendente (café/lanche/jantar/sobremesa): a key que
    // pickMealOption espera de volta. Refeição "builder" pendente (almoço):
    // a própria key. Fora isso (treino, já concluída): nil.
    var key: String?
    // Só em refeições "list" pendentes — os rótulos das opções, na mesma
    // ordem que pickMealOption espera o índice de volta.
    var options: [String]?
    // Só em refeições "builder" pendentes (hoje: só almoço) — um grupo de
    // rádio por vez (carboidrato, depois leguminosa, depois proteína...),
    // ver MealFlow.swift pra como o widget percorre isso.
    var builderGroups: [BuilderGroup]?
    var builderExtraLabel: String?

    var id: String { "\(time)-\(title)" }
}

struct WidgetPayload: Codable {
    var generatedAt: String
    var rings: WidgetRings
    var streak: WidgetStreak
    var trip: WidgetTrip?
    var events: [WidgetEvent]

    // Aplicadas localmente, na hora do toque, antes de qualquer confirmação
    // do servidor — ver o comentário grande em WidgetCache.swift sobre por
    // que isso é necessário (não dá pra simplesmente "esperar a resposta"
    // sem o widget parecer travado por vários segundos).
    mutating func markDone(key: String, kind: WidgetEventKind) {
        guard let idx = events.firstIndex(where: { $0.key == key && $0.kind == kind }) else { return }
        events.remove(at: idx)
        switch kind {
        case .suplemento: rings.suplementos.done = min(rings.suplementos.total, rings.suplementos.done + 1)
        case .meal: rings.refeicoes.done = min(rings.refeicoes.total, rings.refeicoes.done + 1)
        case .treino: rings.treino.done = min(rings.treino.total, rings.treino.done + 1)
        }
    }
}

enum WidgetDataClient {
    // Chave fixa gerada uma vez pro widget — não é o token de sessão do
    // usuário (esse expira; o widget não tem como renovar sozinho). Trocar
    // aqui se WIDGET_API_KEY for regenerada no Vercel (`vercel env ls`).
    private static let apiKey = "21da59377babde3266fb7af455f5757001f27d10baf8008598f91e58d52d9731"
    private static let base = "https://treino-app-snowy.vercel.app"

    static func fetch() async throws -> WidgetPayload {
        var request = URLRequest(url: URL(string: "\(base)/api/widget-data")!)
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(WidgetPayload.self, from: data)
    }

    static func toggleSupplement(key: String) async throws {
        var request = URLRequest(url: URL(string: "\(base)/api/widget-toggle")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15
        request.httpBody = try JSONEncoder().encode(["supplementKey": key])

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
    }

    private struct PickMealBody: Encodable {
        let mealKey: String
        let optionIndex: Int
    }

    static func pickMealOption(mealKey: String, optionIndex: Int) async throws {
        var request = URLRequest(url: URL(string: "\(base)/api/widget-pick-meal")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15
        request.httpBody = try JSONEncoder().encode(PickMealBody(mealKey: mealKey, optionIndex: optionIndex))

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
    }

    private struct PickAlmocoBody: Encodable {
        let carb: Int
        let leg: Int
        let prot: Int
        let fruta: Bool
    }

    static func submitAlmoco(carb: Int, leg: Int, prot: Int, fruta: Bool) async throws {
        var request = URLRequest(url: URL(string: "\(base)/api/widget-pick-almoco")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15
        request.httpBody = try JSONEncoder().encode(PickAlmocoBody(carb: carb, leg: leg, prot: prot, fruta: fruta))

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
    }
}
