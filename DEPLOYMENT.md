# Deployment Guide

Guide for deploying the Hashtag Tracking Service to production.

## Pre-Deployment Checklist

- [ ] Code review completed
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database backed up
- [ ] Security audit completed
- [ ] Documentation updated

## Environment Setup

### Production Database

```bash
# Create production database
createdb hashtag_tracking_prod

# Or use AWS RDS/managed database
# Update DATABASE_URL to production connection string
```

### Environment Variables

```bash
# Create .env.production with:
DATABASE_URL=postgresql://prod-user:secure-password@prod-host:5432/hashtag_tracking_prod
INSTAGRAM_ACCESS_TOKEN=<production-token>
INSTAGRAM_USER_ID=<production-user-id>
INSTAGRAM_API_VERSION=v24.0
PORT=3000
NODE_ENV=production
STORAGE_PATH=/var/media/hashtag-tracking
```

### Storage Directory

```bash
# Create and secure storage directory
sudo mkdir -p /var/media/hashtag-tracking
sudo chown app-user:app-group /var/media/hashtag-tracking
sudo chmod 755 /var/media/hashtag-tracking
```

## Build for Production

```bash
# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

## Database Migration

```bash
# Run migrations
npm run db:migrate

# Verify tables created
psql hashtag_tracking_prod -c "\dt"
```

## Service Deployment

### Option 1: Node Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'hashtag-tracking',
    script: './dist/app.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Enable auto-restart on boot
pm2 startup
pm2 save
```

### Option 2: Systemd Service

```bash
# Create systemd service file
sudo tee /etc/systemd/system/hashtag-tracking.service << 'EOF'
[Unit]
Description=Hashtag Tracking Service
After=network.target
Requires=postgresql.service

[Service]
Type=simple
User=app-user
WorkingDirectory=/opt/hashtag-tracking
EnvironmentFile=/opt/hashtag-tracking/.env.production
ExecStart=/usr/bin/node /opt/hashtag-tracking/dist/app.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable hashtag-tracking
sudo systemctl start hashtag-tracking

# Check status
sudo systemctl status hashtag-tracking
```

### Option 3: Docker Deployment

```dockerfile
# Create Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source
COPY dist ./dist

# Create storage directory
RUN mkdir -p /app/storage/media

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "dist/app.js"]
```

Build and run:

```bash
docker build -t hashtag-tracking:1.0.0 .

docker run -d \
  --name hashtag-tracking \
  --env-file .env.production \
  -p 3000:3000 \
  -v hashtag-tracking-storage:/app/storage/media \
  hashtag-tracking:1.0.0
```

## Reverse Proxy Setup

### Nginx Configuration

```nginx
upstream hashtag_tracking {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/api.example.com.crt;
    ssl_certificate_key /etc/ssl/private/api.example.com.key;

    client_max_body_size 50M;

    location / {
        proxy_pass http://hashtag_tracking;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://hashtag_tracking;
        access_log off;
    }
}
```

## Monitoring

### Application Monitoring

```bash
# Monitor logs
tail -f /var/log/hashtag-tracking.log

# Monitor PM2 process
pm2 monit

# Monitor system resources
htop
```

### Database Monitoring

```bash
# Check database size
psql hashtag_tracking_prod -c \
  "SELECT pg_size_pretty(pg_database_size('hashtag_tracking_prod'));"

# Monitor table growth
psql hashtag_tracking_prod -c \
  "SELECT 'media' as table, COUNT(*) as rows FROM media UNION ALL
   SELECT 'hashtags', COUNT(*) FROM hashtags;"

# Check long-running queries
psql hashtag_tracking_prod -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"
```

### Health Checks

```bash
# Setup monitoring endpoint check
*/5 * * * * curl -f http://localhost:3000/health > /dev/null 2>&1 || \
  (systemctl restart hashtag-tracking && logger "Restarted hashtag-tracking service")
```

## Backup Strategy

### Database Backup

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/hashtag-tracking"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Full backup
pg_dump hashtag_tracking_prod | gzip > $BACKUP_DIR/hashtag_tracking_$DATE.sql.gz

# Retain last 30 days
find $BACKUP_DIR -name "hashtag_tracking_*.sql.gz" -mtime +30 -delete

# Verify backup
gunzip -t $BACKUP_DIR/hashtag_tracking_$DATE.sql.gz && \
  echo "Backup verified: $DATE"
