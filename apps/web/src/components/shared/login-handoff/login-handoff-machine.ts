type LoginHandoffPhase =
  | "authenticating"
  | "awaiting-destination"
  | "dismissing"
  | "entering-destination"
  | "exiting-loader"
  | "idle"

type LoginHandoffMachine = {
  destinationReady: boolean
  loaderSettled: boolean
  phase: LoginHandoffPhase
}

type LoginHandoffEvent =
  | { type: "begin" }
  | { type: "destination-entered" }
  | { type: "destination-ready" }
  | { type: "dismiss" }
  | { type: "dismissed" }
  | { type: "loader-exited" }
  | { type: "loader-settled" }
  | { type: "request-succeeded" }

const initialLoginHandoffMachine: LoginHandoffMachine = {
  destinationReady: false,
  loaderSettled: false,
  phase: "idle",
}

function transitionLoginHandoff(
  current: LoginHandoffMachine,
  event: LoginHandoffEvent,
): LoginHandoffMachine {
  switch (event.type) {
    case "begin":
      return current.phase === "idle"
        ? { destinationReady: false, loaderSettled: false, phase: "authenticating" }
        : current

    case "request-succeeded":
      return current.phase === "authenticating"
        ? { ...current, phase: "awaiting-destination" }
        : current

    case "loader-settled":
      if (current.phase !== "awaiting-destination") return current
      return advanceWhenReady({ ...current, loaderSettled: true })

    case "destination-ready":
      if (current.phase !== "awaiting-destination") return current
      return advanceWhenReady({ ...current, destinationReady: true })

    case "loader-exited":
      return current.phase === "exiting-loader"
        ? { ...current, phase: "entering-destination" }
        : current

    case "destination-entered":
      return current.phase === "entering-destination"
        ? initialLoginHandoffMachine
        : current

    case "dismiss":
      return current.phase === "idle"
        ? current
        : { ...current, phase: "dismissing" }

    case "dismissed":
      return current.phase === "dismissing"
        ? initialLoginHandoffMachine
        : current
  }
}

function advanceWhenReady(machine: LoginHandoffMachine): LoginHandoffMachine {
  return machine.destinationReady && machine.loaderSettled
    ? { ...machine, phase: "exiting-loader" }
    : machine
}

export { initialLoginHandoffMachine, transitionLoginHandoff }
export type { LoginHandoffEvent, LoginHandoffMachine, LoginHandoffPhase }
