import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Action types
export const BUG_ACTIONS = {
  LOAD_BUGS_START: 'LOAD_BUGS_START',
  LOAD_BUGS_SUCCESS: 'LOAD_BUGS_SUCCESS',
  LOAD_BUGS_FAILURE: 'LOAD_BUGS_FAILURE',
  CREATE_BUG_START: 'CREATE_BUG_START',
  CREATE_BUG_SUCCESS: 'CREATE_BUG_SUCCESS',
  CREATE_BUG_FAILURE: 'CREATE_BUG_FAILURE',
  UPDATE_BUG_START: 'UPDATE_BUG_START',
  UPDATE_BUG_SUCCESS: 'UPDATE_BUG_SUCCESS',
  UPDATE_BUG_FAILURE: 'UPDATE_BUG_FAILURE',
  DELETE_BUG_SUCCESS: 'DELETE_BUG_SUCCESS',
  DELETE_BUG_FAILURE: 'DELETE_BUG_FAILURE',
  SET_FILTER: 'SET_FILTER',
  SET_SORT: 'SET_SORT',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial state
const initialState = {
  bugs: [],
  loading: false,
  error: null,
  filters: {
    status: '',
    priority: '',
    assignedTo: '',
    reportedBy: ''
  },
  sort: {
    field: 'createdAt',
    order: 'desc'
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  }
};

// Reducer
const bugReducer = (state, action) => {
  switch (action.type) {
    case BUG_ACTIONS.LOAD_BUGS_START:
    case BUG_ACTIONS.CREATE_BUG_START:
    case BUG_ACTIONS.UPDATE_BUG_START:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case BUG_ACTIONS.LOAD_BUGS_SUCCESS:
      return {
        ...state,
        bugs: action.payload.bugs,
        pagination: action.payload.pagination,
        loading: false,
        error: null
      };
      
    case BUG_ACTIONS.CREATE_BUG_SUCCESS:
      return {
        ...state,
        bugs: [action.payload, ...state.bugs],
        loading: false,
        error: null
      };
      
    case BUG_ACTIONS.UPDATE_BUG_SUCCESS:
      return {
        ...state,
        bugs: state.bugs.map(bug =>
          bug._id === action.payload._id ? action.payload : bug
        ),
        loading: false,
        error: null
      };
      
    case BUG_ACTIONS.DELETE_BUG_SUCCESS:
      return {
        ...state,
        bugs: state.bugs.filter(bug => bug._id !== action.payload),
        loading: false,
        error: null
      };
      
    case BUG_ACTIONS.LOAD_BUGS_FAILURE:
    case BUG_ACTIONS.CREATE_BUG_FAILURE:
    case BUG_ACTIONS.UPDATE_BUG_FAILURE:
    case BUG_ACTIONS.DELETE_BUG_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    case BUG_ACTIONS.SET_FILTER:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, page: 1 }
      };
      
    case BUG_ACTIONS.SET_SORT:
      return {
        ...state,
        sort: action.payload,
        pagination: { ...state.pagination, page: 1 }
      };
      
    case BUG_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    default:
      return state;
  }
};

// Context
const BugContext = createContext();

// Hook to use bug context
export const useBugs = () => {
  const context = useContext(BugContext);
  if (!context) {
    throw new Error('useBugs must be used within a BugProvider');
  }
  return context;
};

// Bug Provider Component
export const BugProvider = ({ children }) => {
  const [state, dispatch] = useReducer(bugReducer, initialState);
  const { token } = useAuth();

  // API helper function
  const apiCall = async (url, options = {}) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API call failed');
    }

    return data;
  };

  // Load bugs with filters and pagination
  const loadBugs = async (page = 1) => {
    dispatch({ type: BUG_ACTIONS.LOAD_BUGS_START });

    try {
      const queryParams = new URLSearchParams({
        page,
        limit: state.pagination.limit,
        sortBy: state.sort.field,
        sortOrder: state.sort.order,
        ...Object.fromEntries(
          Object.entries(state.filters).filter(([_, value]) => value)
        )
      });

      const data = await apiCall(`/api/bugs?${queryParams}`);
      
      dispatch({
        type: BUG_ACTIONS.LOAD_BUGS_SUCCESS,
        payload: data
      });
    } catch (error) {
      dispatch({
        type: BUG_ACTIONS.LOAD_BUGS_FAILURE,
        payload: error.message
      });
    }
  };

  // Create new bug
  const createBug = async (bugData) => {
    dispatch({ type: BUG_ACTIONS.CREATE_BUG_START });

    try {
      const data = await apiCall('/api/bugs', {
        method: 'POST',
        body: JSON.stringify(bugData)
      });

      dispatch({
        type: BUG_ACTIONS.CREATE_BUG_SUCCESS,
        payload: data
      });

      return { success: true, bug: data };
    } catch (error) {
      dispatch({
        type: BUG_ACTIONS.CREATE_BUG_FAILURE,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Update bug
  const updateBug = async (bugId, updateData) => {
    dispatch({ type: BUG_ACTIONS.UPDATE_BUG_START });

    try {
      const data = await apiCall(`/api/bugs/${bugId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      dispatch({
        type: BUG_ACTIONS.UPDATE_BUG_SUCCESS,
        payload: data
      });

      return { success: true, bug: data };
    } catch (error) {
      dispatch({
        type: BUG_ACTIONS.UPDATE_BUG_FAILURE,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Delete bug
  const deleteBug = async (bugId) => {
    try {
      await apiCall(`/api/bugs/${bugId}`, {
        method: 'DELETE'
      });

      dispatch({
        type: BUG_ACTIONS.DELETE_BUG_SUCCESS,
        payload: bugId
      });

      return { success: true };
    } catch (error) {
      dispatch({
        type: BUG_ACTIONS.DELETE_BUG_FAILURE,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Add comment to bug
  const addComment = async (bugId, comment) => {
    try {
      const data = await apiCall(`/api/bugs/${bugId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      });

      dispatch({
        type: BUG_ACTIONS.UPDATE_BUG_SUCCESS,
        payload: data
      });

      return { success: true, bug: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Assign bug
  const assignBug = async (bugId, assignedTo) => {
    return updateBug(bugId, { assignedTo });
  };

  // Set filters
  const setFilter = (filters) => {
    dispatch({
      type: BUG_ACTIONS.SET_FILTER,
      payload: filters
    });
  };

  // Set sort
  const setSort = (field, order = 'desc') => {
    dispatch({
      type: BUG_ACTIONS.SET_SORT,
      payload: { field, order }
    });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: BUG_ACTIONS.CLEAR_ERROR });
  };

  // Load bugs when filters or sort change
  useEffect(() => {
    if (token) {
      loadBugs();
    }
  }, [state.filters, state.sort, token]);

  const value = {
    ...state,
    loadBugs,
    createBug,
    updateBug,
    deleteBug,
    addComment,
    assignBug,
    setFilter,
    setSort,
    clearError
  };

  return (
    <BugContext.Provider value={value}>
      {children}
    </BugContext.Provider>
  );
};

export default BugContext;
