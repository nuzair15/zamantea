module.exports = {
  apps: [{
    name: 'zaman-tea',
    cwd: '/opt/zaman',
    script: 'server/index.mjs',
    interpreter: 'node',
    node_args: '--env-file=/opt/zaman/.env',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    restart_delay: 3000,
    kill_timeout: 15000,
    time: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
