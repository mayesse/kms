const mockData = {}
const mockErrors = {}

export const __setMockData = (queryKey, data) => { mockData[queryKey] = data }
export const __setMockError = (queryKey, error) => { mockErrors[queryKey] = error }

const createChain = (result) => ({
  select: (...args) => createChain(result),
  insert: (...args) => createChain(result),
  update: (...args) => createChain(result),
  delete: (...args) => createChain(result),
  eq: (...args) => createChain(result),
  neq: (...args) => createChain(result),
  in: (...args) => createChain(result),
  ilike: (...args) => createChain(result),
  or: (...args) => createChain(result),
  contains: (...args) => createChain(result),
  order: (...args) => createChain(result),
  limit: (...args) => createChain(result),
  range: (...args) => createChain(result),
  single: () => Promise.resolve(result),
  maybeSingle: () => Promise.resolve(result),
})

export const supabase = {
  from: (table) => ({
    select: (...args) => {
      const key = `${table}:select`
      if (mockErrors[key]) return createChain({ data: null, error: mockErrors[key] })
      return createChain({ data: mockData[key] || [], error: null })
    },
    insert: (data) => {
      const key = `${table}:insert`
      if (mockErrors[key]) return createChain({ data: null, error: mockErrors[key] })
      return createChain({ data: [data], error: null })
    },
    update: (data) => {
      const key = `${table}:update`
      if (mockErrors[key]) return createChain({ data: null, error: mockErrors[key] })
      return createChain({ data: [data], error: null })
    },
    delete: () => {
      const key = `${table}:delete`
      if (mockErrors[key]) return createChain({ data: null, error: mockErrors[key] })
      return createChain({ data: [], error: null })
    },
  }),
  auth: {
    signInWithPassword: async ({ email, password }) => {
      if (email === 'test@test.com' && password === 'password') {
        return { data: { user: { id: 'user-1', email } }, error: null }
      }
      return { data: { user: null }, error: { message: 'Invalid login credentials' } }
    },
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
}

export default supabase
