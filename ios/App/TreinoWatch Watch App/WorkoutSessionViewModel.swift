import Foundation
import WatchConnectivity
import HealthKit

enum WorkoutPhase {
    case idle
    case active
    case resting
    case finished
}

/// Máquina de estados do treino no relógio — espelha a lógica de
/// WorkoutApp.tsx (exerciseIndex/currentSet/phase, jumpToExercise,
/// skipRest), só que sem o registro manual de peso: o peso vem sugerido
/// (lastKg) e é ajustável na Digital Crown antes de confirmar a série.
@MainActor
final class WorkoutSessionViewModel: NSObject, ObservableObject {
    @Published var todayWorkout: WatchTodayWorkout?
    @Published var exerciseIndex = 0
    @Published var currentSet = 0
    @Published var phase: WorkoutPhase = .idle
    @Published var kgForCurrentSet: Double = 0
    @Published var restRemaining: Int = 0
    @Published var completedExerciseIds = Set<String>()

    private var sessionLog: [String: [WatchSetEntry]] = [:]
    private var restTimer: Timer?
    private var pendingExerciseIndex: Int?
    private var pendingSet: Int?

    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    var currentExercise: WatchWorkoutExercise? {
        guard let workout = todayWorkout, exerciseIndex < workout.exercises.count else { return nil }
        return workout.exercises[exerciseIndex]
    }

    var isLastSetOfExercise: Bool {
        guard let ex = currentExercise else { return true }
        return currentSet + 1 >= ex.sets
    }

    func requestHealthAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let share: Set = [HKObjectType.workoutType()]
        var read: Set<HKObjectType> = []
        if let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) { read.insert(energy) }
        if let hr = HKObjectType.quantityType(forIdentifier: .heartRate) { read.insert(hr) }
        healthStore.requestAuthorization(toShare: share, read: read) { _, _ in }
    }

    func startWorkout() {
        guard let workout = todayWorkout, let first = workout.exercises.first else { return }
        exerciseIndex = 0
        currentSet = 0
        sessionLog = [:]
        completedExerciseIds = []
        kgForCurrentSet = first.lastKg ?? 0
        phase = .active
        startHealthKitSession()
    }

    private func startHealthKitSession() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let config = HKWorkoutConfiguration()
        config.activityType = .traditionalStrengthTraining
        config.locationType = .indoor
        do {
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            let liveBuilder = session.associatedWorkoutBuilder()
            liveBuilder.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)
            session.delegate = self
            liveBuilder.delegate = self
            workoutSession = session
            builder = liveBuilder
            let now = Date()
            session.startActivity(with: now)
            liveBuilder.beginCollection(withStart: now) { _, _ in }
        } catch {
            // Sem HealthKit o treino ainda roda normalmente — só não fecha os anéis.
        }
    }

    /// Confirma a série atual (com o peso ajustado na coroa) e avança:
    /// pra próxima série do mesmo exercício, pro próximo exercício não
    /// concluído, ou termina o treino se não sobrar nenhum.
    func confirmSet() {
        guard let ex = currentExercise else { return }
        var sets = sessionLog[ex.id] ?? []
        sets.append(WatchSetEntry(set: currentSet + 1, kg: kgForCurrentSet, reps: parseTargetReps(ex.reps)))
        sessionLog[ex.id] = sets

        if isLastSetOfExercise {
            completedExerciseIds.insert(ex.id)
            if let next = nextExerciseIndex() {
                startRest(seconds: ex.restSeconds, thenGoTo: next, set: 0)
            } else {
                finishWorkout()
            }
        } else {
            startRest(seconds: ex.restSeconds, thenGoTo: exerciseIndex, set: currentSet + 1)
        }
    }

    func skipRest() {
        restTimer?.invalidate()
        applyPendingAdvance()
    }

    /// Botão "trocar exercício" — pula manualmente pra qualquer exercício
    /// ainda não concluído, cancelando um descanso em andamento se houver.
    func jumpToExercise(_ idx: Int) {
        guard let workout = todayWorkout, idx >= 0, idx < workout.exercises.count else { return }
        restTimer?.invalidate()
        exerciseIndex = idx
        currentSet = 0
        kgForCurrentSet = workout.exercises[idx].lastKg ?? 0
        phase = .active
    }

    private func startRest(seconds: Int, thenGoTo exerciseIdx: Int, set: Int) {
        pendingExerciseIndex = exerciseIdx
        pendingSet = set
        phase = .resting
        restRemaining = max(seconds, 1)
        restTimer?.invalidate()
        restTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                if self.restRemaining <= 1 {
                    self.restTimer?.invalidate()
                    self.applyPendingAdvance()
                } else {
                    self.restRemaining -= 1
                }
            }
        }
    }

    private func applyPendingAdvance() {
        guard let exerciseIdx = pendingExerciseIndex, let set = pendingSet, let workout = todayWorkout else { return }
        exerciseIndex = exerciseIdx
        currentSet = set
        kgForCurrentSet = workout.exercises[exerciseIdx].lastKg ?? kgForCurrentSet
        phase = .active
    }

    private func nextExerciseIndex() -> Int? {
        guard let workout = todayWorkout, !workout.exercises.isEmpty else { return nil }
        for offset in 1...workout.exercises.count {
            let idx = (exerciseIndex + offset) % workout.exercises.count
            if !completedExerciseIds.contains(workout.exercises[idx].id) { return idx }
        }
        return nil
    }

    private func finishWorkout() {
        phase = .finished
        workoutSession?.end()
        builder?.endCollection(withEnd: Date()) { [weak self] _, _ in
            self?.builder?.finishWorkout { _, _ in }
        }
        sendCompletedSession()
    }

    private func sendCompletedSession() {
        guard let workout = todayWorkout else { return }
        let today = ISO8601DateFormatter().string(from: Date())
        let completed = WatchCompletedSession(
            programId: workout.programId,
            programWorkoutId: workout.programWorkoutId,
            workoutLabel: workout.workoutLabel,
            workoutEmoji: workout.workoutEmoji,
            sessionLabel: workout.sessionLabel,
            date: String(today.prefix(10)),
            exercises: sessionLog
        )
        guard let data = try? JSONEncoder().encode(completed),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
        if WCSession.isSupported() {
            WCSession.default.transferUserInfo(["completedSession": dict])
        }
    }

    /// "8-12" -> 12 (topo da faixa); "10" -> 10. Só pra registrar algo
    /// coerente em SetEntry.reps — o relógio não pede reps digitadas.
    private func parseTargetReps(_ reps: String) -> Int? {
        let numbers = reps.split(whereSeparator: { !$0.isNumber })
        return numbers.last.flatMap { Int($0) }
    }
}

extension WorkoutSessionViewModel: WCSessionDelegate {
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let workoutDict = applicationContext["todayWorkout"] as? [String: Any],
              let data = try? JSONSerialization.data(withJSONObject: workoutDict),
              let workout = try? JSONDecoder().decode(WatchTodayWorkout.self, from: data)
        else { return }
        Task { @MainActor [weak self] in
            self?.todayWorkout = workout
        }
    }
}

extension WorkoutSessionViewModel: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {}
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {}
}

extension WorkoutSessionViewModel: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {}
}
