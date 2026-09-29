import AppIntents
import WidgetKit

// Almoço não cabe num toque só (3 grupos de rádio + 1 extra opcional), então
// vira um mini-assistente que anda um passo por toque: escolhe carboidrato,
// aparece leguminosa, escolhe, aparece proteína, escolhe, aparece "+ Fruta?
// sim/não", responde e some (marcado). Cada toque em widget PRECISA passar
// por um AppIntent — não existe closure local que rode sozinha ali — então
// mesmo "avançar de passo" (sem gravar nada ainda) é um intent, e o
// progresso entre um toque e o próximo fica salvo aqui (não no servidor: só
// o passo FINAL grava de verdade, em /api/widget-pick-almoco).
enum AlmocoWizard {
    private static let defaults = UserDefaults.standard
    private static let dateKey = "almoco_wizard_date"
    private static let stepKey = "almoco_wizard_step"
    private static let picksKey = "almoco_wizard_picks" // [Int] — um índice por grupo já escolhido

    private static func todayString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    /// Passo atual (0-based, índice no array de radioGroups) e as escolhas já
    /// feitas nos passos anteriores. Reseta sozinho se o progresso salvo for
    /// de um dia diferente de hoje (evita retomar uma escolha de ontem).
    static func currentState() -> (step: Int, picks: [Int]) {
        let today = todayString()
        guard defaults.string(forKey: dateKey) == today else {
            return (0, [])
        }
        return (defaults.integer(forKey: stepKey), defaults.array(forKey: picksKey) as? [Int] ?? [])
    }

    static func advance(withPick index: Int) {
        let (step, picks) = currentState()
        defaults.set(todayString(), forKey: dateKey)
        defaults.set(picks + [index], forKey: picksKey)
        defaults.set(step + 1, forKey: stepKey)
    }

    static func reset() {
        defaults.removeObject(forKey: dateKey)
        defaults.removeObject(forKey: stepKey)
        defaults.removeObject(forKey: picksKey)
    }
}

// Escolhe uma opção dentro de um grupo de rádio e avança pro próximo passo
// (ou, se for o último grupo E a refeição não tiver extra opcional, já
// grava). O widget decide isso comparando o novo `step` com
// event.builderGroups.count na próxima renderização.
struct AlmocoChooseIntent: AppIntent {
    static var title: LocalizedStringResource = "Escolher item do almoço"
    static var description = IntentDescription("Registra a escolha de um grupo (carboidrato/leguminosa/proteína) e avança pro próximo.")

    @Parameter(title: "Índice da opção")
    var optionIndex: Int

    /// true quando esse é o último grupo E a refeição não tem extra opcional
    /// — nesse caso já grava direto, sem passo de "sim/não" depois.
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
        AlmocoWizard.advance(withPick: optionIndex)
        if isFinalStep {
            let (_, picks) = AlmocoWizard.currentState()
            if picks.count >= 3 {
                try await WidgetDataClient.submitAlmoco(carb: picks[0], leg: picks[1], prot: picks[2], fruta: false)
                AlmocoWizard.reset()
            }
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        return .result()
    }
}

// Passo final quando a refeição tem um extra opcional (ex.: "+ Fruta
// cítrica") — responde sim/não e grava tudo de uma vez.
struct AlmocoExtraIntent: AppIntent {
    static var title: LocalizedStringResource = "Responder extra do almoço"
    static var description = IntentDescription("Responde o extra opcional (ex. fruta) e conclui o almoço de hoje.")

    @Parameter(title: "Quer o extra?")
    var wantsExtra: Bool

    init() {
        wantsExtra = false
    }

    init(wantsExtra: Bool) {
        self.wantsExtra = wantsExtra
    }

    func perform() async throws -> some IntentResult {
        let (_, picks) = AlmocoWizard.currentState()
        if picks.count >= 3 {
            try await WidgetDataClient.submitAlmoco(carb: picks[0], leg: picks[1], prot: picks[2], fruta: wantsExtra)
        }
        AlmocoWizard.reset()
        WidgetCenter.shared.reloadTimelines(ofKind: "PersonalOSWidget")
        return .result()
    }
}