```

Setup cron:

```bash
# Run daily at 2 AM
0 2 * * * /opt/hashtag-tracking/backup.sh >> /var/log/hashtag-tracking-backup.log 2>&1
```

### Storage Backup

```bash
# Backup media assets
rsync -avz /var/media/hashtag-tracking/ \
  /backups/hashtag-tracking-media/

# Or upload to S3
aws s3 sync /var/media/hashtag-tracking/ \
  s3://backups/hashtag-tracking-media/
```

## Logging and Alerting

### Structured Logging

Consider implementing structured logging:

```bash
npm install --save winston
```

### Alert Rules

Set up alerts for:
- Application crashes (systemctl status check)
- High error rate (log monitoring)
- Database connection failures
- Queue backlog growing
- Sync job failures

### Log Aggregation

Use ELK Stack, Datadog, or CloudWatch:

```bash
# Example: Send logs to CloudWatch
npm install --save aws-sdk winston-cloudwatch
```

## Scaling Considerations

### Horizontal Scaling

For multiple servers:

1. **Shared Database**: Use managed database (RDS, Google Cloud SQL)
2. **Shared Storage**: Switch to S3 for media assets
3. **Queue System**: Migrate to AWS SQS for distributed job processing
4. **Load Balancing**: Use Nginx, HAProxy, or cloud load balancer

### Vertical Scaling

For single server:

1. **Increase Resources**: More CPU, RAM
2. **Database Optimization**: Add indexes, tune queries
3. **Caching**: Add Redis for frequently accessed data
4. **Connection Pooling**: Tune PostgreSQL connection pool

## Rollback Procedure

### In Case of Issues

```bash
# Stop current version
systemctl stop hashtag-tracking

# Restore from backup (if needed)
psql hashtag_tracking_prod < /backups/hashtag_tracking_YYYYMMDD.sql.gz

# Checkout previous version
git checkout <previous-tag>

# Rebuild
npm install
npm run build
npm run db:migrate

# Start service
systemctl start hashtag-tracking

# Verify
curl http://localhost:3000/health
```

## Post-Deployment Verification

```bash
# Check health endpoint
curl https://api.example.com/health

# Test API endpoints
curl https://api.example.com/hashtags?limit=5

# Monitor logs
tail -f /var/log/hashtag-tracking.log

# Verify database
psql hashtag_tracking_prod -c "SELECT COUNT(*) FROM media;"

# Check service status
systemctl status hashtag-tracking

# Performance baseline
ab -n 100 -c 10 https://api.example.com/hashtags
```

## Maintenance Windows

### Regular Maintenance

- **Weekly**: Review logs, check resource usage
- **Monthly**: Database maintenance (ANALYZE, VACUUM)
- **Quarterly**: Update dependencies, security patches
- **Annually**: Full system review, disaster recovery test

### Planned Maintenance

```bash
# Maintenance mode endpoint
# (If implemented, pause syncs during maintenance)
curl -X POST https://api.example.com/admin/maintenance/enable

# Backup before maintenance
psql hashtag_tracking_prod -c "VACUUM ANALYZE;"

# Run updates
npm update

# Run migrations if needed
npm run db:migrate

# Test thoroughly
npm test

# Disable maintenance mode
curl -X POST https://api.example.com/admin/maintenance/disable
```

## Disaster Recovery

### Recovery Time Objective (RTO): 30 minutes
### Recovery Point Objective (RPO): 1 hour

### Recovery Steps

1. **Restore Database** (15 min)
   ```bash
   psql -d hashtag_tracking_prod < latest-backup.sql.gz
   ```

2. **Restore Code** (5 min)
   ```bash
   git checkout <last-stable-tag>
   npm install
   npm run build
   ```

3. **Restore Media** (5 min)
   ```bash
   rsync -avz /backups/media/ /var/media/hashtag-tracking/
   ```

4. **Verify and Start** (5 min)
   ```bash
   npm run db:migrate
   systemctl start hashtag-tracking
   curl http://localhost:3000/health
   ```

## Security Hardening

- [ ] Use HTTPS/TLS
- [ ] Implement API authentication
- [ ] Rate limiting on endpoints
- [ ] Input validation
- [ ] SQL injection prevention (already done)
- [ ] Keep dependencies updated
- [ ] Regular security audits
- [ ] Secure credential management (use AWS Secrets Manager)
- [ ] Network security (VPC, security groups)
- [ ] Enable database encryption at rest

## Support and Runbook

See [README.md](README.md) and [TESTING.md](TESTING.md) for operational details.

For AWS migration, see [instructions.md](instructions.md) for architecture guidance.
