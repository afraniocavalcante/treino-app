import Foundation

// Por que isso existe: em um widget, o único jeito de rodar código quando
// alguém toca é através de um AppIntent — e a única forma de fazer a tela
// mostrar o resultado é pedir pro WidgetKit gerar uma timeline nova
// (WidgetCenter.shared.reloadTimelines), que por sua vez chama
// Provider.getTimeline outra vez. Se esse getTimeline sempre buscar os dados
// de novo na rede (como fazia antes), o toque parece travado por vários
// segundos até a resposta voltar — não existe "atualiza a view local
// enquanto isso" no meio do caminho.
//
// A saída: o próprio AppIntent, antes/além de mandar a escrita de verdade
// pro servidor, aplica a mudança (marcar concluído, tirar da lista, somar no
// anel) num payload guardado aqui em disco e pede o reload — Provider lê
// esse cache "otimista" recente em vez de esperar rede, e a tela atualiza
// quase na hora. A escrita real ainda acontece, só que em paralelo; se ela
// falhar, o próprio intent desfaz o otimismo e manda recarregar de novo, o
// que puxa o estado de verdade do servidor e volta o item pra lista.
enum WidgetCache {
    private static let defaults = UserDefaults.standard
    private static let payloadKey = "widget_cache_payload"
    private static let savedAtKey = "widget_cache_saved_at"
    private static let isOptimisticKey = "widget_cache_is_optimistic"

    static func save(_ payload: WidgetPayload, optimistic: Bool) {
        guard let data = try? JSONEncoder().encode(payload) else { return }
        defaults.set(data, forKey: payloadKey)
        defaults.set(Date(), forKey: savedAtKey)
        defaults.set(optimistic, forKey: isOptimisticKey)
    }

    static func load() -> WidgetPayload? {
        guard let data = defaults.data(forKey: payloadKey) else { return nil }
        return try? JSONDecoder().decode(WidgetPayload.self, from: data)
    }

    /// Só retorna algo se foi salvo há pouco tempo E é uma escrita otimista
    /// (local, ainda não confirmada pelo servidor) — fora dessa janela,
    /// Provider sempre busca fresco pra não ficar preso num estado estagnado
    /// (ex.: abrir o widget num dia diferente).
    static func recentOptimistic(within seconds: TimeInterval = 12) -> WidgetPayload? {
        guard defaults.bool(forKey: isOptimisticKey),
              let savedAt = defaults.object(forKey: savedAtKey) as? Date,
              Date().timeIntervalSince(savedAt) < seconds
        else { return nil }
        return load()
    }

    static func clearOptimisticFlag() {
        defaults.set(false, forKey: isOptimisticKey)
    }
}
