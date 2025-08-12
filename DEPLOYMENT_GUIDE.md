# SkyGuard Analytics - Deployment Guide

## Table of Contents
1. [Infrastructure Overview](#infrastructure-overview)
2. [Backend Deployment (Render)](#backend-deployment-render)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Environment Configuration](#environment-configuration)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring & Logging](#monitoring--logging)
7. [Scaling Strategy](#scaling-strategy)
8. [Disaster Recovery](#disaster-recovery)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

## Infrastructure Overview

### Deployment Architecture

```mermaid
graph TB
    subgraph "Users"
        Browser[Web Browser]
        Mobile[Mobile Device]
    end
    
    subgraph "CDN & Edge"
        Vercel[Vercel Edge Network]
        CF[Cloudflare CDN]
    end
    
    subgraph "Frontend (Vercel)"
        Next[Next.js App]
        Static[Static Assets]
    end
    
    subgraph "Backend (Render)"
        LB[Load Balancer]
        API1[API Instance 1<br/>8-core GPU]
        API2[API Instance 2<br/>8-core GPU]
        APIn[API Instance N]
    end
    
    subgraph "Storage"
        GCS[Google Cloud Storage]
        DB[(PostgreSQL)]
        Cache[Redis Cache]
    end
    
    subgraph "External Services"
        NOAA[NOAA NEXRAD]
        Monitor[Monitoring]
    end
    
    Browser --> CF
    Mobile --> CF
    CF --> Vercel
    Vercel --> Next
    Next --> Static
    
    Next --> LB
    LB --> API1
    LB --> API2
    LB --> APIn
    
    API1 --> GCS
    API1 --> DB
    API1 --> Cache
    
    GCS --> NOAA
    API1 --> Monitor
```

### Infrastructure Components

| Component | Service | Configuration | Purpose |
|-----------|---------|---------------|---------|
| **Frontend** | Vercel | Next.js, Edge Functions | Global CDN, SSR/SSG |
| **Backend** | Render | 8-core GPU, 32GB RAM | ML inference, API |
| **Database** | PostgreSQL | Managed, 100GB | Persistent storage |
| **Cache** | Redis | 16GB RAM | Session, data cache |
| **Storage** | Google Cloud Storage | Multi-region | Radar data, models |
| **CDN** | Cloudflare | Global PoPs | DDoS protection, caching |
| **Monitoring** | Datadog/New Relic | APM, logs, metrics | Observability |

## Backend Deployment (Render)

### Render Configuration

#### render.yaml
```yaml
services:
  - type: web
    name: skyguard-api
    runtime: docker
    repo: https://github.com/yourusername/skyguard-backend
    branch: main
    region: oregon
    plan: pro
    
    # GPU Instance Configuration
    instance:
      gpu: true
      gpuType: T4
      cores: 8
      memory: 32GB
      
    # Environment Variables
    envVars:
      - key: PYTHON_VERSION
        value: 3.11
      - key: PORT
        value: 8000
      - key: WORKERS
        value: 4
      - key: DATABASE_URL
        fromDatabase:
          name: skyguard-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: skyguard-redis
          type: redis
          property: connectionString
      - key: GCS_BUCKET
        value: skyguard-data
      - key: MODEL_PATH
        value: /app/models
      
    # Health Check
    healthCheckPath: /health
    
    # Auto Deploy
    autoDeploy: true
    
    # Scaling
    scaling:
      minInstances: 2
      maxInstances: 10
      targetCPU: 70
      targetMemory: 80

databases:
  - name: skyguard-db
    plan: pro
    ipAllowList: []

redis:
  - name: skyguard-redis
    plan: pro
    maxMemory: 16GB
```

#### Dockerfile
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libgeos-dev \
    libproj-dev \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Download models
RUN python scripts/download_models.py

# Create non-root user
RUN useradd -m -u 1000 skyguard && \
    chown -R skyguard:skyguard /app

USER skyguard

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Deployment Steps

1. **Prepare Repository**
```bash
# Clone repository
git clone https://github.com/yourusername/skyguard-backend.git
cd skyguard-backend

# Create render.yaml
vim render.yaml

# Commit configuration
git add render.yaml
git commit -m "Add Render deployment configuration"
git push origin main
```

2. **Deploy to Render**
```bash
# Install Render CLI
npm install -g @render-oss/render-cli

# Login to Render
render login

# Create services from render.yaml
render up

# Check deployment status
render status skyguard-api
```

3. **Configure GPU Instance**
```bash
# SSH into instance (if needed)
render ssh skyguard-api

# Verify GPU availability
nvidia-smi

# Check TensorFlow GPU support
python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```

4. **Database Migration**
```bash
# Run migrations
render exec skyguard-api -- python init_db.py

# Verify database
render exec skyguard-api -- python -c "from app.database import engine; print(engine.url)"
```

## Frontend Deployment (Vercel)

### Vercel Configuration

#### vercel.json
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  
  "regions": ["iad1", "sfo1", "lhr1"],
  
  "env": {
    "NEXT_PUBLIC_API_URL": "@skyguard_api_url",
    "NEXT_PUBLIC_MAPBOX_TOKEN": "@mapbox_token",
    "NEXT_PUBLIC_GA_ID": "@google_analytics_id"
  },
  
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    }
  ],
  
  "rewrites": [
    {
      "source": "/api/v1/:path*",
      "destination": "https://api.skyguard-analytics.com/api/v1/:path*"
    }
  ],
  
  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": true
    }
  ]
}
```

### Deployment Steps

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Initialize Project**
```bash
cd skyguard-frontend
vercel init

