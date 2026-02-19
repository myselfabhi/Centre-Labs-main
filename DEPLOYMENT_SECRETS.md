# GitHub Secrets Configuration for Auto-Deployment

Add these secrets to your GitHub repository at: Settings → Secrets and variables → Actions

## Required Secrets

### Docker Hub Credentials (Already Configured)
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Your Docker Hub access token

### SSH Private Key
- `SSH_PRIVATE_KEY` - Private SSH key for authentication (supports both proxy and target server)
  ```
  Generate with: ssh-keygen -t ed25519 -C "github-actions"
  Copy the private key content including:
  -----BEGIN OPENSSH PRIVATE KEY-----
  ...
  -----END OPENSSH PRIVATE KEY-----
  ```

### Proxy Server Configuration
- `PROXY_HOST` - Hostname/IP of your proxy/jump server
- `PROXY_USER` - SSH username for proxy server (e.g., ubuntu, root)
- `PROXY_PORT` - SSH port for proxy server (default: 22, optional)

### Target Server Configuration
- `TARGET_HOST` - Hostname/IP of your actual deployment server (behind firewall)
- `TARGET_USER` - SSH username for target server
- `TARGET_PORT` - SSH port for target server (default: 22, optional)

### Deployment Configuration
- `DEPLOY_PATH` - Path to docker-compose directory on target server (default: /opt/peptides)

## SSH Key Setup

1. **Generate SSH Key Pair:**
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_key
   ```

2. **Add Public Key to Both Servers:**
   
   For proxy server:
   ```bash
   ssh-copy-id -i ~/.ssh/github_actions_key.pub user@proxy-server
   ```
   
   For target server:
   ```bash
   ssh-copy-id -i ~/.ssh/github_actions_key.pub user@target-server
   ```

3. **Add Private Key to GitHub Secrets:**
   ```bash
   cat ~/.ssh/github_actions_key
   ```
   Copy the entire output and paste it as the `SSH_PRIVATE_KEY` secret

## Deployment Flow

1. Code pushed to `main` branch
2. GitHub Actions builds Docker images
3. Images pushed to Docker Hub
4. GitHub runner connects to proxy server via SSH
5. From proxy, connects to target server via ProxyJump
6. Pulls latest Docker images on target
7. Restarts services with `docker-compose up -d`

## Testing Connection

Test the SSH proxy configuration locally:
```bash
# Test proxy connection
ssh -i ~/.ssh/github_actions_key user@proxy-server

# Test target via proxy
ssh -i ~/.ssh/github_actions_key -J user@proxy-server user@target-server

# Test full deployment command
ssh -i ~/.ssh/github_actions_key -J user@proxy-server user@target-server \
  "cd /opt/peptides && docker-compose pull && docker-compose up -d"
```

## Security Notes

- The SSH private key should NEVER be committed to the repository
- Use dedicated SSH keys for GitHub Actions (not your personal keys)
- Consider using SSH key passphrases with GitHub secrets for additional security
- Restrict SSH key permissions on both servers
- The proxy server acts as a secure gateway for country-restricted SSH access
