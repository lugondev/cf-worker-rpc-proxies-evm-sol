import { APP_CONSTANTS } from '../constants';

/**
 * Admin Client Service
 * Handles all admin interface JavaScript functionality
 */

export class AdminClientService {
  /**
   * Generate all JavaScript functions for admin interface
   */
  static generateClientScript(): string {
    return `
      <script>
        // Global variables
        let apiKey = '';
        let currentRpcChainId = null;

        // Utility Functions
        function log(message) {
          const logContainer = document.getElementById('${APP_CONSTANTS.UI_ELEMENTS.LOG_CONTAINER}');
          const timestamp = new Date().toLocaleTimeString();
          logContainer.innerHTML += \`[\${timestamp}] \${message}\\n\`;
          logContainer.scrollTop = logContainer.scrollHeight;
        }

        function clearLog() {
          document.getElementById('${APP_CONSTANTS.UI_ELEMENTS.LOG_CONTAINER}').innerHTML = '';
        }

        function showStatus(message, isError = false) {
          const statusDiv = document.createElement('div');
          statusDiv.className = '${APP_CONSTANTS.UI_ELEMENTS.STATUS_MESSAGE} ' + (isError ? 'error' : 'success');
          statusDiv.textContent = message;
          
          const container = document.querySelector('.${APP_CONSTANTS.UI_ELEMENTS.CONTAINER}');
          container.insertBefore(statusDiv, container.firstChild);
          
          setTimeout(() => statusDiv.remove(), 5000);
        }

        // Authentication Functions
        async function testAuth() {
          const keyInput = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.API_KEY}');
          if (keyInput) {
            apiKey = keyInput.value;
          }

          if (!apiKey) {
            log('No API key provided');
            return false;
          }

          log('Testing authentication...');

          try {
            const response = await fetch('${APP_CONSTANTS.API_ENDPOINTS.ADMIN_CONFIG}', {
              headers: {
                'X-API-Key': apiKey
              }
            });

            if (response.ok) {
              log('${APP_CONSTANTS.MESSAGES.AUTH_SUCCESS}');
              
              // Save API key to localStorage
              localStorage.setItem('admin_api_key', apiKey);
              
              document.getElementById('${APP_CONSTANTS.SECTIONS.AUTH_STATUS}').innerHTML = 
                '<p style="color: ${APP_CONSTANTS.COLORS.SUCCESS};">✅ ${APP_CONSTANTS.MESSAGES.AUTH_SUCCESS}</p>';
              showStatus('${APP_CONSTANTS.MESSAGES.AUTH_SUCCESS}');
              
              // Show Load Chains button and hide login form
              const loadChainsBtn = document.getElementById('loadChainsBtn');
              if (loadChainsBtn) {
                loadChainsBtn.style.display = 'inline-block';
              }
              
              // Show logout button
              showLogoutButton();
              
              return true;
            } else {
              log('${APP_CONSTANTS.MESSAGES.AUTH_FAILED}: ' + response.status);
              // Clear stored API key on failed auth
              localStorage.removeItem('admin_api_key');
              document.getElementById('${APP_CONSTANTS.SECTIONS.AUTH_STATUS}').innerHTML = 
                '<p style="color: ${APP_CONSTANTS.COLORS.DANGER};">❌ ${APP_CONSTANTS.MESSAGES.AUTH_FAILED}</p>';
              showStatus('${APP_CONSTANTS.MESSAGES.AUTH_FAILED}', true);
              return false;
            }
          } catch (error) {
            log('Authentication error: ' + error.message);
            showStatus('Authentication error: ' + error.message, true);
            return false;
          }
        }

        function logout() {
          // Clear API key from memory and localStorage
          apiKey = '';
          localStorage.removeItem('admin_api_key');
          
          // Clear UI
          document.getElementById('${APP_CONSTANTS.FORM_FIELDS.API_KEY}').value = '';
          document.getElementById('${APP_CONSTANTS.SECTIONS.AUTH_STATUS}').innerHTML = '';
          document.getElementById('${APP_CONSTANTS.SECTIONS.CHAINS_GRID}').innerHTML = '';
          
          // Hide logout button and chains
          const logoutBtn = document.getElementById('logoutBtn');
          if (logoutBtn) {
            logoutBtn.style.display = 'none';
          }
          const loadChainsBtn = document.getElementById('loadChainsBtn');
          if (loadChainsBtn) {
            loadChainsBtn.style.display = 'none';
          }
          
          log('Logged out successfully');
          showStatus('Logged out');
        }

        function showLogoutButton() {
          const authStatus = document.getElementById('${APP_CONSTANTS.SECTIONS.AUTH_STATUS}');
          let logoutBtn = document.getElementById('logoutBtn');
          
          if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutBtn';
            logoutBtn.className = '${APP_CONSTANTS.UI_ELEMENTS.BUTTON} danger';
            logoutBtn.textContent = '🚪 Logout';
            logoutBtn.onclick = logout;
            logoutBtn.style.marginLeft = '10px';
            authStatus.appendChild(logoutBtn);
          } else {
            logoutBtn.style.display = 'inline-block';
          }
        }

        // Chain Management Functions
        async function loadChains() {
          if (!apiKey) {
            log('No API key available');
            return;
          }

          log('Loading chains...');

          try {
            const response = await fetch('${APP_CONSTANTS.API_ENDPOINTS.ADMIN_CHAINS}', {
              headers: {
                'X-API-Key': apiKey
              }
            });

            if (response.ok) {
              const data = await response.json();
              displayChains(data.data || []);
              log(\`Loaded \${data.data?.length || 0} chains\`);
            } else {
              log('Failed to load chains: ' + response.status);
              showStatus('Failed to load chains', true);
            }
          } catch (error) {
            log('Error loading chains: ' + error.message);
            showStatus('Error loading chains: ' + error.message, true);
          }
        }

        function displayChains(chains) {
          const container = document.getElementById('${APP_CONSTANTS.SECTIONS.CHAINS_GRID}');
          
          if (!Array.isArray(chains) || chains.length === 0) {
            container.innerHTML = '<p>No chains found</p>';
            return;
          }

          // Filter out invalid chains
          const validChains = chains.filter(chain => 
            chain && 
            typeof chain === 'object' && 
            chain.chainId !== null && 
            chain.chainId !== undefined
          );

          const html = validChains.map(chain => {
            const name = chain.name || 'Unknown';
            const symbol = chain.symbol || 'N/A';
            const chainId = chain.chainId || 0;
            const rpcCount = chain.rpcCount || 0;
            const activeRpcCount = chain.activeRpcCount || 0;

            return \`
              <div class="${APP_CONSTANTS.UI_ELEMENTS.CHAIN_CARD}">
                <h3>\${name} (\${symbol})</h3>
                <p><strong>Chain ID:</strong> \${chainId}</p>
                <p><strong>RPCs:</strong> \${activeRpcCount}/\${rpcCount} active</p>
                <div style="margin-top: 15px;">
                  <button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON} success" onclick="copyProxyUrl('\${chainId}', '\${name}')">
                    📋 Copy Proxy URL
                  </button>
                  <button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON}" onclick="editChain('\${chainId}', '\${name}', '\${symbol}')">
                    ✏️ Edit
                  </button>
                  <button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON} warning" onclick="manageRpcs('\${chainId}', '\${name}')">
                    🔗 RPCs
                  </button>
                  <button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON} danger" onclick="deleteChain('\${chainId}', '\${name}')">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            \`;
          }).join('');
          
          container.innerHTML = html;
        }

        // Form Management Functions
        function showAddChainForm() {
          document.getElementById('${APP_CONSTANTS.SECTIONS.ADD_CHAIN}').style.display = 'block';
          document.getElementById('${APP_CONSTANTS.SECTIONS.EDIT_CHAIN}').style.display = 'none';
          document.getElementById('${APP_CONSTANTS.SECTIONS.RPC_MANAGEMENT}').style.display = 'none';
        }

        function hideAddChainForm() {
          document.getElementById('${APP_CONSTANTS.SECTIONS.ADD_CHAIN}').style.display = 'none';
          document.getElementById('addChainForm').reset();
        }

        function showEditChainForm() {
          document.getElementById('${APP_CONSTANTS.SECTIONS.EDIT_CHAIN}').style.display = 'block';
          document.getElementById('${APP_CONSTANTS.SECTIONS.ADD_CHAIN}').style.display = 'none';
          document.getElementById('${APP_CONSTANTS.SECTIONS.RPC_MANAGEMENT}').style.display = 'none';
        }

        function hideEditChainForm() {
          document.getElementById('${APP_CONSTANTS.SECTIONS.EDIT_CHAIN}').style.display = 'none';
          document.getElementById('editChainForm').reset();
        }

        function hideRpcManagement() {
          document.getElementById('${APP_CONSTANTS.SECTIONS.RPC_MANAGEMENT}').style.display = 'none';
        }

        function showEditRpcForm() {
          document.getElementById('${APP_CONSTANTS.SECTIONS.EDIT_RPC}').style.display = 'block';
          document.getElementById('${APP_CONSTANTS.SECTIONS.ADD_CHAIN}').style.display = 'none';
          document.getElementById('${APP_CONSTANTS.SECTIONS.EDIT_CHAIN}').style.display = 'none';
          // Keep RPC management visible
        }

        function hideEditRpcForm() {
          document.getElementById('${APP_CONSTANTS.SECTIONS.EDIT_RPC}').style.display = 'none';
          document.getElementById('editRpcForm').reset();
        }

        // CRUD Operations
        async function addChain() {
          const chainId = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_ID}').value;
          const name = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_NAME}').value;
          const symbol = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_SYMBOL}').value;
          const rpcUrl = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.NEW_CHAIN_RPC}').value;

          if (!chainId || !name || !symbol || !rpcUrl) {
            alert('${APP_CONSTANTS.MESSAGES.INVALID_INPUT}');
            return;
          }

          log(\`Adding new chain: \${name} (\${chainId})\`);

          try {
            const chainConfig = {
              name: name,
              symbol: symbol,
              rpcs: [{
                url: rpcUrl,
                isActive: true,
                priority: ${APP_CONSTANTS.DEFAULTS.RPC_PRIORITY},
                timeout: ${APP_CONSTANTS.DEFAULTS.RPC_TIMEOUT},
                maxRetries: ${APP_CONSTANTS.DEFAULTS.RPC_MAX_RETRIES}
              }]
            };

            const response = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_CHAINS}/\${chainId}\`, {
              method: 'PUT',
              headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(chainConfig)
            });

            if (response.ok) {
              log('${APP_CONSTANTS.MESSAGES.CHAIN_ADDED}');
              showStatus('${APP_CONSTANTS.MESSAGES.CHAIN_ADDED}');
              hideAddChainForm();
              loadChains();
            } else {
              const error = await response.text();
              log(\`Failed to add chain: \${error}\`);
              showStatus(\`Failed to add chain: \${error}\`, true);
            }
          } catch (error) {
            log(\`Error adding chain: \${error.message}\`);
            showStatus(\`Error adding chain: \${error.message}\`, true);
          }
        }

        function editChain(chainId, name, symbol) {
          log(\`Editing chain: \${name} (\${chainId})\`);
          document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_ID}').value = chainId;
          document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_NAME}').value = name;
          document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_SYMBOL}').value = symbol;
          showEditChainForm();
        }

        async function updateChain() {
          const chainId = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_ID}').value;
          const name = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_NAME}').value;
          const symbol = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_CHAIN_SYMBOL}').value;

          if (!name || !symbol) {
            alert('${APP_CONSTANTS.MESSAGES.INVALID_INPUT}');
            return;
          }

          log(\`Updating chain \${chainId}: \${name}\`);

          try {
            const getResponse = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_CHAINS}/\${chainId}\`, {
              headers: {
                'X-API-Key': apiKey
              }
            });

            if (!getResponse.ok) {
              throw new Error('Failed to get current chain config');
            }

            const currentConfig = await getResponse.json();
            
            const updatedConfig = {
              ...currentConfig.data,
              name: name,
              symbol: symbol
            };

            const response = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_CHAINS}/\${chainId}\`, {
              method: 'PUT',
              headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updatedConfig)
            });

            if (response.ok) {
              log('${APP_CONSTANTS.MESSAGES.CHAIN_UPDATED}');
              showStatus('${APP_CONSTANTS.MESSAGES.CHAIN_UPDATED}');
              hideEditChainForm();
              loadChains();
            } else {
              const error = await response.text();
              log(\`Failed to update chain: \${error}\`);
              showStatus(\`Failed to update chain: \${error}\`, true);
            }
          } catch (error) {
            log(\`Error updating chain: \${error.message}\`);
            showStatus(\`Error updating chain: \${error.message}\`, true);
          }
        }

        async function deleteChain(chainId, name) {
          if (!confirm(\`${APP_CONSTANTS.MESSAGES.CONFIRM_DELETE_CHAIN} "\${name}" (\${chainId})?\`)) {
            return;
          }

          log(\`Deleting chain: \${name} (\${chainId})\`);

          try {
            const response = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_CHAINS}/\${chainId}\`, {
              method: 'DELETE',
              headers: {
                'X-API-Key': apiKey
              }
            });

            if (response.ok) {
              log('${APP_CONSTANTS.MESSAGES.CHAIN_DELETED}');
              showStatus('${APP_CONSTANTS.MESSAGES.CHAIN_DELETED}');
              loadChains();
            } else {
              const error = await response.text();
              log(\`Failed to delete chain: \${error}\`);
              showStatus(\`Failed to delete chain: \${error}\`, true);
            }
          } catch (error) {
            log(\`Error deleting chain: \${error.message}\`);
            showStatus(\`Error deleting chain: \${error.message}\`, true);
          }
        }

        // RPC Management Functions
        async function manageRpcs(chainId, chainName) {
          log(\`Managing RPCs for chain: \${chainName} (\${chainId})\`);
          currentRpcChainId = chainId;
          
          document.getElementById('${APP_CONSTANTS.SECTIONS.RPC_CHAIN_INFO}').innerHTML = 
            \`<h3>Managing RPCs for: \${chainName} (\${chainId})</h3>
            <button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON} success" onclick="copyProxyUrl('\${chainId}', '\${chainName}')" style="margin-top: 10px;">
              📋 Copy Proxy URL
            </button>\`;
          document.getElementById('${APP_CONSTANTS.SECTIONS.ADD_CHAIN}').style.display = 'none';
          document.getElementById('${APP_CONSTANTS.SECTIONS.EDIT_CHAIN}').style.display = 'none';
          document.getElementById('${APP_CONSTANTS.SECTIONS.RPC_MANAGEMENT}').style.display = 'block';
          
          await loadRpcs(chainId);
        }

        async function loadRpcs(chainId) {
          try {
            const response = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_CHAINS}/\${chainId}\`, {
              headers: {
                'X-API-Key': apiKey
              }
            });

            if (response.ok) {
              const data = await response.json();
              const rpcs = data.data.rpcs || [];
              displayRpcs(rpcs);
            } else {
              log(\`Failed to load RPCs: \${response.status}\`);
            }
          } catch (error) {
            log(\`Error loading RPCs: \${error.message}\`);
          }
        }

        function displayRpcs(rpcs) {
          const container = document.getElementById('${APP_CONSTANTS.SECTIONS.RPC_LIST}');
          
          if (rpcs.length === 0) {
            container.innerHTML = '<p>${APP_CONSTANTS.MESSAGES.NO_RPCS_FOUND}</p>';
            return;
          }

          const rpcItems = rpcs.map((rpc, index) => {
            let healthBadge = '';
            if (rpc.healthStatus) {
              healthBadge = rpc.healthStatus.isHealthy ? 
                '<span class="health-badge healthy">✅ Healthy</span>' : 
                '<span class="health-badge unhealthy">❌ Unhealthy</span>';
            }
            
            let healthDetails = '';
            if (rpc.healthStatus) {
              const parts = [];
              parts.push('Response: ' + rpc.healthStatus.responseTime + 'ms');
              if (rpc.healthStatus.blockNumber) {
                parts.push('Block: ' + rpc.healthStatus.blockNumber);
              }
              if (rpc.healthStatus.error) {
                parts.push('Error: ' + rpc.healthStatus.error);
              }
              if (rpc.healthStatus.lastChecked) {
                parts.push('Checked: ' + new Date(rpc.healthStatus.lastChecked).toLocaleTimeString());
              }
              healthDetails = '<div class="health-details">' + parts.join(' • ') + '</div>';
            }

            const nameRow = rpc.name ? '<div><strong>Name:</strong> ' + rpc.name + '</div>' : '';
            const statusBadge = rpc.isActive ? 
              '<span style="color: #28a745;">● Active</span>' : 
              '<span style="color: #dc3545;">● Inactive</span>';
            const toggleText = rpc.isActive ? 'Deactivate' : 'Activate';
            const toggleColor = rpc.isActive ? '${APP_CONSTANTS.COLORS.WARNING}' : '${APP_CONSTANTS.COLORS.SUCCESS}';

            return '<div class="rpc-item" id="rpc-' + index + '">' +
              '<div class="rpc-url">' + rpc.url + ' ' + healthBadge + '</div>' +
              nameRow +
              '<div class="rpc-config">' +
                '<span>' + statusBadge + '</span>' +
                '<span>Priority: ' + (rpc.priority || 1) + '</span>' +
                '<span>Timeout: ' + (rpc.timeout || 5000) + 'ms</span>' +
                '<span>Retries: ' + (rpc.maxRetries || 3) + '</span>' +
              '</div>' +
              healthDetails +
              '<div class="rpc-actions">' +
                '<button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON}" onclick="editRpc(\\'' + rpc.url + '\\', ' + JSON.stringify(rpc).replace(/"/g, '&quot;') + ')">✏️ Edit</button>' +
                '<button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON}" onclick="checkRpcHealth(\\'' + rpc.url + '\\', ' + index + ')" style="background: ${APP_CONSTANTS.COLORS.SECONDARY};">🏥 Health</button>' +
                '<button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON}" onclick="toggleRpcStatus(\\'' + rpc.url + '\\', ' + !rpc.isActive + ')" style="background: ' + toggleColor + ';">' + toggleText + '</button>' +
                '<button class="${APP_CONSTANTS.UI_ELEMENTS.BUTTON} danger" onclick="removeRpc(\\'' + rpc.url + '\\')">🗑️</button>' +
              '</div>' +
            '</div>';
          }).join('');
          
          container.innerHTML = '<h4 style="margin: 10px 0; font-size: 14px; color: #666;">RPCs (' + rpcs.length + ')</h4>' + rpcItems;
        }

        async function addRpc() {
          const rpcUrl = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.NEW_RPC_URL}').value;
          
          if (!rpcUrl || !currentRpcChainId) {
            alert('Please enter a valid RPC URL');
            return;
          }

          log(\`Adding RPC \${rpcUrl} to chain \${currentRpcChainId}\`);

          try {
            const response = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_RPC}/\${currentRpcChainId}\`, {
              method: 'POST',
              headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                url: rpcUrl,
                isActive: true,
                priority: ${APP_CONSTANTS.DEFAULTS.RPC_PRIORITY},
                timeout: ${APP_CONSTANTS.DEFAULTS.RPC_TIMEOUT},
                maxRetries: ${APP_CONSTANTS.DEFAULTS.RPC_MAX_RETRIES}
              })
            });

            if (response.ok) {
              log('${APP_CONSTANTS.MESSAGES.RPC_ADDED}');
              showStatus('${APP_CONSTANTS.MESSAGES.RPC_ADDED}');
              document.getElementById('${APP_CONSTANTS.FORM_FIELDS.NEW_RPC_URL}').value = '';
              await loadRpcs(currentRpcChainId);
            } else {
              const error = await response.text();
              log(\`Failed to add RPC: \${error}\`);
              showStatus(\`Failed to add RPC: \${error}\`, true);
            }
          } catch (error) {
            log(\`Error adding RPC: \${error.message}\`);
            showStatus(\`Error adding RPC: \${error.message}\`, true);
          }
        }

        async function removeRpc(rpcUrl) {
          if (!confirm(\`${APP_CONSTANTS.MESSAGES.CONFIRM_DELETE_RPC}: \${rpcUrl}?\`)) {
            return;
          }

          log(\`Removing RPC \${rpcUrl} from chain \${currentRpcChainId}\`);

          try {
            const response = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_RPC}/\${currentRpcChainId}?\` + new URLSearchParams({
              rpcUrl: rpcUrl
            }), {
              method: 'DELETE',
              headers: {
                'X-API-Key': apiKey
              }
            });

            if (response.ok) {
              log('${APP_CONSTANTS.MESSAGES.RPC_REMOVED}');
              showStatus('${APP_CONSTANTS.MESSAGES.RPC_REMOVED}');
              await loadRpcs(currentRpcChainId);
            } else {
              const error = await response.text();
              log(\`Failed to remove RPC: \${error}\`);
              showStatus(\`Failed to remove RPC: \${error}\`, true);
            }
          } catch (error) {
            log(\`Error removing RPC: \${error.message}\`);
            showStatus(\`Error removing RPC: \${error.message}\`, true);
          }
        }

        async function toggleRpcStatus(rpcUrl, newStatus) {
          log(\`Toggling RPC \${rpcUrl} to \${newStatus ? 'active' : 'inactive'}\`);

          try {
            const response = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_RPC}/\${currentRpcChainId}?\` + new URLSearchParams({
              rpcUrl: rpcUrl
            }), {
              method: 'PUT',
              headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                isActive: newStatus
              })
            });

            if (response.ok) {
              log('${APP_CONSTANTS.MESSAGES.RPC_UPDATED}');
              showStatus('${APP_CONSTANTS.MESSAGES.RPC_UPDATED}');
              await loadRpcs(currentRpcChainId);
            } else {
              const error = await response.text();
              log(\`Failed to update RPC status: \${error}\`);
              showStatus(\`Failed to update RPC status: \${error}\`, true);
            }
          } catch (error) {
            log(\`Error updating RPC status: \${error.message}\`);
            showStatus(\`Error updating RPC status: \${error.message}\`, true);
          }
        }

        // RPC Editing Functions
        function editRpc(rpcUrl, rpcData) {
          log(\`Editing RPC: \${rpcUrl}\`);
          
          // Parse rpcData if it's a string
          const rpc = typeof rpcData === 'string' ? JSON.parse(rpcData.replace(/&quot;/g, '"')) : rpcData;
          
          document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_RPC_URL}').value = rpc.url;
          document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_RPC_NAME}').value = rpc.name || '';
          document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_RPC_PRIORITY}').value = rpc.priority || 1;
          document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_RPC_TIMEOUT}').value = rpc.timeout || 5000;
          document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_RPC_MAX_RETRIES}').value = rpc.maxRetries || 3;
          
          showEditRpcForm();
        }

        async function updateRpc() {
          const rpcUrl = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_RPC_URL}').value;
          const name = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_RPC_NAME}').value;
          const priority = parseInt(document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_RPC_PRIORITY}').value);
          const timeout = parseInt(document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_RPC_TIMEOUT}').value);
          const maxRetries = parseInt(document.getElementById('${APP_CONSTANTS.FORM_FIELDS.EDIT_RPC_MAX_RETRIES}').value);

          if (!currentRpcChainId) {
            alert('No chain selected');
            return;
          }

          log(\`Updating RPC \${rpcUrl}\`);

          try {
            // Get current chain config
            const getResponse = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_CHAINS}/\${currentRpcChainId}\`, {
              headers: {
                'X-API-Key': apiKey
              }
            });

            if (!getResponse.ok) {
              throw new Error('Failed to get current chain config');
            }

            const currentConfig = await getResponse.json();
            const chainData = currentConfig.data;
            
            // Find and update the RPC in the chain config
            const rpcIndex = chainData.rpcs.findIndex(r => r.url === rpcUrl);
            if (rpcIndex === -1) {
              throw new Error('RPC not found in chain config');
            }

            chainData.rpcs[rpcIndex] = {
              ...chainData.rpcs[rpcIndex],
              name: name || undefined,
              priority: priority,
              timeout: timeout,
              maxRetries: maxRetries
            };

            // Update the entire chain config
            const response = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_CHAINS}/\${currentRpcChainId}\`, {
              method: 'PUT',
              headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(chainData)
            });

            if (response.ok) {
              log('${APP_CONSTANTS.MESSAGES.RPC_UPDATED}');
              showStatus('${APP_CONSTANTS.MESSAGES.RPC_UPDATED}');
              hideEditRpcForm();
              await loadRpcs(currentRpcChainId);
            } else {
              const error = await response.text();
              log(\`Failed to update RPC: \${error}\`);
              showStatus(\`Failed to update RPC: \${error}\`, true);
            }
          } catch (error) {
            log(\`Error updating RPC: \${error.message}\`);
            showStatus(\`Error updating RPC: \${error.message}\`, true);
          }
        }

        // Health Check Functions
        async function checkRpcHealth(rpcUrl, rpcIndex) {
          log(\`Checking health for RPC: \${rpcUrl}\`);
          
          const rpcItem = document.getElementById(\`rpc-\${rpcIndex}\`);
          if (rpcItem) {
            // Add checking badge
            const urlDiv = rpcItem.querySelector('.rpc-url');
            if (urlDiv) {
              const existingBadge = urlDiv.querySelector('.health-badge');
              if (existingBadge) existingBadge.remove();
              urlDiv.innerHTML += ' <span class=\"health-badge checking\">⏳ Checking...</span>';
            }
          }

          try {
            const response = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_CHAINS}/\${currentRpcChainId}/rpcs/health\`, {
              method: 'POST',
              headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ rpcUrl: rpcUrl })
            });

            if (response.ok) {
              const result = await response.json();
              log(\`Health check completed for \${rpcUrl}: \${result.data.isHealthy ? 'Healthy' : 'Unhealthy'}\`);
              
              // Reload RPCs to show updated health status
              await loadRpcs(currentRpcChainId);
            } else {
              const error = await response.text();
              log(\`Health check failed: \${error}\`);
              showStatus('${APP_CONSTANTS.MESSAGES.HEALTH_CHECK_FAILED}', true);
            }
          } catch (error) {
            log(\`Error checking RPC health: \${error.message}\`);
            showStatus(\`Error checking RPC health: \${error.message}\`, true);
          }
        }

        async function checkAllRpcsHealth() {
          if (!currentRpcChainId) {
            alert('No chain selected');
            return;
          }

          log('${APP_CONSTANTS.MESSAGES.HEALTH_CHECK_STARTED}');
          showStatus('${APP_CONSTANTS.MESSAGES.HEALTH_CHECK_STARTED}');

          try {
            const response = await fetch(\`${APP_CONSTANTS.API_ENDPOINTS.ADMIN_HEALTH}/\${currentRpcChainId}\`, {
              method: 'POST',
              headers: {
                'X-API-Key': apiKey
              }
            });

            if (response.ok) {
              const result = await response.json();
              log('${APP_CONSTANTS.MESSAGES.HEALTH_CHECK_COMPLETED}');
              showStatus('${APP_CONSTANTS.MESSAGES.HEALTH_CHECK_COMPLETED}');
              
              // Reload RPCs to show updated health status
              await loadRpcs(currentRpcChainId);
            } else {
              const error = await response.text();
              log(\`Health check failed: \${error}\`);
              showStatus('${APP_CONSTANTS.MESSAGES.HEALTH_CHECK_FAILED}', true);
            }
          } catch (error) {
            log(\`Error checking all RPCs health: \${error.message}\`);
            showStatus(\`Error checking all RPCs health: \${error.message}\`, true);
          }
        }

        // Copy Proxy URL to clipboard
        function copyProxyUrl(chainId, chainName) {
          const baseUrl = window.location.origin;
          const proxyUrl = \`\${baseUrl}/\${chainId}\`;
          
          navigator.clipboard.writeText(proxyUrl).then(() => {
            log(\`Copied proxy URL for \${chainName}: \${proxyUrl}\`);
            showStatus(\`Proxy URL copied: \${proxyUrl}\`);
          }).catch(err => {
            log(\`Failed to copy proxy URL: \${err.message}\`);
            showStatus(\`Failed to copy proxy URL\`, true);
          });
        }

        // Auto-load on page load
        document.addEventListener('DOMContentLoaded', () => {
          // Check for API key in localStorage first
          const storedApiKey = localStorage.getItem('admin_api_key');
          
          // Check for API key in URL (takes precedence)
          const urlParams = new URLSearchParams(window.location.search);
          const urlApiKey = urlParams.get('key');
          
          if (urlApiKey) {
            apiKey = urlApiKey;
            const keyInput = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.API_KEY}');
            if (keyInput) {
              keyInput.value = apiKey;
            }
            testAuth().then(success => {
              if (success) {
                loadChains();
              }
            });
          } else if (storedApiKey) {
            // Auto-login with stored API key
            apiKey = storedApiKey;
            const keyInput = document.getElementById('${APP_CONSTANTS.FORM_FIELDS.API_KEY}');
            if (keyInput) {
              keyInput.value = apiKey;
            }
            log('Auto-login with stored API key...');
            testAuth().then(success => {
              if (success) {
                loadChains();
              }
            });
          }
        });
      </script>
    `;
  }
}