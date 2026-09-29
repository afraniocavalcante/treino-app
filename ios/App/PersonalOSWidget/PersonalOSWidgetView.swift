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

private struct EventRow: View {
    let event: WidgetEvent

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
                Text(event.sub)
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.inkSoft)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
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
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetBackground(Palette.page)
    }
}

// `containerBackground(for:)` só existe a partir do iOS 17 — esse extension
// method deixa o resto do código escrever `.widgetBackground(...)` uma vez só
// e funcionar tanto em iOS 16 (fallback `.background`) quanto 17+.
private extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(color, for: .widget)
        } else {
            self.background(color)
        }
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
