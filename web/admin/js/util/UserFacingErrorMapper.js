/**
 * UserFacingErrorMapper.js — Parity with Desktop UserFacingErrorMapper.java
 * Translates raw technical database, network, and runtime exceptions into
 * clear, actionable plain-English explanations for users and operators.
 */
(function() {
  const HTTP_REGEX = /(?:^|[^A-Za-z0-9])HTTP\s*[:#-]?\s*([1-5][0-9]{2})(?=$|[^0-9])/i;

  function clean(str) {
    return (str == null) ? '' : String(str).trim();
  }

  function statusSummary(code) {
    switch (code) {
      case '400': return 'Bad request';
      case '401': return 'Authentication required';
      case '403': return 'Access denied';
      case '404': return 'Resource not found';
      case '408':
      case '504': return 'Request timed out';
      case '409': return 'Request conflict';
      case '422': return 'Validation failed';
      case '429': return 'Too many requests';
      case '500': return 'Server request failed';
      case '502': return 'Gateway request failed';
      case '503': return 'Service unavailable';
      default: return 'Request failed';
    }
  }

  const UserFacingErrorMapper = {
    title(raw) {
      const value = clean(raw);
      if (!value) return 'Operation Incomplete';
      const lower = value.toLowerCase();

      if (lower.includes('duplicate key') || lower.includes('23505') || lower.includes('unique constraint')) {
        return 'Duplicate Identifier Conflict';
      }
      if (lower.includes('foreign key') || lower.includes('23503') || lower.includes('referenced by')) {
        return 'Linked Record Dependency';
      }
      if (lower.includes('concurrentedit') || lower.includes('optimistic locking') || lower.includes('row_version')) {
        return 'Simultaneous Edit Conflict';
      }
      if (lower.includes('lock timeout') || lower.includes('could not obtain lock') || lower.includes('deadlock')) {
        return 'Database Lock Wait Timeout';
      }
      if (lower.includes('connection refused') || lower.includes('connectexception') || lower.includes('unknownhost') || lower.includes('failed to fetch')) {
        return 'Server Connection Unavailable';
      }
      if (lower.includes('column') && lower.includes('does not exist')) {
        return 'Database Schema Mismatch';
      }
      if (lower.includes('numberformatexception') || lower.includes('for input string') || lower.includes('nan')) {
        return 'Invalid Numeric Format';
      }
      if (lower.includes('nullpointerexception') || lower.includes('illegalstateexception') || lower.includes('cannot read property') || lower.includes('is not a function')) {
        return 'Internal Application Error';
      }
      const match = value.match(HTTP_REGEX);
      if (match) {
        return `HTTP ${match[1]} • ${statusSummary(match[1])}`;
      }
      return 'Application Diagnostic Event';
    },

    action(raw) {
      const value = clean(raw);
      if (!value) return 'Please retry the operation.';
      const lower = value.toLowerCase();

      if (lower.includes('duplicate key') || lower.includes('23505') || lower.includes('unique constraint')) {
        return 'Review the reference sequence or enter an alternative unique code.';
      }
      if (lower.includes('foreign key') || lower.includes('23503') || lower.includes('referenced by')) {
        return 'Remove the dependent line items or associated vouchers before proceeding.';
      }
      if (lower.includes('concurrentedit') || lower.includes('optimistic locking') || lower.includes('row_version')) {
        return 'Click Refresh to load the latest values and re-apply your changes.';
      }
      if (lower.includes('lock timeout') || lower.includes('could not obtain lock') || lower.includes('deadlock')) {
        return 'Wait a few seconds for the background lock to release, then retry.';
      }
      if (lower.includes('connection refused') || lower.includes('connectexception') || lower.includes('unknownhost') || lower.includes('failed to fetch')) {
        return 'Check your network or server status. Your current unsaved form data is safe.';
      }
      if (lower.includes('column') && lower.includes('does not exist')) {
        return 'Verify that all Flyway database migrations have been executed.';
      }
      return 'Review the details above or retry the operation.';
    },

    message(raw) {
      const value = clean(raw);
      if (!value) return 'The operation could not be completed. Your current work has not been cleared. Please try again.';
      const lower = value.toLowerCase();

      if (lower === 'empty string' || lower.startsWith('for input string:') || lower.includes('numberformatexception')) {
        return 'A required value is blank or invalid. Review the entered information and try again.';
      }
      if (lower.includes('nullpointerexception') || lower.includes('illegalstateexception')
          || lower.includes('stacktrace') || lower.startsWith('java.') || lower.startsWith('org.springframework.')) {
        return 'The ERP could not complete this operation. Your current work has not been cleared. Please try again; if it continues, contact support.';
      }
      if ((value.startsWith('{') && value.endsWith('}'))
          || lower.startsWith('operations api error (500)')
          || lower.startsWith('master api error (500)')
          || lower.startsWith('bank statement api error (500)')) {
        return 'The ERP server could not complete this request. Your current work has not been cleared. Please try again.';
      }
      if (lower.includes('duplicate key') || lower.includes('23505') || lower.includes('unique constraint')) {
        return 'A record with this reference or number already exists in the system. Please use a unique identifier.';
      }
      if (lower.includes('foreign key') || lower.includes('23503') || lower.includes('referenced by')) {
        return 'This item cannot be deleted or modified because it is currently linked to existing transactions.';
      }
      if (lower.includes('concurrentedit') || lower.includes('optimistic locking') || lower.includes('row_version')) {
        return 'Another operator has updated this record simultaneously. Please refresh to load the latest values and retry.';
      }
      if (lower.includes('lock timeout') || lower.includes('could not obtain lock') || lower.includes('deadlock')) {
        return 'The database is currently synchronizing another transaction on this record. Please wait a moment and try again.';
      }
      if (lower.includes('connection refused') || lower.includes('connectexception') || lower.includes('unknownhost') || lower.includes('failed to fetch')) {
        return 'The ERP server could not be reached. Check the connection and try again. Your current work remains open.';
      }
      return value;
    },

    reference(raw) {
      const value = clean(raw);
      const match = value.match(HTTP_REGEX);
      if (match) return `HTTP ${match[1]} • ${statusSummary(match[1])}`;
      return 'Your current work remains available unless the message above states otherwise.';
    }
  };

  window.UserFacingErrorMapper = UserFacingErrorMapper;
})();
