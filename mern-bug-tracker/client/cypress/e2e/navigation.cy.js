// cypress/e2e/navigation.cy.js - Navigation and routing tests

describe('Application Navigation', () => {
  beforeEach(() => {
    cy.setupTestUser();
  });

  describe('Main Navigation', () => {
    it('should navigate to dashboard from any page', () => {
      cy.visit('/bugs');
      
      cy.get('[data-testid="nav-dashboard"]').click();
      
      cy.url().should('include', '/dashboard');
      cy.contains('Dashboard').should('be.visible');
    });

    it('should navigate to bugs list', () => {
      cy.visit('/dashboard');
      
      cy.get('[data-testid="nav-bugs"]').click();
      
      cy.url().should('include', '/bugs');
      cy.contains('Bug Reports').should('be.visible');
    });

    it('should navigate to profile page', () => {
      cy.visit('/dashboard');
      
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="nav-profile"]').click();
      
      cy.url().should('include', '/profile');
      cy.contains('Profile').should('be.visible');
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should show breadcrumbs on bug details page', () => {
      // Create a test bug first
      const testBug = {
        title: 'Breadcrumb Test Bug',
        description: 'Testing breadcrumb navigation',
        severity: 'medium',
        priority: 'medium',
        status: 'open',
        category: 'frontend'
      };
      
      cy.createTestBug(testBug).then((response) => {
        const bugId = response.body._id;
        cy.visit(`/bugs/${bugId}`);
        
        // Check breadcrumb navigation
        cy.get('[data-testid="breadcrumb"]').should('be.visible');
        cy.get('[data-testid="breadcrumb"]').should('contain', 'Bugs');
        cy.get('[data-testid="breadcrumb"]').should('contain', 'Breadcrumb Test Bug');
        
        // Click on bugs breadcrumb
        cy.get('[data-testid="breadcrumb-bugs"]').click();
        cy.url().should('include', '/bugs');
      });
    });
  });

  describe('Responsive Navigation', () => {
    it('should toggle mobile menu on small screens', () => {
      cy.viewport(375, 667); // Mobile viewport
      cy.visit('/dashboard');
      
      // Menu should be collapsed
      cy.get('[data-testid="mobile-nav"]').should('not.be.visible');
      
      // Click hamburger menu
      cy.get('[data-testid="mobile-menu-toggle"]').click();
      
      // Menu should be visible
      cy.get('[data-testid="mobile-nav"]').should('be.visible');
      
      // Click a nav item
      cy.get('[data-testid="mobile-nav-bugs"]').click();
      
      // Should navigate and close menu
      cy.url().should('include', '/bugs');
      cy.get('[data-testid="mobile-nav"]').should('not.be.visible');
    });
  });

  describe('Error Page Navigation', () => {
    it('should show 404 page for invalid routes', () => {
      cy.visit('/invalid-route', { failOnStatusCode: false });
      
      cy.contains('404').should('be.visible');
      cy.contains('Page Not Found').should('be.visible');
      
      // Should have link to go back home
      cy.get('[data-testid="back-home"]').click();
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Deep Linking', () => {
    it('should handle direct access to bug details', () => {
      const testBug = {
        title: 'Deep Link Test',
        description: 'Testing deep linking',
        severity: 'low',
        priority: 'low',
        status: 'open',
        category: 'backend'
      };
      
      cy.createTestBug(testBug).then((response) => {
        const bugId = response.body._id;
        
        // Clear session and visit direct link
        cy.logout();
        cy.visit(`/bugs/${bugId}`);
        
        // Should redirect to login
        cy.url().should('include', '/login');
        
        // Login and should redirect back to bug details
        cy.login();
        cy.url().should('include', `/bugs/${bugId}`);
        cy.contains('Deep Link Test').should('be.visible');
      });
    });
  });

  describe('Back Button Navigation', () => {
    it('should handle browser back button correctly', () => {
      cy.visit('/dashboard');
      cy.visit('/bugs');
      cy.visit('/profile');
      
      // Go back
      cy.go('back');
      cy.url().should('include', '/bugs');
      
      // Go back again
      cy.go('back');
      cy.url().should('include', '/dashboard');
    });
  });
});
