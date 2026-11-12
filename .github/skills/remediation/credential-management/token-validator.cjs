/**
 * Token Validator - Phase 5.1 Step 2
 * Validates credentials, checks expiration, and sanitizes logs
 */

class TokenValidator {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.tokenPatterns = {
      github: /^(ghp_|ghu_|ghs_|ghr_)/,
      gitlab: /^(glpat-|glsoat-|glptt-)/
    };
    this.tokenMasks = {
      github: 'ghp_***',
      gitlab: 'glpat-***'
    };
  }

  /**
   * Validate token format for a given platform
   * @param {string} token - Token to validate
   * @param {string} platform - Platform ('github' or 'gitlab')
   * @returns {object} - Validation result { valid, error }
   */
  validateFormat(token, platform) {
    try {
      if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Token must be a non-empty string' };
      }

      if (!platform || !this.tokenPatterns[platform]) {
        return { valid: false, error: `Invalid platform: ${platform}` };
      }

      const pattern = this.tokenPatterns[platform];
      if (!pattern.test(token)) {
        return {
          valid: false,
          error: `Token does not match ${platform} format`
        };
      }

      if (token.length < 20) {
        return {
          valid: false,
          error: `Token too short (${token.length} chars, minimum 20)`
        };
      }

      return { valid: true, error: null };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Check if token is expired
   * @param {object} metadata - Token metadata { expiresAt }
   * @returns {boolean} - True if expired
   */
  isExpired(metadata = {}) {
    try {
      if (!metadata.expiresAt) {
        return false; // No expiration set
      }

      const expirationDate = new Date(metadata.expiresAt);
      const now = new Date();

      return now > expirationDate;
    } catch (error) {
      this._log(`Error checking expiration: ${error.message}`);
      return false;
    }
  }

  /**
   * Get time until expiration
   * @param {object} metadata - Token metadata { expiresAt }
   * @returns {object} - { daysRemaining, hoursRemaining, message }
   */
  getTimeToExpiration(metadata = {}) {
    try {
      if (!metadata.expiresAt) {
        return {
          daysRemaining: null,
          hoursRemaining: null,
          message: 'No expiration set'
        };
      }

      const expirationDate = new Date(metadata.expiresAt);
      const now = new Date();
      const msRemaining = expirationDate - now;

      if (msRemaining < 0) {
        return {
          daysRemaining: 0,
          hoursRemaining: 0,
          message: 'Token has expired'
        };
      }

      const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.floor(
        (msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );

      return {
        daysRemaining,
        hoursRemaining,
        message: `${daysRemaining} days, ${hoursRemaining} hours remaining`
      };
    } catch (error) {
      this._log(`Error calculating time to expiration: ${error.message}`);
      return { daysRemaining: null, hoursRemaining: null, message: 'Error' };
    }
  }

  /**
   * Check if token will expire soon (within N days)
   * @param {object} metadata - Token metadata { expiresAt }
   * @param {number} days - Days threshold (default: 7)
   * @returns {boolean} - True if expiring soon
   */
  isExpiringSoon(metadata = {}, days = 7) {
    try {
      if (!metadata.expiresAt) {
        return false;
      }

      const expirationDate = new Date(metadata.expiresAt);
      const now = new Date();
      const expirationThreshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      return expirationDate <= expirationThreshold && expirationDate > now;
    } catch (error) {
      this._log(`Error checking expiration soon: ${error.message}`);
      return false;
    }
  }

  /**
   * Sanitize output for safe logging (mask tokens)
   * @param {string} text - Text that may contain tokens
   * @returns {string} - Sanitized text with tokens masked
   */
  sanitizeOutput(text) {
    try {
      if (!text || typeof text !== 'string') {
        return text;
      }

      let sanitized = text;

      // Mask GitHub tokens (at least 36 chars after prefix)
      sanitized = sanitized.replace(/ghp_[a-zA-Z0-9_]{20,}/g, this.tokenMasks.github);
      sanitized = sanitized.replace(/ghu_[a-zA-Z0-9_]{20,}/g, 'ghu_***');
      sanitized = sanitized.replace(/ghs_[a-zA-Z0-9_]{20,}/g, 'ghs_***');
      sanitized = sanitized.replace(/ghr_[a-zA-Z0-9_]{20,}/g, 'ghr_***');

      // Mask GitLab tokens
      sanitized = sanitized.replace(/glpat-[a-zA-Z0-9_-]{10,}/g, this.tokenMasks.gitlab);
      sanitized = sanitized.replace(/glsoat-[a-zA-Z0-9_-]{10,}/g, 'glsoat-***');
      sanitized = sanitized.replace(/glptt-[a-zA-Z0-9_-]{10,}/g, 'glptt-***');

      return sanitized;
    } catch (error) {
      this._log(`Error sanitizing output: ${error.message}`);
      return text;
    }
  }

  /**
   * Validate token permissions (mock implementation)
   * @param {string} token - Token to validate
   * @param {string} platform - Platform ('github' or 'gitlab')
   * @param {array} requiredScopes - Required permission scopes
   * @returns {Promise<object>} - { valid, scopes, missing }
   */
  async validatePermissions(token, platform, requiredScopes = []) {
    try {
      // In real implementation, this would call GitHub/GitLab API
      // For now, return mock validation

      const result = {
        valid: true,
        scopes: ['repo', 'workflow', 'read:user', 'admin:repo_hook'],
        missing: []
      };

      if (requiredScopes.length > 0) {
        result.missing = requiredScopes.filter(
          scope => !result.scopes.includes(scope)
        );
        result.valid = result.missing.length === 0;
      }

      this._log(
        `Permission validation for ${platform}: ${result.valid ? 'valid' : 'invalid'}`
      );

      return result;
    } catch (error) {
      this._log(`Error validating permissions: ${error.message}`);
      return {
        valid: false,
        scopes: [],
        missing: requiredScopes,
        error: error.message
      };
    }
  }

  /**
   * Comprehensive token validation
   * @param {string} token - Token to validate
   * @param {string} platform - Platform
   * @param {object} metadata - Token metadata
   * @returns {object} - Complete validation result
   */
  validateToken(token, platform, metadata = {}) {
    try {
      const result = {
        platform,
        valid: true,
        issues: [],
        checks: {
          format: this.validateFormat(token, platform),
          expired: this.isExpired(metadata),
          expiringSoon: this.isExpiringSoon(metadata)
        }
      };

      // Check format
      if (!result.checks.format.valid) {
        result.valid = false;
        result.issues.push(`Format: ${result.checks.format.error}`);
      }

      // Check expiration
      if (result.checks.expired) {
        result.valid = false;
        result.issues.push('Token has expired');
      }

      // Check if expiring soon (warning only, doesn't invalidate)
      if (result.checks.expiringSoon) {
        // This is a warning, not a validation failure
        // Only add to issues but don't set valid to false
      }

      return result;
    } catch (error) {
      return {
        platform,
        valid: false,
        issues: [error.message],
        checks: {}
      };
    }
  }

  /**
   * Get supported platforms
   * @returns {array} - List of supported platforms
   */
  getSupportedPlatforms() {
    return Object.keys(this.tokenPatterns);
  }

  _log(message) {
    if (this.debug) {
      console.log(`[TokenValidator] ${message}`);
    }
  }
}

module.exports = TokenValidator;
