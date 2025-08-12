# SkyGuard Analytics - Technical Diagrams

## Table of Contents
1. [System Architecture Diagrams](#system-architecture-diagrams)
2. [User Flow Diagrams](#user-flow-diagrams)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Component Diagrams](#component-diagrams)
5. [Deployment Diagrams](#deployment-diagrams)
6. [Sequence Diagrams](#sequence-diagrams)
7. [State Diagrams](#state-diagrams)
8. [Infrastructure Diagrams](#infrastructure-diagrams)

## System Architecture Diagrams

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Browser]
        Mobile[Mobile App]
        API_Client[API Clients]
    end
    
    subgraph "Presentation Layer"
        CDN[CDN/Edge Network]
        NextJS[Next.js Frontend<br/>Vercel]
    end
    
    subgraph "API Gateway"
        LB[Load Balancer]
        RateLimit[Rate Limiter]
        Auth[Authentication]
    end
    
    subgraph "Application Layer"
        FastAPI[FastAPI Services<br/>Render GPU]
        WSServer[WebSocket Server]
    end
    
    subgraph "Service Layer"
        NowcastSvc[Nowcasting Service]
        ImpactSvc[Impact Analysis]
        RiskSvc[Risk Assessment]
        SimSvc[Simulation Engine]
    end
    
    subgraph "ML Layer"
        ConvLSTM[Weather Model<br/>ConvLSTM]
        XGBoost[Damage Model<br/>XGBoost]
        CatBoost[Risk Model<br/>CatBoost]
        Ensemble[Ensemble Models]
    end
    
    subgraph "Data Layer"
        Cache[Redis Cache]
        PostgreSQL[(PostgreSQL)]
        GCS[Google Cloud Storage]
    end
    
    subgraph "External Services"
        NOAA[NOAA NEXRAD]
        Weather[Weather APIs]
    end
    
    Web --> CDN
    Mobile --> CDN
    API_Client --> LB
    
    CDN --> NextJS
    NextJS --> LB
    
    LB --> RateLimit
    RateLimit --> Auth
    Auth --> FastAPI
    Auth --> WSServer
    
    FastAPI --> NowcastSvc
    FastAPI --> ImpactSvc
    FastAPI --> RiskSvc
    FastAPI --> SimSvc
    
    NowcastSvc --> ConvLSTM
    ImpactSvc --> XGBoost
    RiskSvc --> CatBoost
    SimSvc --> Ensemble
    
    NowcastSvc --> Cache
    ImpactSvc --> PostgreSQL
    RiskSvc --> PostgreSQL
    SimSvc --> Cache
    
    NowcastSvc --> GCS
    GCS --> NOAA
    
    style Web fill:#e1f5fe
    style Mobile fill:#e1f5fe
    style FastAPI fill:#fff3e0
    style ConvLSTM fill:#f3e5f5
    style PostgreSQL fill:#e8f5e9
```

### Microservices Architecture

```mermaid
graph LR
    subgraph "API Gateway"
        Gateway[API Gateway<br/>FastAPI]
    end
    
    subgraph "Core Services"
        subgraph "Weather Nowcasting"
            NowcastAPI[REST API]
            NowcastWS[WebSocket]
            RadarProc[Radar Processor]
            MLInference[ML Inference]
        end
        
        subgraph "Impact Analysis"
            ImpactAPI[REST API]
            DamageCalc[Damage Calculator]
            CasualtyCalc[Casualty Estimator]
            SeverityClass[Severity Classifier]
        end
        
        subgraph "Risk Assessment"
            RiskAPI[REST API]
            StateRisk[State Analyzer]
            EventRisk[Event Analyzer]
            RiskScorer[Risk Scorer]
        end
        
        subgraph "Simulation"
            SimAPI[REST API]
            ScenarioGen[Scenario Generator]
            SimEngine[Simulation Engine]
            Analytics[Analytics Engine]
        end
    end
    
    subgraph "Shared Services"
        AuthSvc[Auth Service]
        CacheSvc[Cache Service]
        LogSvc[Logging Service]
        MetricsSvc[Metrics Service]
    end
    
    Gateway --> NowcastAPI
    Gateway --> ImpactAPI
    Gateway --> RiskAPI
    Gateway --> SimAPI
    
    NowcastAPI --> RadarProc
    RadarProc --> MLInference
    NowcastAPI --> NowcastWS
    
    ImpactAPI --> DamageCalc
    ImpactAPI --> CasualtyCalc
    ImpactAPI --> SeverityClass
    
    RiskAPI --> StateRisk
    RiskAPI --> EventRisk
    StateRisk --> RiskScorer
    EventRisk --> RiskScorer
    
    SimAPI --> ScenarioGen
    ScenarioGen --> SimEngine
    SimEngine --> Analytics
    
    NowcastAPI --> AuthSvc
    ImpactAPI --> AuthSvc
    RiskAPI --> AuthSvc
    SimAPI --> AuthSvc
    
    RadarProc --> CacheSvc
    DamageCalc --> CacheSvc
    RiskScorer --> CacheSvc
    SimEngine --> CacheSvc
```

## User Flow Diagrams

### Weather Prediction User Flow

```mermaid
graph TD
    Start([User Opens App]) --> Landing[Landing Page]
    Landing --> Dashboard[Dashboard]
    Dashboard --> SelectRadar[Select Radar Site]
    
    SelectRadar --> Miami[Miami KAMX]
    SelectRadar --> Seattle[Seattle KATX]
    
    Miami --> FetchData[Fetch Latest Data]
    Seattle --> FetchData
    
    FetchData --> Processing[Process Radar Data]
    Processing --> MLModel[Run ML Model]
    MLModel --> Generate[Generate 6 Frames]
    
    Generate --> Display[Display Prediction]
    Display --> Interact{User Action}
    
    Interact --> Export[Export Data]
    Interact --> Share[Share Results]
    Interact --> History[View History]
    Interact --> NewPred[New Prediction]
    
    NewPred --> SelectRadar
    
    Export --> Download[Download CSV/JSON]
    Share --> GenLink[Generate Share Link]
    History --> Timeline[Show Timeline]
    
    style Start fill:#e8f5e9
    style Display fill:#fff3e0
    style MLModel fill:#f3e5f5
```

### Impact Analysis Workflow

```mermaid
graph TD
    Start([Start Analysis]) --> SelectType{Select Analysis Type}
    
    SelectType --> Property[Property Damage]
    SelectType --> Casualty[Casualty Risk]
    SelectType --> Severity[Severity Assessment]
    SelectType --> Comprehensive[Comprehensive]
    
    Property --> PropForm[Fill Property Form<br/>- Event Type<br/>- State<br/>- Magnitude<br/>- Duration]
    Casualty --> CasForm[Fill Casualty Form<br/>- Event Type<br/>- State<br/>- Magnitude<br/>- Tornado Scale]
    Severity --> SevForm[Fill Severity Form<br/>- Event Type<br/>- State<br/>- Damage Amount<br/>- Casualties]
    Comprehensive --> CompForm[Fill Comprehensive Form<br/>- Event Type<br/>- State<br/>- All Parameters]
    
    PropForm --> Validate1{Validate Input}
    CasForm --> Validate2{Validate Input}
    SevForm --> Validate3{Validate Input}
    CompForm --> Validate4{Validate Input}
    
    Validate1 --> |Valid| PropModel[Run Damage Model]
    Validate2 --> |Valid| CasModel[Run Casualty Model]
    Validate3 --> |Valid| SevModel[Run Severity Model]
    Validate4 --> |Valid| AllModels[Run All Models]
    
    Validate1 --> |Invalid| Error1[Show Errors]
    Validate2 --> |Invalid| Error2[Show Errors]
    Validate3 --> |Invalid| Error3[Show Errors]
    Validate4 --> |Invalid| Error4[Show Errors]
    
    Error1 --> PropForm
    Error2 --> CasForm
    Error3 --> SevForm
    Error4 --> CompForm
    
    PropModel --> PropResults[Display Results<br/>- Damage Amount<br/>- Confidence<br/>- Range<br/>- Factors]
    CasModel --> CasResults[Display Results<br/>- Risk Score<br/>- Probability<br/>- Categories]
    SevModel --> SevResults[Display Results<br/>- Severity Class<br/>- Description<br/>- Confidence]
    AllModels --> CompResults[Display All Results<br/>- Combined Analysis]
    
    PropResults --> Actions1{User Actions}
    CasResults --> Actions2{User Actions}
    SevResults --> Actions3{User Actions}
    CompResults --> Actions4{User Actions}
    
    Actions1 --> SaveReport[Save Report]
    Actions1 --> NewAnalysis[New Analysis]
    Actions1 --> Compare[Compare Scenarios]
    
    style Start fill:#e8f5e9
    style PropModel fill:#f3e5f5
    style CasModel fill:#f3e5f5
    style SevModel fill:#f3e5f5
    style AllModels fill:#f3e5f5
```

## Data Flow Diagrams

### NEXRAD Data Processing Pipeline

```mermaid
graph LR
    subgraph "Data Source"
        NOAA[NOAA NEXRAD<br/>Level-II Archive]
    end
    
    subgraph "Data Acquisition"
        GCS[Google Cloud Storage<br/>Public Dataset]
        Download[Download Service]
        LocalCache[Local File Cache]
    end
    
    subgraph "Data Processing"
        Parser[PyART Parser]
        QC[Quality Control<br/>- Remove noise<br/>- Filter outliers]
        Interpolation[Grid Interpolation<br/>- Polar to Cartesian<br/>- 64x64 grid]
        Normalization[Normalization<br/>- Scale 0-1<br/>- Handle NaN]
    end
    
    subgraph "ML Pipeline"
        SequenceBuilder[Sequence Builder<br/>10 frames]
        TensorFormat[Tensor Formatting<br/>(1,10,64,64,1)]
        Model[ConvLSTM Model]
        Prediction[6-Frame Prediction]
    end
    
    subgraph "Post-Processing"
        GeoProjection[Geographic Projection]
        Visualization[Visualization Layer]
        API[API Response]
    end
    
    NOAA --> GCS
    GCS --> Download
    Download --> LocalCache
    LocalCache --> Parser
    Parser --> QC
    QC --> Interpolation
    Interpolation --> Normalization
    Normalization --> SequenceBuilder
    SequenceBuilder --> TensorFormat
    TensorFormat --> Model
    Model --> Prediction
    Prediction --> GeoProjection
    GeoProjection --> Visualization
    Visualization --> API
    
    style NOAA fill:#e3f2fd
    style Model fill:#f3e5f5
    style API fill:#e8f5e9
```

### Real-time Data Synchronization

```mermaid
graph TB
    subgraph "Data Sources"
        Radar[Radar Stations]
        Weather[Weather Stations]
        Satellite[Satellite Data]
    end
    
    subgraph "Ingestion Layer"
        Stream[Stream Processor]
        Queue[Message Queue]
        Validator[Data Validator]
    end
    
    subgraph "Processing Layer"
        RTProcessor[Real-time Processor]
        BatchProcessor[Batch Processor]
        MLPipeline[ML Pipeline]
    end
    
    subgraph "Storage Layer"
        HotStorage[Hot Storage<br/>Redis]
        WarmStorage[Warm Storage<br/>PostgreSQL]
        ColdStorage[Cold Storage<br/>GCS]
    end
    
    subgraph "Distribution"
        WebSocket[WebSocket Server]
        REST[REST API]
        CDN[CDN Cache]
    end
    
    Radar --> Stream
    Weather --> Stream
    Satellite --> Stream
    
    Stream --> Queue
    Queue --> Validator
    
    Validator --> RTProcessor
    Validator --> BatchProcessor
    
    RTProcessor --> MLPipeline
    BatchProcessor --> MLPipeline
    
    RTProcessor --> HotStorage
    BatchProcessor --> WarmStorage
    MLPipeline --> HotStorage
    
    HotStorage --> WebSocket
    HotStorage --> REST
    WarmStorage --> REST
    
    REST --> CDN
    
    HotStorage -.->|Age out| WarmStorage
    WarmStorage -.->|Archive| ColdStorage
```

## Component Diagrams

### Frontend Component Hierarchy

```mermaid
graph TD
    App[App Root]
    
    App --> Layout[Layout]
    Layout --> Nav[Navigation]
    Layout --> Main[Main Content]
    Layout --> Footer[Footer]
    
    Main --> Router{Router}
    
    Router --> Home[Home Page]
    Router --> Dashboard[Dashboard]
    Router --> NotFound[404 Page]
    
    Home --> Hero[Hero Section]
    Home --> Features[Features Section]
    Home --> CTA[CTA Section]
    
    Dashboard --> Sidebar[Sidebar Navigation]
    Dashboard --> Content[Dashboard Content]
    
    Content --> Overview[Overview]
    Content --> Impact[Impact Analysis]
    Content --> Risk[Risk Assessment]
    Content --> Radar[Radar Forecast]
    Content --> Simulation[Simulation]
    
    Impact --> ImpactForm[Impact Form]
    Impact --> ImpactResults[Results Display]
    Impact --> ImpactCharts[Charts]
    
    Radar --> MapView[Map View]
    Radar --> Controls[Radar Controls]
    Radar --> Timeline[Timeline]
    Radar --> Predictions[Prediction Display]
    
    Risk --> RiskForm[Risk Form]
    Risk --> RiskMap[Risk Heat Map]
    Risk --> Rankings[State Rankings]
    
    Simulation --> ScenarioBuilder[Scenario Builder]
    Simulation --> SimResults[Simulation Results]
    Simulation --> Comparison[Comparison View]
    
    style App fill:#e3f2fd
    style Dashboard fill:#fff3e0
    style Impact fill:#f3e5f5
    style Radar fill:#e8f5e9
```

### Backend Service Components

```mermaid
graph TD
    FastAPI[FastAPI Application]
    
    FastAPI --> Middleware[Middleware Stack]
    Middleware --> CORS[CORS Handler]
    Middleware --> RateLimit[Rate Limiter]
    Middleware --> ErrorHandler[Error Handler]
    Middleware --> Metrics[Metrics Collector]
    
    FastAPI --> Routers[API Routers]
    
    Routers --> NowcastRouter[Nowcasting Router]
    Routers --> ImpactRouter[Impact Router]
    Routers --> RiskRouter[Risk Router]
    Routers --> SimRouter[Simulation Router]
    
    NowcastRouter --> NowcastEndpoints[Endpoints<br/>- /predict<br/>- /batch<br/>- /sites<br/>- /radar-data]
    
    ImpactRouter --> ImpactEndpoints[Endpoints<br/>- /property-damage<br/>- /casualty-risk<br/>- /severity<br/>- /comprehensive]
    
    NowcastEndpoints --> NowcastService[Nowcasting Service]
    ImpactEndpoints --> ImpactService[Impact Service]
    
    NowcastService --> ModelManager[Model Manager]
    ImpactService --> ModelManager
    
    ModelManager --> Models[ML Models]
    Models --> ConvLSTM[ConvLSTM]
    Models --> XGBoost[XGBoost]
    Models --> CatBoost[CatBoost]
    
    NowcastService --> DataServices[Data Services]
    DataServices --> NEXRADService[NEXRAD Service]
    DataServices --> RadarProcessor[Radar Processor]
    DataServices --> CacheService[Cache Service]
    
    style FastAPI fill:#fff3e0
    style ModelManager fill:#f3e5f5
    style Models fill:#e8f5e9
```

## Deployment Diagrams

### Production Deployment Architecture

```mermaid
graph TB
    subgraph "Internet"
        Users[Users]
        CloudFlare[CloudFlare CDN]
    end
    
    subgraph "Vercel Edge Network"
        Edge1[Edge Location 1<br/>US East]
        Edge2[Edge Location 2<br/>US West]
        Edge3[Edge Location 3<br/>Europe]
        EdgeN[Edge Location N]
    end
    
    subgraph "Frontend Deployment"
        Vercel[Vercel Platform]
        NextApp[Next.js Application]
        Static[Static Assets]
        Functions[Edge Functions]
    end
    
    subgraph "Render Cloud"
        LB[Load Balancer]
        
        subgraph "GPU Instances"
            GPU1[Instance 1<br/>8-core GPU<br/>32GB RAM]
            GPU2[Instance 2<br/>8-core GPU<br/>32GB RAM]
            GPUN[Instance N]
        end
        
        subgraph "Services"
            Redis[Redis Cache<br/>16GB]
            PostgreSQL[(PostgreSQL<br/>100GB)]
        end
    end
    
    subgraph "Google Cloud"
        GCS[Cloud Storage<br/>Multi-region]
        NEXRADData[NEXRAD Archive]
    end
    
    subgraph "Monitoring"
        Datadog[Datadog APM]
        Sentry[Sentry]
        Logs[Log Aggregation]
    end
    
    Users --> CloudFlare
    CloudFlare --> Edge1
    CloudFlare --> Edge2
    CloudFlare --> Edge3
    
    Edge1 --> Vercel
    Edge2 --> Vercel
    Edge3 --> Vercel
    
    Vercel --> NextApp
    NextApp --> Static
    NextApp --> Functions
    
    NextApp --> LB
    
    LB --> GPU1
    LB --> GPU2
    LB --> GPUN
    
    GPU1 --> Redis
    GPU1 --> PostgreSQL
    GPU1 --> GCS
    
    GCS --> NEXRADData
    
    GPU1 --> Datadog
    GPU1 --> Sentry
    GPU1 --> Logs
    
    style Users fill:#e3f2fd
    style GPU1 fill:#fff3e0
    style GCS fill:#e8f5e9
```

### CI/CD Pipeline

```mermaid
graph LR
    subgraph "Development"
        Dev[Developer]
        LocalEnv[Local Environment]
    end
    
    subgraph "Version Control"
        GitHub[GitHub Repository]
        PR[Pull Request]
        Review[Code Review]
    end
    
    subgraph "CI Pipeline"
        Actions[GitHub Actions]
        Lint[Linting]
        TypeCheck[Type Checking]
        UnitTests[Unit Tests]
        IntTests[Integration Tests]
        Build[Build]
    end
    
    subgraph "CD Pipeline"
        Deploy{Deploy Decision}
        Staging[Staging Deploy]
        StagingTests[Staging Tests]
        Production[Production Deploy]
        Rollback[Rollback]
    end
    
    subgraph "Monitoring"
        HealthCheck[Health Checks]
        Metrics[Metrics]
        Alerts[Alerts]
    end
    
    Dev --> LocalEnv
    LocalEnv --> GitHub
    GitHub --> PR
    PR --> Review
    
    Review --> Actions
    Actions --> Lint
    Lint --> TypeCheck
    TypeCheck --> UnitTests
    UnitTests --> IntTests
    IntTests --> Build
    
    Build --> Deploy
    Deploy -->|main branch| Staging
    Deploy -->|tag| Production
    
    Staging --> StagingTests
    StagingTests -->|Pass| Production
    StagingTests -->|Fail| Rollback
    
    Production --> HealthCheck
    HealthCheck --> Metrics
    Metrics --> Alerts
    
    style Dev fill:#e3f2fd
    style Actions fill:#fff3e0
    style Production fill:#e8f5e9
```

## Sequence Diagrams

### Weather Prediction Sequence

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Cache
    participant NEXRADService
    participant MLModel
    participant GCS
    
    User->>Frontend: Request prediction (KAMX)
    Frontend->>API: POST /api/v1/nowcasting/predict
    
    API->>Cache: Check cache
    Cache-->>API: Cache miss
    
    API->>NEXRADService: Get latest files
    NEXRADService->>GCS: List recent files
    GCS-->>NEXRADService: File list
    
    NEXRADService->>GCS: Download files
    GCS-->>NEXRADService: Radar data
    
    NEXRADService->>API: Process radar data
    API->>MLModel: Create input sequence
    MLModel->>MLModel: Run inference
    MLModel-->>API: 6-frame prediction
    
    API->>Cache: Store result
    API-->>Frontend: Prediction response
    Frontend-->>User: Display forecast
    
    Note over User,Frontend: Real-time updates via WebSocket
    
    loop Every 10 minutes
        API->>Frontend: WebSocket update
        Frontend->>User: Update display
    end
```

### Impact Analysis Sequence

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant ValidationService
    participant ModelManager
    participant DamageModel
    participant Database
    
    User->>Frontend: Submit impact form
    Frontend->>Frontend: Client-side validation
    Frontend->>API: POST /api/v1/impact/property-damage
    
    API->>ValidationService: Validate request
    ValidationService-->>API: Valid
    
    API->>ModelManager: Get damage model
    ModelManager->>ModelManager: Check if loaded
    ModelManager-->>API: Model instance
    
    API->>DamageModel: Predict damage
    DamageModel->>DamageModel: Feature engineering
    DamageModel->>DamageModel: Run prediction
    DamageModel-->>API: Damage estimate
    
    API->>API: Calculate confidence
    API->>API: Determine factors
    
    API->>Database: Store prediction
    Database-->>API: Stored
    
    API-->>Frontend: Response with results
    Frontend->>Frontend: Render charts
    Frontend-->>User: Display results
```

## State Diagrams

### Application State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> Loading: User action
    Loading --> Processing: Data fetched
    Loading --> Error: Fetch failed
    
    Processing --> Displaying: Processing complete
    Processing --> Error: Processing failed
    
    Displaying --> Idle: Reset
    Displaying --> Updating: New data
    
    Updating --> Displaying: Update complete
    Updating --> Error: Update failed
    
    Error --> Idle: Retry
    Error --> [*]: Fatal error
    
    state Processing {
        [*] --> Validating
        Validating --> Transforming
        Transforming --> Predicting
        Predicting --> Formatting
        Formatting --> [*]
    }
    
    state Displaying {
        [*] --> RenderingUI
        RenderingUI --> Interactive
        Interactive --> Exporting: Export action
        Exporting --> Interactive: Complete
    }
```

### Model Lifecycle State

```mermaid
stateDiagram-v2
    [*] --> Unloaded
    
    Unloaded --> Loading: Load request
    Loading --> Loaded: Success
    Loading --> Failed: Error
    
    Loaded --> Ready: Warm up
    Ready --> Inferring: Prediction request
    
    Inferring --> Ready: Complete
    Inferring --> Error: Inference failed
    
    Error --> Ready: Retry
    Error --> Reloading: Critical error
    
    Reloading --> Loaded: Success
    Reloading --> Failed: Error
    
    Failed --> Unloaded: Reset
    Ready --> Unloading: Shutdown
    Unloading --> Unloaded: Complete
    
    state Ready {
        [*] --> Idle
        Idle --> Processing: Request
        Processing --> Idle: Complete
    }
```

## Infrastructure Diagrams

### Network Architecture

```mermaid
graph TB
    subgraph "Public Internet"
        Internet[Internet]
    end
    
    subgraph "CDN Layer"
        CloudFlare[CloudFlare<br/>DDoS Protection<br/>WAF]
    end
    
    subgraph "Edge Network"
        VercelEdge[Vercel Edge<br/>Global PoPs]
    end
    
    subgraph "Application Network"
        subgraph "DMZ"
            WAF[Web Application Firewall]
            LB[Load Balancer]
        end
        
        subgraph "App Subnet"
            Web1[Web Server 1]
            Web2[Web Server 2]
            API1[API Server 1]
            API2[API Server 2]
        end
        
        subgraph "Data Subnet"
            Cache[Redis Cluster]
            DB[(Database Cluster)]
        end
        
        subgraph "ML Subnet"
            GPU1[GPU Node 1]
            GPU2[GPU Node 2]
            ModelStore[Model Storage]
        end
    end
    
    subgraph "Storage Network"
        GCS[Google Cloud Storage]
        Backup[Backup Storage]
    end
    
    Internet --> CloudFlare
    CloudFlare --> VercelEdge
    VercelEdge --> WAF
    
    WAF --> LB
    LB --> Web1
    LB --> Web2
    LB --> API1
    LB --> API2
    
    API1 --> Cache
    API1 --> DB
    API2 --> Cache
    API2 --> DB
    
    API1 --> GPU1
    API2 --> GPU2
    
    GPU1 --> ModelStore
    GPU2 --> ModelStore
    
    API1 --> GCS
    DB --> Backup
    
    style Internet fill:#ffebee
    style CloudFlare fill:#e3f2fd
    style GPU1 fill:#f3e5f5
    style DB fill:#e8f5e9
```

### Resource Allocation

```mermaid
graph TB
    subgraph "Compute Resources"
        subgraph "Frontend Tier"
            FE1[Vercel Function<br/>1 vCPU, 1GB RAM]
            FE2[Vercel Function<br/>1 vCPU, 1GB RAM]
            FEN[...]
        end
        
        subgraph "API Tier"
            API1[API Instance<br/>4 vCPU, 8GB RAM]
            API2[API Instance<br/>4 vCPU, 8GB RAM]
            APIN[...]
        end
        
        subgraph "ML Tier"
            ML1[GPU Instance<br/>8 vCPU, 32GB RAM<br/>T4 GPU]
            ML2[GPU Instance<br/>8 vCPU, 32GB RAM<br/>T4 GPU]
        end
    end
    
    subgraph "Storage Resources"
        subgraph "Database"
            Primary[(Primary DB<br/>100GB SSD<br/>8 vCPU)]
            Replica1[(Replica 1<br/>100GB SSD<br/>4 vCPU)]
            Replica2[(Replica 2<br/>100GB SSD<br/>4 vCPU)]
        end
        
        subgraph "Cache"
            Redis1[Redis Primary<br/>16GB RAM]
            Redis2[Redis Replica<br/>16GB RAM]
        end
        
        subgraph "Object Storage"
            GCSBucket[GCS Bucket<br/>Multi-region<br/>10TB]
        end
    end
    
    subgraph "Network Resources"
        CDN[CDN<br/>100TB/month]
        LB[Load Balancer<br/>10Gbps]
        Firewall[Firewall<br/>100k rules/sec]
    end
    
    FE1 --> API1
    FE2 --> API2
    
    API1 --> ML1
    API2 --> ML2
    
    API1 --> Primary
    Primary --> Replica1
    Primary --> Replica2
    
    API1 --> Redis1
    Redis1 --> Redis2
    
    ML1 --> GCSBucket
    
    style ML1 fill:#f3e5f5
    style Primary fill:#e8f5e9
    style CDN fill:#fff3e0
```

---

*Document Version: 1.0*  
*Last Updated: 2025*  
*Status: Production Ready*

*Note: All diagrams are rendered using Mermaid.js and can be viewed in any Markdown viewer that supports Mermaid syntax.*