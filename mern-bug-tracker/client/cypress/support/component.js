// cypress/support/component.js - Cypress component testing support

import { mount } from 'cypress/react';

// Add the mount command to Cypress
Cypress.Commands.add('mount', mount);

// Example use:
// cy.mount(<MyComponent />)
