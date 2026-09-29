import SwiftUI
import WidgetKit

// Paleta espelhada de src/app/os/Today.tsx e src/app/os/Dock.tsx — não dá
// pra importar CSS aqui, então os mesmos hex ficam copiados à mão.
private enum Palette {
    static let page = Color(red: 0xF5 / 255, green: 0xEF / 255, blue: 0xE3 / 255)
    static let ink = Color(red: 0x1C / 255, green: 0x1C / 255, blue: 0x1E / 255)
    static let inkSoft = Color(red: 0x57 / 255, green: 0x53 / 255, blue: 0x4E / 255)
    static let treino = Color(red: 0x1C / 255, green: 0x1C / 255, blue: 0x1E / 255)
    static let refeicoes = Color(red: 0xC9 / 255, green: 0x7B / 255, blue: 0x4A / 255)
    static let suplementos = Color(red: 0xCF / 255, green: 0xA8 / 255, blue: 0x5F / 255)
    static let card = Color.white.opacity(0.55)
    static let trip = Color(red: 0x00 / 255, green: 0x88 / 255, blue: 0xB0 / 255)
}

// ButtonStyle (não gesto solto) porque é a única forma confiável de pegar um
// retorno visual de "pressionado" num widget — reage assim que o dedo
// encosta, sem depender de perform() já ter terminado.
private struct PressScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.94 : 1)
            .opacity(configuration.isPressed ? 0.8 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

// O cartão inteiro pinta com a cor da categoria assim que o dedo aperta —
// não só um círculo pequeno — porque agora é o cartão inteiro que é o alvo
// do toque (ver comentário em EventRow). Não espera o perform() terminar nem
// a rede confirmar (ver WidgetCache.swift pra como o "some da lista" fica
// rápido por outro caminho, sem depender dessa animação).
private struct CardPressButtonStyle: ButtonStyle {
    var tint: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(6)
            .padding(.horizontal, 2)
            .background(RoundedRectangle(cornerRadius: 12).fill(tint.opacity(configuration.isPressed ? 0.4 : 0)))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

private struct RingView: View {
    let title: String
    let color: Color
    let ring: WidgetRing

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .stroke(Palette.ink.opacity(0.1), lineWidth: 5)
                Circle()
                    .trim(from: 0, to: ring.fraction)
                    .stroke(color, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text(ring.label)
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(Palette.ink)
            }
            .frame(width: 46, height: 46)
            Text(title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Palette.inkSoft)
        }
        .frame(maxWidth: .infinity)
    }
}

// Widgets na Home Screen não suportam gesto de rolagem de verdade — um
// ScrollView ali renderiza mas não rola, e o conteúdo que não cabe vaza pra
// fora dos limites arredondados do widget. Layout que quebra linha em vez de
// rolar evita isso de raiz — o que não couber no espaço fixo do widget
// simplesmente fica de fora, cortado pelo próprio widget.
private struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0, x + size.width > maxWidth {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: maxWidth, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x: CGFloat = bounds.minX
        var y: CGFloat = bounds.minY
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > bounds.minX, x + size.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

private struct OptionChip: View {
    let label: String

    var body: some View {
        Text(label)
            .font(.system(size: 10.5, weight: .medium))
            .foregroundStyle(Palette.ink)
            .lineLimit(1)
            .truncationMode(.tail)
            .frame(maxWidth: 130, alignment: .leading)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Palette.card, in: Capsule())
    }
}

// Só some quando MealFlow.expandedMealKey == a key dessa refeição — por
// padrão toda refeição pendente fica fechada (só horário/nome, igual um
// suplemento); tocar nela chama ExpandMealIntent, que é o que revela isso.
private struct ExpandedMealOptions: View {
    let event: WidgetEvent

    var body: some View {
        if let groups = event.builderGroups, !groups.isEmpty {
            AlmocoStepRow(groups: groups, extraLabel: event.builderExtraLabel)
        } else if let key = event.key, let options = event.options, !options.isEmpty {
            FlowLayout {
                ForEach(Array(options.enumerated()), id: \.offset) { index, label in
                    Button(intent: PickMealOptionIntent(mealKey: key, optionIndex: index)) {
                        OptionChip(label: label)
                    }
                    .buttonStyle(PressScaleButtonStyle())
                }
            }
            .padding(.leading, 48)
        }
    }
}

