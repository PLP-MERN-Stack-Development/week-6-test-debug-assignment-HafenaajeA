// cypress/e2e/auth.cy.js - Authentication flow tests

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.logout(); // Ensure clean state
  });

  describe('User Registration', () => {
    it('should allow new user registration', () => {
      const newUser = {
        username: `testuser${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        role: 'developer'
      };

      cy.visit('/register');
      
      // Fill registration form
      cy.get('[name="username"]').type(newUser.username);
      cy.get('[name="email"]').type(newUser.email);
      cy.get('[name="password"]').type(newUser.password);
      cy.get('[name="confirmPassword"]').type(newUser.password);
      cy.get('[name="role"]').select(newUser.role);
      
      // Submit form
      cy.get('button[type="submit"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('Welcome').should('be.visible');
    });

    it('should show validation errors for invalid input', () => {
      cy.visit('/register');
      
      // Try to submit empty form
      cy.get('button[type="submit"]').click();
      
      // Should show validation errors
      cy.contains('Username is required').should('be.visible');
      cy.contains('Email is required').should('be.visible');
      cy.contains('Password is required').should('be.visible');
    });

    it('should show error for mismatched passwords', () => {
      cy.visit('/register');
      
      cy.get('[name="username"]').type('testuser');
      cy.get('[name="email"]').type('test@example.com');
      cy.get('[name="password"]').type('password123');
      cy.get('[name="confirmPassword"]').type('differentpassword');
      
      cy.get('button[type="submit"]').click();
      
      cy.contains('Passwords do not match').should('be.visible');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Setup test user
      cy.setupTestUser();
      cy.logout();
    });

    it('should allow user login with valid credentials', () => {
      cy.visit('/login');
      
      cy.get('[name="email"]').type('cypress@example.com');
      cy.get('[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('Dashboard').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('[name="email"]').type('wrong@example.com');
      cy.get('[name="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      
      cy.contains('Invalid credentials').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/login');
      
      cy.get('button[type="submit"]').click();
      
      cy.contains('Email is required').should('be.visible');
      cy.contains('Password is required').should('be.visible');
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      cy.setupTestUser();
      cy.visit('/dashboard');
    });

    it('should allow user to logout', () => {
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();
      
      // Should redirect to login page
      cy.url().should('include', '/login');
      cy.contains('Login').should('be.visible');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', () => {
      cy.visit('/dashboard');
      
      cy.url().should('include', '/login');
    });

    it('should allow authenticated users to access protected routes', () => {
      cy.setupTestUser();
      cy.visit('/dashboard');
      
      cy.url().should('include', '/dashboard');
      cy.contains('Dashboard').should('be.visible');
    });
  });
});
