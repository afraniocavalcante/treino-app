import Foundation

/// Espelha WatchTodayWorkout em src/lib/watchBridge.ts — mesmos nomes de
/// campo, decodificado a partir do dicionário que chega via
/// WCSession.didReceiveApplicationContext.
struct WatchWorkoutExercise: Codable, Identifiable {
    let id: String
    let name: String
    let unit: String // "total" | "halter" | "corpo"
    let sets: Int
    let reps: String // ex. "8-12", só exibição
    let restSeconds: Int
    let lastKg: Double?
}

struct WatchTodayWorkout: Codable {
    let programId: String
    let programWorkoutId: String
    let workoutLabel: String
    let workoutEmoji: String?
    let sessionLabel: String
    let exercises: [WatchWorkoutExercise]
}

/// Espelha SetEntry/SessionLog em src/lib/program.ts.
struct WatchSetEntry: Codable {
    let set: Int
    let kg: Double
    let reps: Int?
}

/// Espelha WatchCompletedSession em src/lib/watchBridge.ts — mandado de volta
/// via WCSession.transferUserInfo ao terminar o treino.
struct WatchCompletedSession: Codable {
    let programId: String
    let programWorkoutId: String
    let workoutLabel: String
    let workoutEmoji: String?
    let sessionLabel: String
    let date: String // yyyy-mm-dd
    let exercises: [String: [WatchSetEntry]]
}
