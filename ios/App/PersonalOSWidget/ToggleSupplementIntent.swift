import AppIntents
import WidgetKit

// Roda dentro do processo do widget quando você toca o círculo de um
// suplemento — nenhum app abre. Ver EventRow em PersonalOSWidgetView.swift
// pra onde isso é acionado, e WidgetDataClient.toggleSupplement pra o POST
// que de fato grava (POST /api/widget-toggle).
struct ToggleSupplementIntent: AppIntent {
    static var title: LocalizedStringResource = "Marcar suplemento"
    static var description = IntentDescription("Alterna um suplemento de hoje entre feito e pendente.")

    @Parameter(title: "Suplemento")
    var supplementKey: String

    init() {
        supplementKey = ""
    }

    init(supplementKey: String) {
        self.supplementKey = supplementKey
    }

    func perform() async throws -> some IntentResult {
        // Marca concluído localmente e pede reload ANTES de esperar a rede —
        // ver o comentário grande em WidgetCache.swift pra por que isso é o
        // que faz o toque parecer instantâneo em vez de travado.
        if var cached = WidgetCache.load() {
            cached.markDone(key: supplementKey, kind: .suplemento)
            WidgetCache.save(cached, optimistic: true)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")

        do {
            try await WidgetDataClient.toggleSupplement(key: supplementKey)
        } catch {
            // Não gravou de verdade — desfaz o otimismo e recarrega, o que
            // busca o estado real e traz o item de volta pra lista.
            WidgetCache.clearOptimisticFlag()
            WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        }
        return .result()
    }
}