# Answer prompts:
# - Link to existing project? No
# - What's your project name? skyguard-frontend
# - In which directory is your code? ./
# - Want to override settings? No
```

3. **Configure Environment Variables**
```bash
# Set production environment variables
vercel env add NEXT_PUBLIC_API_URL production
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
```

4. **Deploy to Production**
```bash
# Deploy to production
vercel --prod

# Check deployment
vercel ls
vercel inspect [deployment-url]
```

5. **Configure Custom Domain**
```bash
# Add custom domain
vercel domains add skyguard-analytics.com

# Verify domain
vercel domains verify skyguard-analytics.com

# Set as production domain
vercel alias set [deployment-url] skyguard-analytics.com
```

## Environment Configuration

### Backend Environment Variables

```bash
# .env.production
# API Configuration
API_V1_STR=/api/v1
HOST=0.0.0.0
PORT=8000
WORKERS=4

# Database
DATABASE_URL=postgresql://user:pass@host:5432/skyguard
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Redis Cache
REDIS_URL=redis://user:pass@host:6379/0
CACHE_TTL=3600

# Google Cloud Storage
GCS_BUCKET=skyguard-data
GCS_PROJECT_ID=skyguard-analytics
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/gcs-key.json

# Model Configuration
MODEL_PATH=/app/models
MODEL_CACHE_SIZE=1000
ENABLE_GPU=true

# Security
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=https://skyguard-analytics.com
CORS_ALLOW_CREDENTIALS=true

# Monitoring
SENTRY_DSN=https://key@sentry.io/project
LOG_LEVEL=INFO
ENABLE_METRICS=true

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_PER_HOUR=1000
```

### Frontend Environment Variables

```bash
# .env.production
# API Configuration
NEXT_PUBLIC_API_URL=https://api.skyguard-analytics.com
NEXT_PUBLIC_WS_URL=wss://api.skyguard-analytics.com

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_HOTJAR_ID=1234567

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxxxxxxx

# Authentication
NEXTAUTH_URL=https://skyguard-analytics.com
NEXTAUTH_SECRET=your-nextauth-secret

# Features
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

## CI/CD Pipeline

### GitHub Actions Workflow

