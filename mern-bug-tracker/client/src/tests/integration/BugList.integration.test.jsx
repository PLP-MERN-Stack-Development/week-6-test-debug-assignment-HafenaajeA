// src/tests/integration/BugList.integration.test.jsx - Integration tests for BugList component

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import BugList from '../../components/BugList';
import { AuthContext } from '../../context/AuthContext';
import { BugContext } from '../../context/BugContext';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

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
    title: 'Test Bug 1',
    description: 'First test bug',
    severity: 'high',
    priority: 'high',
    status: 'open',
    category: 'frontend',
    reporter: { username: 'testuser' },
    createdAt: new Date().toISOString()
  },
  {
    _id: '2',
    title: 'Test Bug 2',
    description: 'Second test bug',
    severity: 'medium',
    priority: 'medium',
    status: 'in-progress',
    category: 'backend',
    reporter: { username: 'testuser2' },
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

describe('BugList Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ data: mockBugs });
  });

  it('renders bug list with data from API', async () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <BugList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Bug 1')).toBeInTheDocument();
      expect(screen.getByText('Test Bug 2')).toBeInTheDocument();
    });
  });

  it('handles loading state properly', () => {
    const loadingBugValue = { ...mockBugValue, loading: true, bugs: [] };

    render(
      <TestWrapper authValue={mockAuthValue} bugValue={loadingBugValue}>
        <BugList />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles error state properly', () => {
    const errorBugValue = { 
      ...mockBugValue, 
      loading: false, 
      bugs: [], 
      error: 'Failed to fetch bugs' 
    };

    render(
      <TestWrapper authValue={mockAuthValue} bugValue={errorBugValue}>
        <BugList />
      </TestWrapper>
    );

    expect(screen.getByText(/failed to fetch bugs/i)).toBeInTheDocument();
  });

  it('filters bugs by status', async () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <BugList />
      </TestWrapper>
    );

    // Wait for bugs to load
    await waitFor(() => {
      expect(screen.getByText('Test Bug 1')).toBeInTheDocument();
    });

    // Filter by open status
    const statusFilter = screen.getByTestId('status-filter');
    fireEvent.change(statusFilter, { target: { value: 'open' } });

    await waitFor(() => {
      expect(screen.getByText('Test Bug 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Bug 2')).not.toBeInTheDocument();
    });
  });

  it('filters bugs by priority', async () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <BugList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Bug 1')).toBeInTheDocument();
    });

    // Filter by high priority
    const priorityFilter = screen.getByTestId('priority-filter');
    fireEvent.change(priorityFilter, { target: { value: 'high' } });

    await waitFor(() => {
      expect(screen.getByText('Test Bug 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Bug 2')).not.toBeInTheDocument();
    });
  });

  it('searches bugs by title', async () => {
    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <BugList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Bug 1')).toBeInTheDocument();
    });

    // Search for specific bug
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'Test Bug 1' } });

    await waitFor(() => {
      expect(screen.getByText('Test Bug 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Bug 2')).not.toBeInTheDocument();
    });
  });

  it('handles pagination correctly', async () => {
    // Mock large dataset
    const largeBugList = Array.from({ length: 25 }, (_, i) => ({
      _id: `bug-${i}`,
      title: `Bug ${i}`,
      description: `Description ${i}`,
      severity: 'medium',
      priority: 'medium',
      status: 'open',
      category: 'frontend',
      reporter: { username: 'testuser' },
      createdAt: new Date().toISOString()
    }));

    const paginatedBugValue = { ...mockBugValue, bugs: largeBugList };

    render(
      <TestWrapper authValue={mockAuthValue} bugValue={paginatedBugValue}>
        <BugList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Bug 0')).toBeInTheDocument();
    });

    // Check pagination controls exist
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
    
    // Click next page
    const nextButton = screen.getByTestId('next-page');
    fireEvent.click(nextButton);

    // Should show different bugs
    await waitFor(() => {
      expect(screen.queryByText('Bug 0')).not.toBeInTheDocument();
      expect(screen.getByText('Bug 10')).toBeInTheDocument();
    });
  });

  it('handles empty bug list', () => {
    const emptyBugValue = { ...mockBugValue, bugs: [] };

    render(
      <TestWrapper authValue={mockAuthValue} bugValue={emptyBugValue}>
        <BugList />
      </TestWrapper>
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/no bugs found/i)).toBeInTheDocument();
  });

  it('navigates to bug details when clicked', async () => {
    const mockNavigate = jest.fn();
    
    // Mock useNavigate hook
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate
    }));

    render(
      <TestWrapper authValue={mockAuthValue} bugValue={mockBugValue}>
        <BugList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Bug 1')).toBeInTheDocument();
    });

    // Click on bug card
    fireEvent.click(screen.getByText('Test Bug 1'));

    // Should navigate to bug details
    expect(mockNavigate).toHaveBeenCalledWith('/bugs/1');
  });

  it('handles API errors gracefully', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    const errorBugValue = {
      ...mockBugValue,
      bugs: [],
      error: 'Network error',
      loading: false
    };

    render(
      <TestWrapper authValue={mockAuthValue} bugValue={errorBugValue}>
        <BugList />
      </TestWrapper>
    );

    expect(screen.getByText(/network error/i)).toBeInTheDocument();
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  it('retries loading bugs on retry button click', async () => {
    const retryBugValue = {
      ...mockBugValue,
      bugs: [],
      error: 'Network error',
      loading: false,
      fetchBugs: jest.fn()
    };

    render(
      <TestWrapper authValue={mockAuthValue} bugValue={retryBugValue}>
        <BugList />
      </TestWrapper>
    );

    const retryButton = screen.getByTestId('retry-button');
    fireEvent.click(retryButton);

    expect(retryBugValue.fetchBugs).toHaveBeenCalled();
  });
});
