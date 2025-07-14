// cypress/e2e/error-handling.cy.js - Error handling and edge cases

describe('Error Handling and Edge Cases', () => {
  beforeEach(() => {
    cy.setupTestUser();
  });

  describe('Network Error Handling', () => {
    it('should handle API connection errors gracefully', () => {
      // Intercept API calls and return network error
      cy.intercept('GET', '**/api/bugs', { forceNetworkError: true }).as('getBugsError');
      
      cy.visit('/bugs');
      
      // Should show error message
      cy.contains('Unable to connect').should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should retry failed requests', () => {
      let callCount = 0;
      cy.intercept('GET', '**/api/bugs', (req) => {
        callCount++;
        if (callCount === 1) {
          req.reply({ forceNetworkError: true });
        } else {
          req.reply({ fixture: 'bugs.json' });
        }
      }).as('getBugsRetry');
      
      cy.visit('/bugs');
      
      // Click retry button
      cy.get('[data-testid="retry-button"]').click();
      
      // Should eventually load successfully
      cy.contains('Bug Reports').should('be.visible');
    });
  });

  describe('Form Validation Edge Cases', () => {
    it('should handle extremely long input values', () => {
      const longTitle = 'A'.repeat(1000);
      
      cy.visit('/bugs/new');
      
      cy.get('[name="title"]').type(longTitle);
      cy.get('[name="description"]').type('Test description');
      
      cy.get('button[type="submit"]').click();
      
      cy.contains('Title is too long').should('be.visible');
    });

    it('should handle special characters in input', () => {
      const specialTitle = '<script>alert("xss")</script>';
      
      cy.visit('/bugs/new');
      
      cy.get('[name="title"]').type(specialTitle);
      cy.get('[name="description"]').type('Test description');
      
      cy.get('button[type="submit"]').click();
      
      // Should not execute script, should treat as text
      cy.on('window:alert', () => {
        throw new Error('XSS vulnerability detected!');
      });
      
      cy.checkNotification('Bug created successfully');
    });

    it('should handle emoji and unicode characters', () => {
      const emojiTitle = '🐛 Bug with emojis 测试';
      
      cy.visit('/bugs/new');
      
      cy.get('[name="title"]').type(emojiTitle);
      cy.get('[name="description"]').type('Testing unicode support 🚀');
      
      cy.get('button[type="submit"]').click();
      
      cy.checkNotification('Bug created successfully');
      cy.contains(emojiTitle).should('be.visible');
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle expired tokens gracefully', () => {
      // Set an expired token
      window.localStorage.setItem('token', 'expired.jwt.token');
      
      cy.visit('/bugs');
      
      // Should redirect to login
      cy.url().should('include', '/login');
      cy.contains('Session expired').should('be.visible');
    });

    it('should handle concurrent login sessions', () => {
      cy.login();
      cy.visit('/dashboard');
      
      // Simulate token being invalidated by another session
      cy.window().then((win) => {
        win.localStorage.removeItem('token');
      });
      
      // Try to perform an action that requires auth
      cy.get('[data-testid="new-bug-button"]').click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });

  describe('Data Loading Edge Cases', () => {
    it('should handle empty data sets gracefully', () => {
      cy.intercept('GET', '**/api/bugs', { body: [] }).as('getEmptyBugs');
      
      cy.visit('/bugs');
      
      cy.contains('No bugs found').should('be.visible');
      cy.get('[data-testid="empty-state"]').should('be.visible');
    });

    it('should handle large data sets with pagination', () => {
      // Create a large dataset
      const largeBugList = Array.from({ length: 100 }, (_, i) => ({
        _id: `bug-${i}`,
        title: `Bug ${i}`,
        description: `Description ${i}`,
        severity: 'medium',
        priority: 'medium',
        status: 'open',
        createdAt: new Date().toISOString()
      }));
      
      cy.intercept('GET', '**/api/bugs**', (req) => {
        const page = req.query.page || 1;
        const limit = req.query.limit || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        req.reply({
          body: largeBugList.slice(startIndex, endIndex),
          headers: {
            'x-total-count': largeBugList.length.toString()
          }
        });
      }).as('getPaginatedBugs');
      
      cy.visit('/bugs');
      
      // Should show pagination controls
      cy.get('[data-testid="pagination"]').should('be.visible');
      cy.get('[data-testid="next-page"]').click();
      
      // Should load next page
      cy.contains('Bug 10').should('be.visible');
    });
  });

  describe('File Upload Edge Cases', () => {
    it('should handle oversized file uploads', () => {
      cy.visit('/bugs/new');
      
      cy.get('[name="title"]').type('File upload test');
      cy.get('[name="description"]').type('Testing file upload');
      
      // Try to upload a large file (simulate)
      cy.get('[data-testid="file-upload"]').selectFile({
        contents: 'x'.repeat(10 * 1024 * 1024), // 10MB
        fileName: 'large-file.txt'
      });
      
      cy.contains('File is too large').should('be.visible');
    });

    it('should handle invalid file types', () => {
      cy.visit('/bugs/new');
      
      cy.get('[name="title"]').type('File upload test');
      cy.get('[name="description"]').type('Testing file upload');
      
      // Try to upload an invalid file type
      cy.get('[data-testid="file-upload"]').selectFile({
        contents: 'invalid content',
        fileName: 'malicious.exe'
      });
      
      cy.contains('Invalid file type').should('be.visible');
    });
  });

  describe('Browser Compatibility', () => {
    it('should work with disabled JavaScript fallbacks', () => {
      // This would require special setup for testing without JS
      cy.log('Testing graceful degradation when JS is disabled');
    });

    it('should handle slow network conditions', () => {
      // Simulate slow network
      cy.intercept('GET', '**/api/bugs', (req) => {
        req.reply((res) => {
          res.delay(5000); // 5 second delay
          res.send({ fixture: 'bugs.json' });
        });
      }).as('getSlowBugs');
      
      cy.visit('/bugs');
      
      // Should show loading indicator
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      
      // Should eventually load
      cy.contains('Bug Reports', { timeout: 10000 }).should('be.visible');
    });
  });
});
