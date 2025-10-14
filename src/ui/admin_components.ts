import { APP_CONSTANTS } from '../constants';

/**
 * Admin UI Components Module
 * Contains reusable HTML components and styles for admin interface
 */

export class AdminUIComponents {
  /**
   * Generate CSS styles for admin interface
   */
  static getStyles(): string {
    return `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: #333;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.CONTAINER} {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          overflow: hidden;
        }

        .header {
          background: linear-gradient(135deg, ${APP_CONSTANTS.COLORS.PRIMARY} 0%, #0056b3 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }

        .header h1 {
          margin: 0;
          font-size: 2.5em;
          font-weight: 300;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.SECTION} {
          padding: 30px;
          border-bottom: 1px solid #eee;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.SECTION}:last-child {
          border-bottom: none;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.SECTION} h2 {
          margin: 0 0 20px 0;
          color: ${APP_CONSTANTS.COLORS.DARK};
          font-size: 1.5em;
          font-weight: 500;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.BUTTON} {
          background: ${APP_CONSTANTS.COLORS.PRIMARY};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
          margin: 5px;
          text-decoration: none;
          display: inline-block;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.BUTTON}:hover {
          background: #0056b3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,123,255,0.3);
        }

        .${APP_CONSTANTS.UI_ELEMENTS.BUTTON}.success {
          background: ${APP_CONSTANTS.COLORS.SUCCESS};
        }

        .${APP_CONSTANTS.UI_ELEMENTS.BUTTON}.success:hover {
          background: #218838;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.BUTTON}.warning {
          background: ${APP_CONSTANTS.COLORS.WARNING};
          color: #212529;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.BUTTON}.warning:hover {
          background: #e0a800;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.BUTTON}.danger {
          background: ${APP_CONSTANTS.COLORS.DANGER};
        }

        .${APP_CONSTANTS.UI_ELEMENTS.BUTTON}.danger:hover {
          background: #c82333;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.LOG_CONTAINER} {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 15px;
          height: 200px;
          overflow-y: auto;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          line-height: 1.4;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.STATUS_MESSAGE} {
          padding: 12px;
          border-radius: 6px;
          margin: 10px 0;
          font-weight: 500;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.STATUS_MESSAGE}.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.STATUS_MESSAGE}.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.CHAINS_GRID} {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.CHAIN_CARD} {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .${APP_CONSTANTS.UI_ELEMENTS.CHAIN_CARD}:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .${APP_CONSTANTS.UI_ELEMENTS.FORM} {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          display: none;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: ${APP_CONSTANTS.COLORS.DARK};
        }

        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: ${APP_CONSTANTS.COLORS.PRIMARY};
          box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }

        .form-actions {
          margin-top: 20px;
          text-align: right;
        }

        .hidden {
          display: none !important;
        }

        .rpc-item {
          border: 1px solid #ddd;
          padding: 15px;
          margin: 10px 0;
          border-radius: 6px;
          background: white;
        }

        .rpc-item p {
          margin: 5px 0;
        }

        .rpc-item strong {
          color: ${APP_CONSTANTS.COLORS.DARK};
        }

        @media (max-width: 768px) {
          .${APP_CONSTANTS.UI_ELEMENTS.CONTAINER} {
            margin: 10px;
            border-radius: 8px;
          }

          .${APP_CONSTANTS.UI_ELEMENTS.SECTION} {
            padding: 20px;
          }

          .${APP_CONSTANTS.UI_ELEMENTS.CHAINS_GRID} {
            grid-template-columns: 1fr;
          }

          .header h1 {
            font-size: 2em;
          }
        }
      </style>
    `;
  }

  /**
   * Generate header component
   */
  static getHeader(title: string): string {
    return `
      <div class="header">
        <h1>${title}</h1>
      </div>
    `;
  }

  /**
   * Generate authentication section
   */
  static getAuthSection(): string {
    return `
      <div class="${APP_CONSTANTS.UI_ELEMENTS.SECTION}">
        <h2>🔐 Authentication</h2>
        <div class="form-group">
          <label for="${APP_CONSTANTS.FORM_FIELDS.API_KEY}">API Key:</label>
          <input type="password" id="${APP_CONSTANTS.FORM_FIELDS.API_KEY}" placeholder="Enter your API key">
          <button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON}" onclick="testAuth()">Test Authentication</button>
        </div>
        <div id="${APP_CONSTANTS.SECTIONS.AUTH_STATUS}">
          <p>Please authenticate to access admin functions.</p>
        </div>
        <button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON} success" onclick="loadChains()" style="display:none;" id="loadChainsBtn">Load Chains</button>
      </div>
    `;
  }

