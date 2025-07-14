import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginForm = ({ onSuccess, switchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { login, loading, error, clearError } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear auth error when user starts typing
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const result = await login(formData);
    
    if (result.success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="login-form">
      <h2>Sign In</h2>
      <p className="form-subtitle">Access your bug tracker account</p>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`form-control ${validationErrors.email ? 'error' : ''}`}
            placeholder="Enter your email"
            required
            autoComplete="email"
          />
          {validationErrors.email && (
            <div className="field-error">{validationErrors.email}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`form-control ${validationErrors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {validationErrors.password && (
            <div className="field-error">{validationErrors.password}</div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="form-footer">
        <p>
          Don't have an account?{' '}
          <button
            type="button"
            className="link-button"
            onClick={switchToRegister}
          >
            Sign up here
          </button>
        </p>
      </div>

      {/* Demo credentials for testing */}
      {process.env.NODE_ENV === 'development' && (
        <div className="demo-credentials">
          <h4>Demo Credentials</h4>
          <div className="demo-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setFormData({
                email: 'admin@bugtracker.com',
                password: 'Admin123!'
              })}
            >
              Admin User
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setFormData({
                email: 'developer@bugtracker.com',
                password: 'Dev123!'
              })}
            >
              Developer
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setFormData({
                email: 'tester@bugtracker.com',
                password: 'Test123!'
              })}
            >
              Tester
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
