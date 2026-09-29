import WidgetKit

struct PersonalOSEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
}

struct PersonalOSWidgetProvider: TimelineProvider {
    // Placeholder do editor de widgets (antes de qualquer dado real chegar).
    func placeholder(in context: Context) -> PersonalOSEntry {
        PersonalOSEntry(date: Date(), payload: nil)
    }

    // Preview na Biblioteca de Widgets — também sem rede, mesmo placeholder.
    func getSnapshot(in context: Context, completion: @escaping (PersonalOSEntry) -> Void) {
        completion(PersonalOSEntry(date: Date(), payload: nil))
    }

    // Busca de verdade. iOS decide o intervalo real de atualização (o budget
    // do sistema pra widgets gira em torno de a cada 15-60min); `.after` só
    // dá uma sugestão de quando tentar de novo.
    func getTimeline(in context: Context, completion: @escaping (Timeline<PersonalOSEntry>) -> Void) {
        Task {
            let entry: PersonalOSEntry
            do {
                let payload = try await WidgetDataClient.fetch()
                entry = PersonalOSEntry(date: Date(), payload: payload)
            } catch {
                // Mantém o widget mostrando o que já tinha (o SwiftUI cuida do
                // "sem dado nenhum ainda" no placeholder) em vez de travar.
                entry = PersonalOSEntry(date: Date(), payload: nil)
            }
            let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }
}
