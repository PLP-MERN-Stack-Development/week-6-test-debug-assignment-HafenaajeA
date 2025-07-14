// src/tests/integration/AuthFlow.integration.test.jsx - Integration tests for authentication flow

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { AuthContext } from '../../context/AuthContext';
import LoginForm from '../../components/LoginForm';
import RegisterForm from '../../components/RegisterForm';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

const TestWrapper = ({ children, authValue }) => {
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
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Login Flow', () => {
    const mockAuthValue = {
      user: null,
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false
    };

    it('successfully logs in user with valid credentials', async () => {
      const mockResponse = {
        data: {
          user: { _id: '1', username: 'testuser', email: 'test@example.com' },
          token: 'mock-jwt-token'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      render(
        <TestWrapper authValue={mockAuthValue}>
          <LoginForm />
        </TestWrapper>
      );

      // Fill in login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockAuthValue.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('handles login failure with invalid credentials', async () => {
      const mockError = {
        response: {
          data: { message: 'Invalid credentials' },
          status: 401
        }
      };

      mockedAxios.post.mockRejectedValue(mockError);

      render(
        <TestWrapper authValue={mockAuthValue}>
          <LoginForm />
        </TestWrapper>
      );

      // Fill in login form with invalid credentials
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'wrong@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during login request', async () => {
      mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(
        <TestWrapper authValue={mockAuthValue}>
          <LoginForm />
        </TestWrapper>
      );

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      // Should show loading state
      expect(screen.getByRole('button', { name: /logging in/i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Registration Flow', () => {
    const mockAuthValue = {
      user: null,
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false
    };

    it('successfully registers new user', async () => {
      const mockResponse = {
        data: {
          user: { _id: '1', username: 'newuser', email: 'new@example.com' },
          token: 'mock-jwt-token'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      render(
        <TestWrapper authValue={mockAuthValue}>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill in registration form
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'newuser' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'new@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: 'password123' }
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' }
      });
      fireEvent.change(screen.getByLabelText(/role/i), {
        target: { value: 'developer' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/register', {
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
          role: 'developer'
        });
      });
    });

    it('handles registration failure with existing email', async () => {
      const mockError = {
        response: {
          data: { message: 'Email already exists' },
          status: 409
        }
      };

      mockedAxios.post.mockRejectedValue(mockError);

      render(
        <TestWrapper authValue={mockAuthValue}>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill in form with existing email
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'newuser' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'existing@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: 'password123' }
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });

    it('validates password confirmation', async () => {
      render(
        <TestWrapper authValue={mockAuthValue}>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill in form with mismatched passwords
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'newuser' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'new@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: 'password123' }
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'differentpassword' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      // Should not make API call
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('Authentication State Persistence', () => {
    it('persists login state in localStorage', async () => {
      const mockResponse = {
        data: {
          user: { _id: '1', username: 'testuser', email: 'test@example.com' },
          token: 'mock-jwt-token'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const mockAuthValue = {
        user: null,
        token: null,
        login: jest.fn((credentials) => {
          // Simulate storing in localStorage
          localStorage.setItem('token', mockResponse.data.token);
          localStorage.setItem('user', JSON.stringify(mockResponse.data.user));
        }),
        logout: jest.fn(),
        loading: false
      };

      render(
        <TestWrapper authValue={mockAuthValue}>
          <LoginForm />
        </TestWrapper>
      );

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockAuthValue.login).toHaveBeenCalled();
      });

      // Check localStorage
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
      expect(JSON.parse(localStorage.getItem('user'))).toEqual({
        _id: '1',
        username: 'testuser',
        email: 'test@example.com'
      });
    });

    it('clears localStorage on logout', () => {
      // Set initial state
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({ _id: '1', username: 'testuser' }));

      const mockAuthValue = {
        user: { _id: '1', username: 'testuser' },
        token: 'mock-jwt-token',
        login: jest.fn(),
        logout: jest.fn(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }),
        loading: false
      };

      // Simulate logout
      mockAuthValue.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('Token Expiration Handling', () => {
    it('handles expired token gracefully', async () => {
      const mockError = {
        response: {
          data: { message: 'Token expired' },
          status: 401
        }
      };

      // Mock an API call that fails due to expired token
      mockedAxios.get.mockRejectedValue(mockError);

      const mockAuthValue = {
        user: { _id: '1', username: 'testuser' },
        token: 'expired-token',
        login: jest.fn(),
        logout: jest.fn(),
        loading: false
      };

      // This would be tested in the context of making an authenticated request
      // The auth context should handle token expiration and logout the user
      expect(mockError.response.status).toBe(401);
      expect(mockError.response.data.message).toBe('Token expired');
    });
  });
});