// Almoço anda um grupo de rádio por vez (carboidrato → leguminosa →
// proteína → extra opcional sim/não), lendo o progresso salvo localmente em
// MealFlow (ver o comentário lá pra por quê isso não pode ser @State comum).
// Cada toque é o passo seguinte — nunca volta.
private struct AlmocoStepRow: View {
    let groups: [BuilderGroup]
    let extraLabel: String?

    var body: some View {
        let step = MealFlow.step

        if step < groups.count {
            let group = groups[step]
            let isFinal = step == groups.count - 1 && extraLabel == nil
            VStack(alignment: .leading, spacing: 4) {
                Text(group.title)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Palette.inkSoft)
                    .padding(.leading, 48)
                FlowLayout {
                    ForEach(Array(group.items.enumerated()), id: \.offset) { index, label in
                        Button(intent: AlmocoChooseIntent(optionIndex: index, isFinalStep: isFinal)) {
                            OptionChip(label: label)
                        }
                        .buttonStyle(PressScaleButtonStyle())
                    }
                }
                .padding(.leading, 48)
            }
        } else if let extraLabel {
            VStack(alignment: .leading, spacing: 4) {
                Text(extraLabel)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Palette.inkSoft)
                    .padding(.leading, 48)
                HStack(spacing: 6) {
                    Button(intent: AlmocoExtraIntent(wantsExtra: true)) {
                        OptionChip(label: "Sim")
                    }
                    .buttonStyle(PressScaleButtonStyle())
                    Button(intent: AlmocoExtraIntent(wantsExtra: false)) {
                        OptionChip(label: "Não")
                    }
                    .buttonStyle(PressScaleButtonStyle())
                }
                .padding(.leading, 48)
            }
        }
    }
}

// Conteúdo visual puro da linha — sem nenhum toque próprio. EventRow decide
// como envolver isso (Button de um intent, Link pro app, ou nada) conforme o
// tipo de evento; .contentShape(Rectangle()) aqui garante que a área
// clicável cobre a linha inteira, incluindo o espaço vazio do Spacer, não só
// onde tem texto/ícone visível.
private struct EventRowContent: View {
    let event: WidgetEvent
    let subtitle: String
    let isExpanded: Bool

    var body: some View {
        HStack(spacing: 10) {
            Text(event.time)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(Palette.inkSoft)
                .frame(width: 38, alignment: .trailing)

            Image(systemName: event.kind.icon)
                .font(.system(size: 12))
                .foregroundStyle(.white)
                .frame(width: 26, height: 26)
                .background(Palette.ink.opacity(0.85), in: RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 1) {
                Text(event.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(1)
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.inkSoft)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)

            switch event.kind {
            case .suplemento:
                Circle()
                    .strokeBorder(Palette.inkSoft.opacity(0.5), lineWidth: 1.5)
                    .frame(width: 20, height: 20)
            case .meal:
                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.inkSoft)
            case .treino:
                Image(systemName: "arrow.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.inkSoft)
            }
        }
        .contentShape(Rectangle())
    }
}

private struct EventRow: View {
    let event: WidgetEvent

    private var isExpandableMeal: Bool {
        event.kind == .meal && event.key != nil
    }

    private var isExpanded: Bool {
        isExpandableMeal && MealFlow.expandedMealKey == event.key
    }

