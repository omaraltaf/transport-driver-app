// Test setup file for vitest
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ children }) => children
}));

// Mock Auth Context
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', name: 'Test User', role: 'driver' },
    users: [
      { id: 'test-user', name: 'Test User', role: 'driver' },
      { id: 'admin-user', name: 'Admin User', role: 'admin' }
    ],
    login: vi.fn(),
    logout: vi.fn()
  }),
  AuthProvider: ({ children }) => children
}));

// Global test utilities
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock window.alert
global.alert = vi.fn();