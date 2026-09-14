import SwiftUI

struct ContentView: View {
    @StateObject private var vm = WorkoutSessionViewModel()

    var body: some View {
        Group {
            switch vm.phase {
            case .idle:
                IdleView(vm: vm)
            case .active:
                ActiveExerciseView(vm: vm)
            case .resting:
                RestingView(vm: vm)
            case .finished:
                FinishedView()
            }
        }
        .onAppear {
            vm.requestHealthAuthorization()
        }
    }
}

private struct IdleView: View {
    @ObservedObject var vm: WorkoutSessionViewModel

    var body: some View {
        VStack(spacing: 8) {
            if let workout = vm.todayWorkout {
                Text(workout.workoutLabel)
                    .font(.headline)
                    .multilineTextAlignment(.center)
                Text("\(workout.exercises.count) exercícios")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Button {
                    vm.startWorkout()
                } label: {
                    Image(systemName: "play.fill")
                        .font(.title2)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
            } else {
                Text("Abra o app no iPhone pra sincronizar o treino de hoje.")
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }
}

private struct ActiveExerciseView: View {
    @ObservedObject var vm: WorkoutSessionViewModel
    @State private var showExercisePicker = false

    var body: some View {
        VStack(spacing: 6) {
            if let ex = vm.currentExercise {
                Text(ex.name)
                    .font(.headline)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                Text("Série \(vm.currentSet + 1) de \(ex.sets) · \(ex.reps) reps")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                if ex.unit != "corpo" {
                    Text("\(vm.kgForCurrentSet, specifier: "%.1f") kg")
                        .font(.system(size: 30, weight: .semibold, design: .rounded))
                        .focusable(true)
                        .digitalCrownRotation(
                            $vm.kgForCurrentSet,
                            from: 0, through: 400, by: 1.25,
                            sensitivity: .medium,
                            isContinuous: false
                        )
                }

                Button {
                    vm.confirmSet()
                } label: {
                    Text("Concluir série")
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)

                Button {
                    showExercisePicker = true
                } label: {
                    Label("Trocar exercício", systemImage: "arrow.left.arrow.right")
                        .font(.caption2)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
            } else {
                Text("Treino concluído")
            }
        }
        .padding()
        .sheet(isPresented: $showExercisePicker) {
            ExercisePickerView(vm: vm, isPresented: $showExercisePicker)
        }
    }
}

private struct ExercisePickerView: View {
    @ObservedObject var vm: WorkoutSessionViewModel
    @Binding var isPresented: Bool

    var body: some View {
        List {
            if let workout = vm.todayWorkout {
                ForEach(Array(workout.exercises.enumerated()), id: \.element.id) { idx, ex in
                    Button {
                        vm.jumpToExercise(idx)
                        isPresented = false
                    } label: {
                        HStack {
                            if vm.completedExerciseIds.contains(ex.id) {
                                Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                            }
                            Text(ex.name)
                        }
                    }
                }
            }
        }
        .navigationTitle("Exercícios")
    }
}

private struct RestingView: View {
    @ObservedObject var vm: WorkoutSessionViewModel

    var body: some View {
        VStack(spacing: 10) {
            Text("Descanso")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("\(vm.restRemaining)s")
                .font(.system(size: 40, weight: .bold, design: .rounded))
            Button {
                vm.skipRest()
            } label: {
                Text("Pular")
            }
            .buttonStyle(.bordered)
        }
        .padding()
    }
}

private struct FinishedView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.largeTitle)
                .foregroundStyle(.green)
            Text("Treino concluído!")
                .font(.headline)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
