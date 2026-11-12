/**
 * Repository Config Manager - Phase 5.1 Step 3
 * Manages multi-repository configurations without storing credentials
 */

const fs = require('fs');
const path = require('path');

class RepositoryConfigManager {
  constructor(options = {}) {
    this.configDir = options.configDir || path.join(process.cwd(), '.remediation');
    this.debug = options.debug || false;
    this.repositories = new Map();
    
    this._ensureConfigDir();
  }

  /**
   * Add or update repository configuration
   * @param {object} config - Repository configuration
   * @returns {Promise<boolean>} - Success status
   */
  async addRepository(config) {
    try {
      // Validate required fields
      if (!config.platform || !config.owner || !config.repo) {
        throw new Error('Configuration must include platform, owner, and repo');
      }

      if (!['github', 'gitlab'].includes(config.platform)) {
        throw new Error(`Invalid platform: ${config.platform}`);
      }

      // Check for credential leakage FIRST
      if (config.token || config.apiKey || config.password) {
        throw new Error('Credentials must not be stored in repository configuration');
      }

      // Normalize configuration (no credentials stored here)
      const normalizedConfig = {
        platform: config.platform,
        owner: config.owner,
        repo: config.repo,
        url: config.url || this._buildUrl(config),
        branch: config.branch || 'main',
        autoMerge: config.autoMerge !== undefined ? config.autoMerge : false,
        reviewers: config.reviewers || [],
        labels: config.labels || [],
        settings: config.settings || {},
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Reject any credential fields in settings
      if (normalizedConfig.settings.token || normalizedConfig.settings.apiKey) {
        throw new Error('Credentials must not be stored in repository configuration');
      }

      const configId = this._getConfigId(config.platform, config.owner, config.repo);
      this.repositories.set(configId, normalizedConfig);
      
      await this._saveConfigs();
      this._log(`Repository added: ${configId}`);
      
      return true;
    } catch (error) {
      this._log(`Error adding repository: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get repository configuration
   * @param {string} platform - Platform identifier
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<object|null>} - Configuration or null if not found
   */
  async getRepository(platform, owner, repo) {
    try {
      const configId = this._getConfigId(platform, owner, repo);
      return this.repositories.get(configId) || null;
    } catch (error) {
      this._log(`Error getting repository: ${error.message}`);
      return null;
    }
  }

  /**
   * List all repositories for a platform
   * @param {string} platform - Platform identifier (optional)
   * @returns {Promise<array>} - Array of repository configurations
   */
  async listRepositories(platform = null) {
    try {
      const repos = Array.from(this.repositories.values());
      
      if (platform) {
        return repos.filter(r => r.platform === platform);
      }
      
      return repos;
    } catch (error) {
      this._log(`Error listing repositories: ${error.message}`);
      return [];
    }
  }

  /**
   * Update repository configuration
   * @param {string} platform - Platform identifier
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {object} updates - Partial configuration updates
   * @returns {Promise<boolean>} - Success status
   */
  async updateRepository(platform, owner, repo, updates) {
    try {
      const configId = this._getConfigId(platform, owner, repo);
      const existing = this.repositories.get(configId);
      
      if (!existing) {
        throw new Error(`Repository not found: ${configId}`);
      }

      // Reject credential updates
      if (updates.token || updates.apiKey || (updates.settings && (updates.settings.token || updates.settings.apiKey))) {
        throw new Error('Credentials must not be stored in repository configuration');
      }

      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.repositories.set(configId, updated);
      await this._saveConfigs();
      this._log(`Repository updated: ${configId}`);
      
      return true;
    } catch (error) {
      this._log(`Error updating repository: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove repository configuration
   * @param {string} platform - Platform identifier
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<boolean>} - Success status
   */
  async removeRepository(platform, owner, repo) {
    try {
      const configId = this._getConfigId(platform, owner, repo);
      const deleted = this.repositories.delete(configId);
      
      if (deleted) {
        await this._saveConfigs();
        this._log(`Repository removed: ${configId}`);
      }
      
      return deleted;
    } catch (error) {
      this._log(`Error removing repository: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if repository is configured
   * @param {string} platform - Platform identifier
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<boolean>} - True if configured
   */
  async hasRepository(platform, owner, repo) {
    try {
      const configId = this._getConfigId(platform, owner, repo);
      return this.repositories.has(configId);
    } catch (error) {
      this._log(`Error checking repository: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate repository configuration
   * @param {object} config - Configuration to validate
   * @returns {object} - Validation result { valid, errors }
   */
  validateConfig(config) {
    const errors = [];

    if (!config) {
      return { valid: false, errors: ['Configuration is required'] };
    }

    if (!config.platform) {
      errors.push('Platform is required');
    } else if (!['github', 'gitlab'].includes(config.platform)) {
      errors.push(`Invalid platform: ${config.platform}`);
    }

    if (!config.owner) {
      errors.push('Owner is required');
    } else if (typeof config.owner !== 'string') {
      errors.push('Owner must be a string');
    }

    if (!config.repo) {
      errors.push('Repo is required');
    } else if (typeof config.repo !== 'string') {
      errors.push('Repo must be a string');
    }

    if (config.branch && typeof config.branch !== 'string') {
      errors.push('Branch must be a string');
    }

    if (config.autoMerge && typeof config.autoMerge !== 'boolean') {
      errors.push('AutoMerge must be a boolean');
    }

    if (config.reviewers && !Array.isArray(config.reviewers)) {
      errors.push('Reviewers must be an array');
    }

    if (config.labels && !Array.isArray(config.labels)) {
      errors.push('Labels must be an array');
    }

    // Check for credential leakage
    if (config.token || config.apiKey || config.password) {
      errors.push('Credentials must not be stored in configuration');
    }

    if (config.settings) {
      if (config.settings.token || config.settings.apiKey || config.settings.password) {
        errors.push('Credentials must not be stored in settings');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export configurations (without credentials)
   * @returns {Promise<object>} - All configurations
   */
  async exportConfigs() {
    try {
      const configs = {};
      for (const [key, value] of this.repositories) {
        configs[key] = value;
      }
      return configs;
    } catch (error) {
      this._log(`Error exporting configs: ${error.message}`);
      return {};
    }
  }

  /**
   * Import configurations
   * @param {object} configs - Configurations to import
   * @returns {Promise<boolean>} - Success status
   */
  async importConfigs(configs) {
    try {
      for (const [key, config] of Object.entries(configs)) {
        const validation = this.validateConfig(config);
        if (!validation.valid) {
          throw new Error(`Invalid config ${key}: ${validation.errors.join(', ')}`);
        }
        this.repositories.set(key, config);
      }
      
      await this._saveConfigs();
      this._log(`Imported ${Object.keys(configs).length} configurations`);
      
      return true;
    } catch (error) {
      this._log(`Error importing configs: ${error.message}`);
      throw error;
    }
  }

  // ==================== PRIVATE METHODS ====================

  _getConfigId(platform, owner, repo) {
    return `${platform}-${owner.toLowerCase()}-${repo.toLowerCase()}`;
  }

  _buildUrl(config) {
    switch (config.platform) {
      case 'github':
        return `https://github.com/${config.owner}/${config.repo}`;
      case 'gitlab':
        return `https://gitlab.com/${config.owner}/${config.repo}`;
      default:
        return '';
    }
  }

  _ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      this._log(`Created config directory: ${this.configDir}`);
    }
  }

  async _saveConfigs() {
    try {
      const configFile = path.join(this.configDir, 'repositories.json');
      const data = {};
      
      for (const [key, value] of this.repositories) {
        data[key] = value;
      }
      
      fs.writeFileSync(configFile, JSON.stringify(data, null, 2), 'utf8');
      this._log(`Configurations saved to ${configFile}`);
    } catch (error) {
      this._log(`Error saving configs: ${error.message}`);
      throw error;
    }
  }

  async _loadConfigs() {
    try {
      const configFile = path.join(this.configDir, 'repositories.json');
      
      if (fs.existsSync(configFile)) {
        const data = fs.readFileSync(configFile, 'utf8');
        const configs = JSON.parse(data);
        
        for (const [key, value] of Object.entries(configs)) {
          this.repositories.set(key, value);
        }
        
        this._log(`Loaded ${this.repositories.size} configurations`);
      }
    } catch (error) {
      this._log(`Error loading configs: ${error.message}`);
    }
  }

  _log(message) {
    if (this.debug) {
      console.log(`[RepositoryConfigManager] ${message}`);
    }
  }
}

module.exports = RepositoryConfigManager;
