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

    func getTimeline(in context: Context, completion: @escaping (Timeline<PersonalOSEntry>) -> Void) {
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()

        // Reload chamado por um AppIntent logo após um toque: usa o que
        // aquele toque já escreveu localmente (ver WidgetCache.swift) em vez
        // de esperar outra ida à rede — é isso que faz o toque parecer
        // instantâneo em vez de travado por alguns segundos.
        if let optimistic = WidgetCache.recentOptimistic() {
            completion(Timeline(entries: [PersonalOSEntry(date: Date(), payload: optimistic)], policy: .after(nextRefresh)))
            return
        }

        Task {
            let entry: PersonalOSEntry
            do {
                let payload = try await WidgetDataClient.fetch()
                WidgetCache.save(payload, optimistic: false)
                entry = PersonalOSEntry(date: Date(), payload: payload)
            } catch {
                // Sem rede agora: prefere mostrar o último estado conhecido
                // (mesmo que não seja recente) a travar no "carregando".
                entry = PersonalOSEntry(date: Date(), payload: WidgetCache.load())
            }
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }
}
