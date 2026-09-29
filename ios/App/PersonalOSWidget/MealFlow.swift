import AppIntents
import WidgetKit

// Uma refeição pendente fica fechada por padrão (só mostra o horário/nome,
// igual um suplemento) — tocar nela "transforma" o widget: revela a primeira
// etapa a escolher. Pra refeições "list" (café/lanche/jantar/sobremesa) só
// existe uma etapa (a lista de opções); pra almoço (única "builder") são até
// quatro (carboidrato → leguminosa → proteína → extra opcional). Cada toque
// subsequente avança uma etapa; a última fecha e marca concluído.
//
// Todo toque em widget PRECISA passar por um AppIntent (não existe closure
// local que rode sozinha ali), então até "abrir pra escolher" é um intent, e
// o progresso entre um toque e o próximo fica salvo aqui — não no servidor,
// já que só a escolha final grava de verdade.
enum MealFlow {
    private static let defaults = UserDefaults.standard
    private static let dateKey = "mealflow_date"
    private static let expandedKey = "mealflow_expanded_key"
    private static let stepKey = "mealflow_step"
    private static let picksKey = "mealflow_picks"

    private static func todayString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    private static func resetIfStale() {
        guard defaults.string(forKey: dateKey) != todayString() else { return }
        defaults.removeObject(forKey: expandedKey)
        defaults.removeObject(forKey: stepKey)
        defaults.removeObject(forKey: picksKey)
        defaults.set(todayString(), forKey: dateKey)
    }

    static var expandedMealKey: String? {
        resetIfStale()
        return defaults.string(forKey: expandedKey)
    }

    static var step: Int {
        resetIfStale()
        return defaults.integer(forKey: stepKey)
    }

    static var picks: [Int] {
        resetIfStale()
        return defaults.array(forKey: picksKey) as? [Int] ?? []
    }

    static func expand(_ key: String) {
        resetIfStale()
        defaults.set(key, forKey: expandedKey)
        defaults.set(0, forKey: stepKey)
        defaults.set([Int](), forKey: picksKey)
    }

    static func collapse() {
        defaults.removeObject(forKey: expandedKey)
        defaults.removeObject(forKey: stepKey)
        defaults.removeObject(forKey: picksKey)
    }

    static func advance(withPick index: Int) {
        defaults.set(picks + [index], forKey: picksKey)
        defaults.set(step + 1, forKey: stepKey)
    }
}

// Abre (revela a 1ª etapa) ou fecha (se já estiver aberta) uma refeição
// pendente. Não escreve nada no servidor — puramente local/instantâneo.
struct ExpandMealIntent: AppIntent {
    static var title: LocalizedStringResource = "Abrir refeição"
    static var description = IntentDescription("Mostra as opções de uma refeição pendente, ou fecha se já estiver mostrando.")

    @Parameter(title: "Refeição")
    var mealKey: String

    init() { mealKey = "" }
    init(mealKey: String) { self.mealKey = mealKey }

    func perform() async throws -> some IntentResult {
        if MealFlow.expandedMealKey == mealKey {
            MealFlow.collapse()
        } else {
            MealFlow.expand(mealKey)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        return .result()
    }
}

// Escolhe a opção de uma refeição "list" (café/lanche/jantar/sobremesa) —
// única etapa, fecha e marca concluído nesse mesmo toque.
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
        MealFlow.collapse()
        if var cached = WidgetCache.load() {
            cached.markDone(key: mealKey, kind: .meal)
            WidgetCache.save(cached, optimistic: true)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")

        do {
            try await WidgetDataClient.pickMealOption(mealKey: mealKey, optionIndex: optionIndex)
        } catch {
            // Não salvou de verdade — desfaz o otimismo e busca o estado
            // real de novo, o que traz o item de volta pra lista.
            WidgetCache.clearOptimisticFlag()
            WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        }
        return .result()
    }
}

// Escolhe uma opção dentro de um grupo de rádio do almoço e avança pro
// próximo passo (ou, se for o último grupo E a refeição não tiver extra
// opcional, já grava e fecha).
struct AlmocoChooseIntent: AppIntent {
    static var title: LocalizedStringResource = "Escolher item do almoço"
    static var description = IntentDescription("Registra a escolha de um grupo (carboidrato/leguminosa/proteína) e avança pro próximo.")

    @Parameter(title: "Índice da opção")
    var optionIndex: Int

    @Parameter(title: "É o passo final?")
    var isFinalStep: Bool

    init() {
        optionIndex = 0
        isFinalStep = false
    }

    init(optionIndex: Int, isFinalStep: Bool) {
        self.optionIndex = optionIndex
        self.isFinalStep = isFinalStep
    }

    func perform() async throws -> some IntentResult {
        MealFlow.advance(withPick: optionIndex)
        if isFinalStep {
            let picks = MealFlow.picks
            MealFlow.collapse()
            if picks.count >= 3 {
                if var cached = WidgetCache.load() {
                    cached.markDone(key: "almoco", kind: .meal)
                    WidgetCache.save(cached, optimistic: true)
                }
                WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
                do {
                    try await WidgetDataClient.submitAlmoco(carb: picks[0], leg: picks[1], prot: picks[2], fruta: false)
                } catch {
                    WidgetCache.clearOptimisticFlag()
                    WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
                }
                return .result()
            }
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        return .result()
    }
}

// Passo final quando a refeição tem um extra opcional (ex.: "+ Fruta
// cítrica") — responde sim/não, grava tudo de uma vez e fecha.
struct AlmocoExtraIntent: AppIntent {
    static var title: LocalizedStringResource = "Responder extra do almoço"
    static var description = IntentDescription("Responde o extra opcional (ex. fruta) e conclui o almoço de hoje.")

    @Parameter(title: "Quer o extra?")
    var wantsExtra: Bool

    init() { wantsExtra = false }
    init(wantsExtra: Bool) { self.wantsExtra = wantsExtra }

    func perform() async throws -> some IntentResult {
        let picks = MealFlow.picks
        MealFlow.collapse()
        guard picks.count >= 3 else {
            WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
            return .result()
        }
        if var cached = WidgetCache.load() {
            cached.markDone(key: "almoco", kind: .meal)
            WidgetCache.save(cached, optimistic: true)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        do {
            try await WidgetDataClient.submitAlmoco(carb: picks[0], leg: picks[1], prot: picks[2], fruta: wantsExtra)
        } catch {
            WidgetCache.clearOptimisticFlag()
            WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        }
        return .result()
    }
}
