import AppIntents
import WidgetKit

// Roda dentro do processo do widget quando você toca um chip de opção de
// refeição — ver EventRow em PersonalOSWidgetView.swift (o ScrollView de
// chips) e WidgetDataClient.pickMealOption pra o POST que grava.
struct PickMealOptionIntent: AppIntent {
    static var title: LocalizedStringResource = "Escolher opção de refeição"
    static var description = IntentDescription("Marca uma refeição de hoje com a opção escolhida.")

    @Parameter(title: "Refeição")
    var mealKey: String

    @Parameter(title: "Índice da opção")
    var optionIndex: Int

    init() {
        mealKey = ""
        optionIndex = 0
    }

    init(mealKey: String, optionIndex: Int) {
        self.mealKey = mealKey
        self.optionIndex = optionIndex
    }

    func perform() async throws -> some IntentResult {
        try await WidgetDataClient.pickMealOption(mealKey: mealKey, optionIndex: optionIndex)
        WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        return .result()
    }
}
