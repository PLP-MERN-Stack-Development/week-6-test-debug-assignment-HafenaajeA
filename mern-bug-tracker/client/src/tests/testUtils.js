// Test utilities for React components
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

// Create a test wrapper for providers
export const createTestWrapper = (initialEntries = ['/']) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  // eslint-disable-next-line react/prop-types
  const TestWrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );

  return TestWrapper;
};

// Custom render function with providers
export const renderWithProviders = (ui, options = {}) => {
  const Wrapper = createTestWrapper(options.initialEntries);
  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock user data
export const mockUser = {
  id: '123456789',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'reporter',
  avatar: 'https://example.com/avatar.jpg',
  isActive: true,
  createdAt: '2023-01-01T00:00:00.000Z',
  lastLogin: '2023-01-02T00:00:00.000Z',
};

// Mock admin user
export const mockAdmin = {
  ...mockUser,
  id: '987654321',
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin',
};

// Mock developer user
export const mockDeveloper = {
  ...mockUser,
  id: '555666777',
  username: 'developer',
  email: 'dev@example.com',
  role: 'developer',
};

// Mock bug data
export const mockBug = {
  _id: 'bug123456789',
  title: 'Test Bug',
  description: 'This is a test bug description',
  status: 'open',
  priority: 'medium',
  severity: 'major',
  category: 'bug',
  environment: 'development',
  reporter: mockUser,
  assignee: null,
  stepsToReproduce: [
    { step: 'Open the application', order: 1 },
    { step: 'Click on login button', order: 2 },
  ],
  expectedResult: 'Should show login form',
  actualResult: 'Application crashes',
  tags: ['login', 'crash'],
  comments: [],
  watchers: [],
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
};

// Mock multiple bugs
export const mockBugs = [
  mockBug,
  {
    ...mockBug,
    _id: 'bug987654321',
    title: 'Another Test Bug',
    status: 'in-progress',
    priority: 'high',
    assignee: mockDeveloper,
  },
  {
    ...mockBug,
    _id: 'bug555666777',
    title: 'Third Test Bug',
    status: 'resolved',
    priority: 'low',
  },
];

// Mock API responses
export const mockApiResponse = (data, success = true) => ({
  success,
  data,
  message: success ? 'Success' : 'Error',
});

// Mock error response
export const mockErrorResponse = (error = 'Something went wrong') => ({
  success: false,
  error,
});

// Mock fetch responses
export const mockFetchSuccess = (data) => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => mockApiResponse(data),
  });
};

export const mockFetchError = (error = 'Network error', status = 500) => {
  global.fetch.mockRejectedValueOnce({
    ok: false,
    status,
    json: async () => mockErrorResponse(error),
  });
};

// Mock authentication context
export const mockAuthContext = {
  user: mockUser,
  token: 'mock-jwt-token',
  login: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
  isLoading: false,
  isAuthenticated: true,
};

// Helper to wait for loading states
export const waitForLoadingToFinish = () => {
  return waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

// Helper to fill form fields
export const fillForm = async (fields) => {
  const user = userEvent.setup();
  
  for (const [label, value] of Object.entries(fields)) {
    const field = screen.getByLabelText(new RegExp(label, 'i'));
    await user.clear(field);
    await user.type(field, value);
  }
};

// Helper to submit form
export const submitForm = async (buttonText = /submit/i) => {
  const user = userEvent.setup();
  const submitButton = screen.getByRole('button', { name: buttonText });
  await user.click(submitButton);
};

// Helper to select option
export const selectOption = async (selectLabel, optionText) => {
  const user = userEvent.setup();
  const select = screen.getByLabelText(new RegExp(selectLabel, 'i'));
  await user.selectOptions(select, optionText);
};

// Helper to click button
export const clickButton = async (buttonText) => {
  const user = userEvent.setup();
  const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await user.click(button);
};

// Custom matchers
expect.extend({
  toBeVisible(received) {
    const pass = received && received.style.display !== 'none';
    return {
      message: () =>
        `expected element ${pass ? 'not ' : ''}to be visible`,
      pass,
    };
  },
});

export {
  render,
  screen,
  fireEvent,
  waitFor,
  userEvent,
};