#### Backend CI/CD (.github/workflows/backend.yml)
```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install pytest pytest-cov
    
    - name: Run tests
      run: |
        cd backend
        pytest --cov=app --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Render
      env:
        RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
      run: |
        curl -X POST \
          -H "Authorization: Bearer $RENDER_API_KEY" \
          -H "Content-Type: application/json" \
          -d '{"clearCache": true}' \
          https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys
```

#### Frontend CI/CD (.github/workflows/frontend.yml)
```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
  pull_request:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run linter
      run: |
        cd frontend
        npm run lint
    
    - name: Run type check
      run: |
        cd frontend
        npm run type-check
    
    - name: Run tests
      run: |
        cd frontend
        npm test -- --coverage
    
    - name: Build application
      run: |
        cd frontend
        npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
        working-directory: ./frontend
```

## Monitoring & Logging

### Application Performance Monitoring

#### Datadog Integration
```python
# backend/app/monitoring.py
from datadog import initialize, statsd
import time

# Initialize Datadog
initialize(
    api_key=os.getenv('DATADOG_API_KEY'),
    app_key=os.getenv('DATADOG_APP_KEY')
)

class MetricsCollector:
    @staticmethod
    def track_request(endpoint: str, method: str, status: int, duration: float):
        statsd.increment(
            'api.requests',
            tags=[f'endpoint:{endpoint}', f'method:{method}', f'status:{status}']
        )
        statsd.histogram(
            'api.request.duration',
            duration,
            tags=[f'endpoint:{endpoint}']
        )
    
    @staticmethod
    def track_model_inference(model_name: str, duration: float):
        statsd.histogram(
            'model.inference.duration',
            duration,
            tags=[f'model:{model_name}']
        )
    
    @staticmethod
    def track_cache_hit(cache_type: str, hit: bool):
        statsd.increment(
            f'cache.{cache_type}.{"hit" if hit else "miss"}'
        )
```

#### Logging Configuration
```python
# backend/app/logger_config.py
import logging.config

LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'stream': 'ext://sys.stdout'
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'formatter': 'json',
            'filename': '/var/log/skyguard/app.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console', 'file']
    }
}

logging.config.dictConfig(LOGGING_CONFIG)
```

### Frontend Monitoring

```typescript
// frontend/lib/monitoring.ts
import * as Sentry from "@sentry/nextjs";
import { useEffect } from 'react';

// Initialize Sentry
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
});

// Performance monitoring
export function trackPageView(url: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: url,
    });
  }
}

// Error boundary
export function ErrorBoundary({ children }) {
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      Sentry.captureException(error.error);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  return children;
}
```

## Scaling Strategy

### Horizontal Scaling

```yaml
# render-scaling.yaml
scaling:
  # Auto-scaling configuration
  auto:
    enabled: true
    minInstances: 2
    maxInstances: 10
    
    # Scaling triggers
    triggers:
      - type: cpu
        threshold: 70
        duration: 60  # seconds
        
      - type: memory
        threshold: 80
        duration: 60
        
      - type: requestRate
        threshold: 1000  # requests per minute
        duration: 30
        
      - type: responseTime
        threshold: 500  # milliseconds
        duration: 60
    
    # Cool-down periods
    scaleUpCooldown: 180  # seconds
    scaleDownCooldown: 300
    
  # Manual scaling overrides
  manual:
    enabled: false
    instances: 5
```

### Load Balancing

```nginx
# nginx.conf for load balancing
upstream backend {
    least_conn;
    
    server api1.skyguard.internal:8000 weight=1;
    server api2.skyguard.internal:8000 weight=1;
    server api3.skyguard.internal:8000 weight=1;
    
    # Health checks
    check interval=5000 rise=2 fall=3 timeout=2000;
}

server {
    listen 80;
    server_name api.skyguard-analytics.com;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
```

## Disaster Recovery

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Automated backup script

# Database backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Upload to GCS
gsutil cp backup_*.sql.gz gs://skyguard-backups/database/

# Model backup
tar -czf models_backup_$(date +%Y%m%d).tar.gz /app/models
gsutil cp models_backup_*.tar.gz gs://skyguard-backups/models/

