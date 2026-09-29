import Foundation

// Espelha exatamente o JSON de GET /api/widget-data (ver
// scripts/widget-data.source.ts, a fonte de verdade dessa forma).

struct WidgetRing: Decodable {
    let done: Double
    let total: Double

    var fraction: Double { total > 0 ? min(1, done / total) : 0 }
    var label: String { "\(Int(done))/\(Int(total))" }
}

struct WidgetRings: Decodable {
    let treino: WidgetRing
    let refeicoes: WidgetRing
    let suplementos: WidgetRing
}

struct WidgetStreak: Decodable {
    let days: Int
    let todayFullyDone: Bool
}

struct WidgetTrip: Decodable {
    let city: String
    let daysAway: Int
    let carrier: String
    let flightNumber: String
}

enum WidgetEventKind: String, Decodable {
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

struct BuilderGroup: Decodable {
    let key: String
    let title: String
    let items: [String]
}

struct WidgetEvent: Decodable, Identifiable {
    let time: String
    let title: String
    let sub: String
    let kind: WidgetEventKind
    let done: Bool
    // Suplemento: a key que toggleSupplement espera de volta.
    // Refeição "list" pendente (café/lanche/jantar/sobremesa): a key que
    // pickMealOption espera de volta. Refeição "builder" pendente (almoço):
    // a própria key. Fora isso (treino, já concluída): nil.
    let key: String?
    // Só em refeições "list" pendentes — os rótulos das opções, na mesma
    // ordem que pickMealOption espera o índice de volta.
    let options: [String]?
    // Só em refeições "builder" pendentes (hoje: só almoço) — um grupo de
    // rádio por vez (carboidrato, depois leguminosa, depois proteína...),
    // ver AlmocoWizard.swift pra como o widget percorre isso.
    let builderGroups: [BuilderGroup]?
    let builderExtraLabel: String?

    var id: String { "\(time)-\(title)" }
}

struct WidgetPayload: Decodable {
    let generatedAt: String
    let rings: WidgetRings
    let streak: WidgetStreak
    let trip: WidgetTrip?
    let events: [WidgetEvent]
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
