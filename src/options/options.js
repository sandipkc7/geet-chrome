/**
 * GeetKosh Options Page Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('options-form');
  const backendUrlInput = document.getElementById('backend-url');
  const bearerTokenInput = document.getElementById('bearer-token');
  const defaultGenreInput = document.getElementById('default-genre');
  const btnTest = document.getElementById('btn-test');
  const statusDiv = document.getElementById('status');

  function showStatus(text, type = 'success') {
    statusDiv.textContent = text;
    statusDiv.className = `status-msg ${type}`;
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }

  // Load saved options
  chrome.storage.local.get(['backend_url', 'bearer_token', 'default_genre'], (res) => {
    backendUrlInput.value = res.backend_url || 'https://geet-backend.sandipkc.com.np';
    bearerTokenInput.value = res.bearer_token || '';
    defaultGenreInput.value = res.default_genre || 'Adhunik';
  });

  // Save options
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const backend_url = backendUrlInput.value.trim().replace(/\/+$/, '');
    const bearer_token = bearerTokenInput.value.trim();
    const default_genre = defaultGenreInput.value;

    chrome.storage.local.set({ backend_url, bearer_token, default_genre }, () => {
      showStatus('Settings saved successfully! You are ready to harvest YouTube songs.', 'success');
    });
  });

  // Test connection
  btnTest.addEventListener('click', async () => {
    btnTest.textContent = 'Testing...';
    btnTest.disabled = true;

    const backend_url = backendUrlInput.value.trim().replace(/\/+$/, '');
    const bearer_token = bearerTokenInput.value.trim();

    try {
      const headers = { 'Accept': 'application/json' };
      if (bearer_token.length > 40) {
        headers['Authorization'] = `Bearer ${bearer_token}`;
      } else {
        headers['X-Admin-Secret'] = bearer_token;
        headers['Authorization'] = `Bearer ${bearer_token}`;
      }

      const res = await fetch(`${backend_url}/api/admin/stats`, { headers });
      if (res.ok) {
        const json = await res.json();
        showStatus(`Connection successful! Connected to GeetKosh API (${json.data.total_songs} songs in database).`, 'success');
      } else {
        showStatus(`Connection failed: HTTP ${res.status}. Check your token or URL.`, 'error');
      }
    } catch (err) {
      showStatus(`Error connecting to ${backend_url}: ${err.message}`, 'error');
    } finally {
      btnTest.textContent = 'Test Connection';
      btnTest.disabled = false;
    }
  });
});