# Radar data backup
rsync -av --delete /data/radar/ gs://skyguard-backups/radar/

# Cleanup old backups (keep 30 days)
find . -name "backup_*.sql.gz" -mtime +30 -delete
```

### Recovery Procedures

```bash
#!/bin/bash
# restore.sh - Disaster recovery script

# 1. Restore database
echo "Restoring database..."
gsutil cp gs://skyguard-backups/database/latest.sql.gz .
gunzip -c latest.sql.gz | psql $DATABASE_URL

# 2. Restore models
echo "Restoring ML models..."
gsutil cp gs://skyguard-backups/models/latest.tar.gz .
tar -xzf latest.tar.gz -C /

# 3. Restore radar data
echo "Restoring radar data..."
gsutil -m rsync -r gs://skyguard-backups/radar/ /data/radar/

# 4. Clear caches
echo "Clearing caches..."
redis-cli FLUSHALL

# 5. Restart services
echo "Restarting services..."
systemctl restart skyguard-api
systemctl restart nginx

echo "Recovery complete!"
```

## Security Considerations

### Security Checklist

- [ ] **SSL/TLS Configuration**
  - Force HTTPS redirect
  - TLS 1.3 minimum
  - Strong cipher suites
  - HSTS headers

- [ ] **Authentication & Authorization**
  - JWT token validation
  - Role-based access control
  - API key management
  - OAuth 2.0 integration

- [ ] **Data Protection**
  - Encryption at rest
  - Encryption in transit
  - PII data masking
  - GDPR compliance

- [ ] **Network Security**
  - WAF configuration
  - DDoS protection
  - IP whitelisting
  - VPC isolation

- [ ] **Application Security**
  - Input validation
  - SQL injection prevention
  - XSS protection
  - CSRF tokens

- [ ] **Monitoring & Auditing**
  - Security event logging
  - Intrusion detection
  - Vulnerability scanning
  - Penetration testing

### Security Headers

```javascript
// next.config.js - Security headers
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google-analytics.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://api.skyguard-analytics.com;
      frame-ancestors 'none';
    `.replace(/\n/g, '')
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];
```

## Troubleshooting

### Common Issues and Solutions

#### 1. High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Clear caches
sync && echo 3 > /proc/sys/vm/drop_caches

# Restart services
systemctl restart skyguard-api
```

#### 2. Slow API Response
```bash
# Check API logs
tail -f /var/log/skyguard/app.log | grep ERROR

# Monitor database queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check cache hit rate
redis-cli INFO stats | grep keyspace_hits
```

#### 3. Model Loading Issues
```python
# Verify GPU availability
import tensorflow as tf
print(tf.config.list_physical_devices('GPU'))

# Check model files
import os
for model in os.listdir('/app/models'):
    print(f"{model}: {os.path.getsize(f'/app/models/{model}') / 1024 / 1024:.2f} MB")

# Test model loading
from app.core.models.model_manager import model_manager
model_manager.get_weather_nowcasting_model()
```

#### 4. Deployment Failures
```bash
# Check deployment logs
render logs skyguard-api --tail 100

# Verify environment variables
render env skyguard-api

# Test health endpoint
curl https://api.skyguard-analytics.com/health

# Rollback if needed
render rollback skyguard-api
```

### Performance Tuning

```bash
# Optimize PostgreSQL
psql $DATABASE_URL << EOF
ALTER SYSTEM SET shared_buffers = '8GB';
ALTER SYSTEM SET effective_cache_size = '24GB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';
ALTER SYSTEM SET work_mem = '50MB';
SELECT pg_reload_conf();
EOF

# Optimize Redis
redis-cli CONFIG SET maxmemory 16gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Optimize Python
export PYTHONOPTIMIZE=2
export PYTHONDONTWRITEBYTECODE=1
```

---

*Document Version: 1.0*  
*Last Updated: 2025*  
*Status: Production Ready*