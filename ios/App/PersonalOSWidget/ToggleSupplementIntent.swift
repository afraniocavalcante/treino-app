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
        try await WidgetDataClient.toggleSupplement(key: supplementKey)
        WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        return .result()
    }
}