    /// Igual event.sub, exceto pro almoço com passos em andamento — aí mostra
    /// quantos faltam. "Toque para escolher" some assim que abre.
    private var subtitle: String {
        guard isExpanded, let groups = event.builderGroups, !groups.isEmpty else {
            return isExpanded ? "Toque pra fechar" : event.sub
        }
        let step = MealFlow.step
        let total = groups.count + (event.builderExtraLabel != nil ? 1 : 0)
        return "Passo \(min(step, total) + 1) de \(total)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // O cartão inteiro é o alvo do toque — não só um ícone pequeno —
            // então cada ramo abaixo envolve TODO o conteúdo, não só um canto
            // dele. Treino usa Link (abre o app direto no treino, sem rodar
            // um intent); suplemento e refeição usam Button(intent:), que é
            // o único jeito de rodar código num widget sem abrir o app.
            if event.kind == .treino {
                Link(destination: URL(string: "personalos://treino")!) {
                    EventRowContent(event: event, subtitle: subtitle, isExpanded: false)
                }
            } else if event.kind == .suplemento, let key = event.key {
                Button(intent: ToggleSupplementIntent(supplementKey: key)) {
                    EventRowContent(event: event, subtitle: subtitle, isExpanded: false)
                }
                .buttonStyle(CardPressButtonStyle(tint: Palette.suplementos))
            } else if isExpandableMeal, let key = event.key {
                Button(intent: ExpandMealIntent(mealKey: key)) {
                    EventRowContent(event: event, subtitle: subtitle, isExpanded: isExpanded)
                }
                .buttonStyle(CardPressButtonStyle(tint: Palette.refeicoes))
            } else {
                EventRowContent(event: event, subtitle: subtitle, isExpanded: false)
            }

            if isExpanded {
                ExpandedMealOptions(event: event)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .animation(.easeOut(duration: 0.22), value: isExpanded)
        .animation(.easeOut(duration: 0.22), value: MealFlow.step)
    }
}

struct PersonalOSWidgetView: View {
    let entry: PersonalOSEntry

    var body: some View {
        if let payload = entry.payload {
            content(payload)
        } else {
            VStack(spacing: 8) {
                ProgressView()
                Text("Carregando Personal OS…")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.inkSoft)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .widgetBackground(Palette.page)
        }
    }

    @ViewBuilder
    private func content(_ payload: WidgetPayload) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Personal OS")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.ink)
                Spacer()
                Text(payload.streak.todayFullyDone ? "\(payload.streak.days + 1) dias perfeitos" : "\(payload.streak.days) dias perfeitos")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Palette.inkSoft)
            }

            HStack(spacing: 4) {
                RingView(title: "Treino", color: Palette.treino, ring: payload.rings.treino)
                RingView(title: "Refeições", color: Palette.refeicoes, ring: payload.rings.refeicoes)
                RingView(title: "Suplementos", color: Palette.suplementos, ring: payload.rings.suplementos)
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 4)
            .background(Palette.card, in: RoundedRectangle(cornerRadius: 16))

            if let trip = payload.trip {
                HStack(spacing: 8) {
                    Image(systemName: "airplane")
                        .foregroundStyle(Palette.trip)
                    Text("\(trip.city.trimmingCharacters(in: .whitespaces)) em \(trip.daysAway) dias")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                    Spacer()
                    Text("\(trip.carrier) · \(trip.flightNumber)")
                        .font(.system(size: 10))
                        .foregroundStyle(Palette.inkSoft)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 14))
            }

            VStack(alignment: .leading, spacing: 8) {
                if payload.events.isEmpty {
                    Text("Tudo feito por hoje 🎉")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.inkSoft)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, 8)
                } else {
                    ForEach(payload.events.prefix(4)) { event in
                        EventRow(event: event)
                            .transition(.opacity.combined(with: .move(edge: .leading)))
                    }
                }
            }
            .animation(.easeOut(duration: 0.3), value: payload.events.map(\.id))

            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetBackground(Palette.page)
    }
}

// containerBackground(for:) é iOS 17+ — o deployment target da extensão já
// está em 17.0 (precisa disso pra Button(intent:) funcionar de qualquer
// forma), então não precisa de fallback pra versões antigas.
private extension View {
    func widgetBackground(_ color: Color) -> some View {
        containerBackground(color, for: .widget)
    }
}

struct PersonalOSWidget: Widget {
    let kind: String = "PersonalOSWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PersonalOSWidgetProvider()) { entry in
            PersonalOSWidgetView(entry: entry)
        }
        .configurationDisplayName("Personal OS")
        .description("Anéis do dia, próximos eventos, streak e a próxima viagem.")
        .supportedFamilies([.systemLarge])
    }
}
