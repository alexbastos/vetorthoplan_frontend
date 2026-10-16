import { Component, type ReactNode } from "react"

type StackSceneBoundaryProps = { children: ReactNode; onFailure: () => void }

class StackSceneBoundary extends Component<StackSceneBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onFailure()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

export { StackSceneBoundary }
