import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginForm from '../LoginForm';
import { AuthProvider } from '../../context/AuthContext';

// Mock the useAuth hook
const mockLogin = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      loading: false,
      error: null,
      clearError: mockClearError
    })
  };
});

const renderLoginForm = (props = {}) => {
  const defaultProps = {
    onSuccess: vi.fn(),
    switchToRegister: vi.fn(),
    ...props
  };

  return render(
    <AuthProvider>
      <LoginForm {...defaultProps} />
    </AuthProvider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with all required fields', () => {
    renderLoginForm();

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays validation errors for empty fields', async () => {
    renderLoginForm();

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('displays validation error for invalid email format', async () => {
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is invalid')).toBeInTheDocument();
    });
  });

  it('calls login function with correct credentials', async () => {
    mockLogin.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    renderLoginForm({ onSuccess });

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('toggles password visibility', () => {
    renderLoginForm();

    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls switchToRegister when register link is clicked', () => {
    const switchToRegister = vi.fn();
    renderLoginForm({ switchToRegister });

    const registerLink = screen.getByRole('button', { name: /sign up here/i });
    fireEvent.click(registerLink);

    expect(switchToRegister).toHaveBeenCalled();
  });

  it('clears error when user starts typing', async () => {
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    await waitFor(() => {
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  it('shows demo credentials in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderLoginForm();

    expect(screen.getByText('Demo Credentials')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admin user/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /developer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tester/i })).toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('fills form with demo credentials when demo button is clicked', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderLoginForm();

    const adminButton = screen.getByRole('button', { name: /admin user/i });
    fireEvent.click(adminButton);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveValue('admin@bugtracker.com');
    expect(passwordInput).toHaveValue('Admin123!');

    process.env.NODE_ENV = originalNodeEnv;
  });
});
