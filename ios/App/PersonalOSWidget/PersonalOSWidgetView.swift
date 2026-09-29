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
// fora dos limites arredondados do widget (foi exatamente o bug visto: texto
// longo de opção de refeição vazando embaixo). Layout que quebra linha em vez
// de rolar evita isso de raiz — o que não couber no espaço fixo do widget
// simplesmente fica de fora, cortado pelo próprio widget, igual ao resto do
// conteúdo (mesmo espírito do "mostra até 4 eventos e ponto").
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

private struct MealOptionChip: View {
    let mealKey: String
    let index: Int
    let label: String

    var body: some View {
        Button(intent: PickMealOptionIntent(mealKey: mealKey, optionIndex: index)) {
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
        .buttonStyle(.plain)
    }
}

private struct EventRow: View {
    let event: WidgetEvent
    // Puramente visual, local a este render — não vem do backend. O toque no
    // círculo já dispara o Button(intent:) de verdade (grava e recarrega a
    // timeline), mas isso pode levar um instante (rede); esse estado dá o
    // feedback imediato de "marcado" sem esperar a volta, e o -
    // .simultaneousGesture roda em paralelo com o intent, não no lugar dele.
    @State private var justCompleted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
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
                    Text(event.sub)
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.inkSoft)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)

                // Só suplemento é um booleano puro no modelo — o único evento
                // que dá pra concluir com um toque só sem escolher nada (ver
                // o comentário em WidgetEvent.key). Refeição "list" pendente
                // ganha os chips de opção logo abaixo; treino e almoço
                // (kind "builder") ficam só informativos.
                if event.kind == .suplemento, let key = event.key {
                    Button(intent: ToggleSupplementIntent(supplementKey: key)) {
                        ZStack {
                            Circle()
                                .fill(Palette.suplementos)
                                .frame(width: 22, height: 22)
                                .opacity(justCompleted ? 1 : 0)
                            Circle()
                                .strokeBorder(Palette.inkSoft.opacity(0.5), lineWidth: 1.5)
                                .frame(width: 20, height: 20)
                                .opacity(justCompleted ? 0 : 1)
                            Image(systemName: "checkmark")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(.white)
                                .opacity(justCompleted ? 1 : 0)
                        }
                        .scaleEffect(justCompleted ? 1.08 : 1)
                    }
                    .buttonStyle(.plain)
                    .simultaneousGesture(TapGesture().onEnded {
                        withAnimation(.spring(duration: 0.25)) {
                            justCompleted = true
                        }
                    })
                }
            }

            if event.kind == .meal, let key = event.key, let options = event.options, !options.isEmpty {
                FlowLayout {
                    ForEach(Array(options.enumerated()), id: \.offset) { index, label in
                        MealOptionChip(mealKey: key, index: index, label: label)
                    }
                }
                .padding(.leading, 48)
            }
        }
        // O item de verdade só some da lista quando a timeline recarrega com
        // os dados novos (a escrita precisa confirmar no servidor primeiro) —
        // esse fade local cobre o intervalo até lá, pra não parecer que nada
        // aconteceu enquanto isso.
        .opacity(justCompleted ? 0.35 : 1)
        .animation(.easeOut(duration: 0.3), value: justCompleted)
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
// está em 17.0 (precisa disso pra Button(intent:) nos suplementos funcionar
// de qualquer forma), então não precisa mais de fallback pra versões antigas.
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