  /**
   * Generate chains management section
   */
  static getChainsSection(): string {
    return `
      <div class="${APP_CONSTANTS.UI_ELEMENTS.SECTION}">
        <h2>⛓️ Chains Management</h2>
        <button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON}" onclick="showAddChainForm()">
          ➕ Add New Chain
        </button>
        <div id="${APP_CONSTANTS.SECTIONS.CHAINS_GRID}" class="${APP_CONSTANTS.UI_ELEMENTS.CHAINS_GRID}">
          <!-- Chains will be loaded here -->
        </div>
      </div>
    `;
  }

  /**
   * Generate add chain form
   */
  static getAddChainForm(): string {
    return `
      <div id="${APP_CONSTANTS.SECTIONS.ADD_CHAIN}" class="${APP_CONSTANTS.UI_ELEMENTS.FORM}">
        <h3>Add New Chain</h3>
        <form id="addChainForm">
          <div class="form-group">
            <label for="${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_ID}">Chain ID:</label>
            <input type="number" id="${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_ID}" required>
          </div>
          <div class="form-group">
            <label for="${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_NAME}">Chain Name:</label>
            <input type="text" id="${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_NAME}" required>
          </div>
          <div class="form-group">
            <label for="${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_SYMBOL}">Symbol:</label>
            <input type="text" id="${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_SYMBOL}" required>
          </div>
          <div class="form-group">
            <label for="${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_RPC}">Initial RPC URL:</label>
            <input type="url" id="${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_RPC}" required>
          </div>
          <div class="form-actions">
            <button type="button" class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON}" onclick="hideAddChainForm()">Cancel</button>
            <button type="button" class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON} success" onclick="addChain()">Add Chain</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Generate edit chain form
   */
  static getEditChainForm(): string {
    return `
      <div id="${APP_CONSTANTS.SECTIONS.EDIT_CHAIN}" class="${APP_CONSTANTS.UI_ELEMENTS.FORM}">
        <h3>Edit Chain</h3>
        <form id="editChainForm">
          <div class="form-group">
            <label for="${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_ID}">Chain ID:</label>
            <input type="text" id="${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_ID}" readonly>
          </div>
          <div class="form-group">
            <label for="${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_NAME}">Chain Name:</label>
            <input type="text" id="${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_NAME}" required>
          </div>
          <div class="form-group">
            <label for="${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_SYMBOL}">Symbol:</label>
            <input type="text" id="${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_SYMBOL}" required>
          </div>
          <div class="form-actions">
            <button type="button" class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON}" onclick="hideEditChainForm()">Cancel</button>
            <button type="button" class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON} success" onclick="updateChain()">Update Chain</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Generate RPC management section
   */
  static getRpcManagementSection(): string {
    return `
      <div id="${APP_CONSTANTS.SECTIONS.RPC_MANAGEMENT}" class="${APP_CONSTANTS.UI_ELEMENTS.FORM}">
        <div id="${APP_CONSTANTS.SECTIONS.RPC_CHAIN_INFO}">
          <h3>RPC Management</h3>
        </div>
        
        <div class="form-group">
          <label for="${APP_CONSTANTS.FORM_FIELDS.NEW_RPC_URL}">Add New RPC URL:</label>
          <input type="url" id="${APP_CONSTANTS.FORM_FIELDS.NEW_RPC_URL}" placeholder="https://...">
        </div>
        <button type="button" class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON} success" onclick="addRpc()">Add RPC</button>
        
        <div id="${APP_CONSTANTS.SECTIONS.RPC_LIST}">
          <!-- RPCs will be loaded here -->
        </div>
        
        <div class="form-actions">
          <button type="button" class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON}" onclick="hideRpcManagement()">Close</button>
        </div>
      </div>
    `;
  }

  /**
   * Generate debug log section
   */
  static getDebugSection(): string {
    return `
      <div class="${APP_CONSTANTS.UI_ELEMENTS.SECTION}">
        <h2>🐛 Debug Log</h2>
        <button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON}" onclick="clearLog()">Clear Log</button>
        <div id="${APP_CONSTANTS.UI_ELEMENTS.LOG_CONTAINER}" class="${APP_CONSTANTS.UI_ELEMENTS.LOG_CONTAINER}"></div>
      </div>
    `;
  }

  /**
   * Generate complete admin page HTML
   */
  static generateAdminPage(title: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        ${this.getStyles()}
      </head>
      <body>
        <div class="${APP_CONSTANTS.UI_ELEMENTS.CONTAINER}">
          ${this.getHeader(title)}
          ${this.getAuthSection()}
          ${this.getChainsSection()}
          ${this.getAddChainForm()}
          ${this.getEditChainForm()}
          ${this.getRpcManagementSection()}
          ${this.getDebugSection()}
        </div>
      </body>
      </html>
    `;
  }
}