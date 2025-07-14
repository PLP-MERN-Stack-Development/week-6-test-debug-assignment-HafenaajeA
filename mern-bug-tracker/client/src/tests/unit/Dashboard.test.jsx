// src/tests/unit/Dashboard.test.jsx - Unit tests for Dashboard component

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Dashboard from '../../components/Dashboard';
import { AuthContext } from '../../context/AuthContext';
import { BugContext } from '../../context/BugContext';

// Mock Chart.js
jest.mock('chart.js/auto', () => ({
  Chart: jest.fn(() => ({
    destroy: jest.fn(),
    update: jest.fn()
  }))
}));

// Test wrapper component
const TestWrapper = ({ children, authValue, bugValue }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <BugContext.Provider value={bugValue}>
            {children}
          </BugContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

const mockBugs = [
  {
    _id: '1',
    title: 'High Priority Bug',
    severity: 'high',
    priority: 'high',
    status: 'open',
    category: 'frontend',
    reporter: { username: 'user1' },
    createdAt: new Date().toISOString()
  },
  {
    _id: '2',
    title: 'Medium Priority Bug',
    severity: 'medium',
    priority: 'medium',
    status: 'in-progress',
    category: 'backend',
    reporter: { username: 'user2' },
    createdAt: new Date().toISOString()
  },
  {
    _id: '3',
    title: 'Resolved Bug',
    severity: 'low',
    priority: 'low',
    status: 'resolved',
    category: 'frontend',
    reporter: { username: 'user1' },
    createdAt: new Date().toISOString()
  }
];

const mockAuthValue = {
  user: { _id: 'user1', username: 'testuser', role: 'developer' },
  token: 'mock-token',
  login: jest.fn(),
  logout: jest.fn(),
  loading: false
};

const mockBugValue = {
  bugs: mockBugs,
  loading: false,
  error: null,
  fetchBugs: jest.fn(),
  createBug: jest.fn(),
  updateBug: jest.fn(),
  deleteBug: jest.fn()
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with user greeting', () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText(/welcome back, testuser/i)).toBeInTheDocument();
  });

  it('displays bug statistics correctly', () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    // Should show total bugs
    expect(screen.getByTestId('total-bugs')).toHaveTextContent('3');
    
    // Should show open bugs
    expect(screen.getByTestId('open-bugs')).toHaveTextContent('1');
    
    // Should show in-progress bugs
    expect(screen.getByTestId('in-progress-bugs')).toHaveTextContent('1');
    
    // Should show resolved bugs
    expect(screen.getByTestId('resolved-bugs')).toHaveTextContent('1');
  });

  it('displays recent bugs section', () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText(/recent bugs/i)).toBeInTheDocument();
    expect(screen.getByText('High Priority Bug')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority Bug')).toBeInTheDocument();
  });

  it('shows high priority bugs prominently', () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    const highPrioritySection = screen.getByTestId('high-priority-bugs');
    expect(highPrioritySection).toBeInTheDocument();
    expect(highPrioritySection).toHaveTextContent('High Priority Bug');
  });

  it('displays user role-specific content', () => {
    const adminAuthValue = {
      ...mockAuthValue,
      user: { ...mockAuthValue.user, role: 'admin' }
    };

    render(
      <TestWrapper authValue={adminAuthValue} bugValue={mockBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    // Admin should see additional management options
    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    const loadingBugValue = { ...mockBugValue, loading: true, bugs: [] };

    render(
      <TestWrapper authValue={mockAuthValue} bugValue={loadingBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('handles error state', () => {
    const errorBugValue = { 
      ...mockBugValue, 
      loading: false, 
      bugs: [], 
      error: 'Failed to load dashboard data' 
    };

    render(
      <TestWrapper authValue={errorBugValue} bugValue={errorBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
  });

  it('navigates to bug creation when create button clicked', () => {
    const mockNavigate = jest.fn();
    
    // Mock useNavigate
    jest.doMock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate
    }));

    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    const createButton = screen.getByTestId('create-bug-button');
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('/bugs/new');
  });

  it('filters bugs by assigned user for developers', () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    // Should show "My Bugs" section for developers
    expect(screen.getByTestId('my-bugs')).toBeInTheDocument();
  });

  it('shows charts for bug statistics', () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    // Should render chart canvases
    expect(screen.getByTestId('severity-chart')).toBeInTheDocument();
    expect(screen.getByTestId('status-chart')).toBeInTheDocument();
  });

  it('refreshes data when refresh button clicked', async () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    const refreshButton = screen.getByTestId('refresh-button');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockBugValue.fetchBugs).toHaveBeenCalled();
    });
  });

  it('displays correct time-based greeting', () => {
    // Mock different times of day
    const originalDate = Date;
    
    // Morning (9 AM)
    global.Date = jest.fn(() => new Date('2024-01-01T09:00:00Z'));
    global.Date.now = originalDate.now;

    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText(/good morning/i)).toBeInTheDocument();

    global.Date = originalDate;
  });
});
