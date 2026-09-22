export function AuthProvider({ children }) {
  return children
}
export function useAuth() {
  return {
    user: {
      role: 'owner',
      first_name: 'Preview',
      last_name: 'Owner',
      email: 'preview@example.test',
      workspace_name: 'Visual QA · Synthetic data',
    },
    loading: false,
    refresh: async () => {},
    signOut: async () => {},
  }
}
