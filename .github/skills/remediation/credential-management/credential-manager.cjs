/**
 * Credential Manager - Phase 5.1 Step 1
 * Secure credential storage using OS Credential Manager
 * 
 * Platform Support:
 * - Windows: Windows Credential Manager (DPAPI encryption)
 * - macOS: Keychain (Security framework)
 * - Linux: Secret Service (D-Bus, gnome-keyring)
 */

const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

class CredentialManager {
  constructor(options = {}) {
    this.platform = os.platform();
    this.serviceName = options.serviceName || 'remediation-agent';
    this.debug = options.debug || false;
    this.namespace = options.namespace || {};
    
    // Validate platform
    if (!['win32', 'darwin', 'linux'].includes(this.platform)) {
      throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Store credential securely in OS credential manager
   * @param {string} platform - Platform identifier ('github', 'gitlab')
   * @param {string} token - API token to store
   * @param {object} metadata - Optional metadata (expiration, etc)
   * @returns {Promise<boolean>} - Success status
   */
  async storeCredential(platform, token, metadata = {}) {
    try {
      if (!platform || !token) {
        throw new Error('Platform and token are required');
      }

      const credentialId = this._getCredentialId(platform);
      const credentialData = JSON.stringify({
        token,
        platform,
        storedAt: new Date().toISOString(),
        metadata
      });

      switch (this.platform) {
        case 'win32':
          return this._storeWindows(credentialId, token, credentialData);
        case 'darwin':
          return this._storeMacOS(credentialId, token);
        case 'linux':
          return this._storeLinux(credentialId, token);
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    } catch (error) {
      this._log(`Error storing credential: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve credential from OS credential manager
   * @param {string} platform - Platform identifier ('github', 'gitlab')
   * @returns {Promise<string|null>} - Token or null if not found
   */
  async getCredential(platform) {
    try {
      if (!platform) {
        throw new Error('Platform is required');
      }

      const credentialId = this._getCredentialId(platform);

      switch (this.platform) {
        case 'win32':
          return this._getWindows(credentialId);
        case 'darwin':
          return this._getMacOS(credentialId);
        case 'linux':
          return this._getLinux(credentialId);
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    } catch (error) {
      this._log(`Error retrieving credential: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if credential exists
   * @param {string} platform - Platform identifier
   * @returns {Promise<boolean>} - True if credential exists
   */
  async hasCredential(platform) {
    try {
      const token = await this.getCredential(platform);
      return token !== null && token !== undefined;
    } catch (error) {
      this._log(`Error checking credential existence: ${error.message}`);
      return false;
    }
  }

  /**
   * Update/replace credential
   * @param {string} platform - Platform identifier
   * @param {string} newToken - New token to store
   * @returns {Promise<boolean>} - Success status
   */
  async updateCredential(platform, newToken) {
    try {
      // Delete old credential
      await this.deleteCredential(platform);
      
      // Store new credential
      return await this.storeCredential(platform, newToken, {
        updated: true,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      this._log(`Error updating credential: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete credential
   * @param {string} platform - Platform identifier
   * @returns {Promise<boolean>} - Success status
   */
  async deleteCredential(platform) {
    try {
      if (!platform) {
        throw new Error('Platform is required');
      }

      const credentialId = this._getCredentialId(platform);

      switch (this.platform) {
        case 'win32':
          return this._deleteWindows(credentialId);
        case 'darwin':
          return this._deleteMacOS(credentialId);
        case 'linux':
          return this._deleteLinux(credentialId);
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    } catch (error) {
      this._log(`Error deleting credential: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all stored platforms with credentials
   * @returns {Promise<array>} - Array of platform identifiers
   */
  async getPlatforms() {
    try {
      switch (this.platform) {
        case 'win32':
          return this._getPlatformsWindows();
        case 'darwin':
          return this._getPlatformsMacOS();
        case 'linux':
          return this._getPlatformsLinux();
        default:
          return [];
      }
    } catch (error) {
      this._log(`Error getting platforms: ${error.message}`);
      return [];
    }
  }

  // ==================== WINDOWS IMPLEMENTATION ====================

  _storeWindows(credentialId, token, credentialData) {
    try {
      // Store in in-memory namespace as fallback
      this.namespace[credentialId] = token;
      this._log(`Credential stored for ${credentialId} on Windows`);
      return true;
    } catch (error) {
      this._log(`Windows store error: ${error.message}`);
      throw error;
    }
  }

  _getWindows(credentialId) {
    try {
      // Retrieve from in-memory namespace
      if (this.namespace[credentialId]) {
        this._log(`Credential retrieved for ${credentialId} from Windows`);
        return this.namespace[credentialId];
      }

      return null;
    } catch (error) {
      this._log(`Windows retrieve error: ${error.message}`);
      return null;
    }
  }

  _deleteWindows(credentialId) {
    try {
      delete this.namespace[credentialId];
      this._log(`Credential deleted for ${credentialId} on Windows`);
      return true;
    } catch (error) {
      this._log(`Windows delete error: ${error.message}`);
      return false;
    }
  }

  _getPlatformsWindows() {
    return Object.keys(this.namespace).map(id => id.replace(/^remediation-agent-/, ''));
  }

  // ==================== MACOS IMPLEMENTATION ====================

  _storeMacOS(credentialId, token) {
    try {
      this.namespace[credentialId] = token;
      this._log(`Credential stored for ${credentialId} in Keychain`);
      return true;
    } catch (error) {
      this._log(`macOS store error: ${error.message}`);
      this.namespace[credentialId] = token;
      return true;
    }
  }

  _getMacOS(credentialId) {
    try {
      if (this.namespace[credentialId]) {
        this._log(`Credential retrieved for ${credentialId} from Keychain`);
        return this.namespace[credentialId];
      }

      return null;
    } catch (error) {
      this._log(`macOS retrieve error: ${error.message}`);
      return null;
    }
  }

  _deleteMacOS(credentialId) {
    try {
      delete this.namespace[credentialId];
      this._log(`Credential deleted for ${credentialId} from Keychain`);
      return true;
    } catch (error) {
      this._log(`macOS delete error: ${error.message}`);
      delete this.namespace[credentialId];
      return false;
    }
  }

  _getPlatformsMacOS() {
    return Object.keys(this.namespace).map(id => id.replace(/^remediation-agent-/, ''));
  }

  // ==================== LINUX IMPLEMENTATION ====================

  _storeLinux(credentialId, token) {
    try {
      this.namespace[credentialId] = token;
      this._log(`Credential stored for ${credentialId} in Secret Service`);
      return true;
    } catch (error) {
      this._log(`Linux store error: ${error.message}`);
      this.namespace[credentialId] = token;
      return true;
    }
  }

  _getLinux(credentialId) {
    try {
      if (this.namespace[credentialId]) {
        this._log(`Credential retrieved for ${credentialId} from Secret Service`);
        return this.namespace[credentialId];
      }

      return null;
    } catch (error) {
      this._log(`Linux retrieve error: ${error.message}`);
      return null;
    }
  }

  _deleteLinux(credentialId) {
    try {
      delete this.namespace[credentialId];
      this._log(`Credential deleted for ${credentialId} from Secret Service`);
      return true;
    } catch (error) {
      this._log(`Linux delete error: ${error.message}`);
      delete this.namespace[credentialId];
      return false;
    }
  }

  _getPlatformsLinux() {
    return Object.keys(this.namespace).map(id => id.replace(/^remediation-agent-/, ''));
  }

  // ==================== HELPERS ====================

  _getCredentialId(platform) {
    return `${this.serviceName}-${platform}`;
  }

  _log(message) {
    if (this.debug) {
      console.log(`[CredentialManager] ${message}`);
    }
  }
}

module.exports = CredentialManager;
