import AppIntents
import WidgetKit

// Roda quando você toca o card "Fazer a mala" — mesmo padrão de
// ToggleSupplementIntent, mas só marca (não alterna de volta): ver
// shouldPackFor em src/lib/travel.ts, é uma tarefa única por viagem.
struct PackTripIntent: AppIntent {
    static var title: LocalizedStringResource = "Marcar mala feita"
    static var description = IntentDescription("Marca que a mala já foi feita pra uma viagem.")

    @Parameter(title: "Viagem")
    var tripId: String

    init() { tripId = "" }
    init(tripId: String) { self.tripId = tripId }

    func perform() async throws -> some IntentResult {
        if var cached = WidgetCache.load() {
            cached.markDone(key: tripId, kind: .mala)
            WidgetCache.save(cached, optimistic: true)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")

        do {
            try await WidgetDataClient.packTrip(tripId: tripId)
        } catch {
            WidgetCache.clearOptimisticFlag()
            WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        }
        return .result()
    }
}
