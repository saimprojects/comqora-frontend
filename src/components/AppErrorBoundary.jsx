import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <main role="alert" style={{ maxWidth: 520, margin: '15vh auto', padding: 24 }}>
          <h1>This page could not load</h1>
          <p>
            The app may have been updated, or your connection was interrupted. Reload to try again.
            Unsaved changes on this page may be lost.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
