# Axocom Backend - GraphQL Analytics API

A production-grade GraphQL API built with Node.js, TypeScript, and Apollo Server for electoral data analytics and management. Demonstrates enterprise-level system design patterns including schema-driven development, repository pattern architecture, JWT authentication, and advanced query optimization.

## System Architecture Overview

The backend implements a layered architecture with clear separation of concerns:

```
Client Layer (GraphQL Clients)
        ↓
GraphQL Middleware Layer
  - Authentication
  - Rate Limiting
  - Error Handling
        ↓
Apollo Server GraphQL Engine
        ↓
Business Logic Layer
  - Resolvers
  - Services
  - DataLoaders (N+1 Query Prevention)
        ↓
Data Access Layer
  - Repository Pattern
  - Database Models
        ↓
MySQL Database
```

## Core Technologies

- **Runtime**: Node.js 22 with ES Modules
- **Language**: TypeScript 5.9 (static typing, enhanced IDE support)
- **GraphQL Framework**: Apollo Server 5.3 with Express 5 integration
- **Database**: MySQL 8 with connection pooling
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Query Optimization**: DataLoader for batch query resolution
- **Rate Limiting**: Express rate-limit middleware
- **Testing**: Jest with TypeScript support and TestContainers for integration tests
- **Code Quality**: ESLint with TypeScript support

## Key Design Patterns

### 1. Repository Pattern with Result Types

All data access operations implement the Repository pattern for abstraction and testability:

```typescript
// Repositories encapsulate database operations
class CandidateRepository {
    async getById(id: number): Promise<Result<Candidate, RequestError>>;
    async getAllCandidates(): Promise<Result<Candidate[], RequestError>>;
}

// Result type provides strongly-typed error handling
// Usage:
const result = await candidateRepository.getById(1);
if (result.isOk()) {
    // result.value contains Candidate
} else {
    // result.error contains RequestError
}
```

This approach eliminates try-catch boilerplate and provides compile-time safety for error handling.

### 2. GraphQL Schema-Driven Development

Type definitions drive the entire API structure using GraphQL Schema Definition Language:

**Key Feature: Scalar Types**

- `DateTime`: ISO 8601 date-time serialization
- `JSON`: Arbitrary JSON value storage in MySQL

**Domain Models**:

- Candidate: Electoral candidates with biographical and professional data
- Voter: Voter registration and demographic information
- Election: Election metadata and scheduling
- Party: Political party information
- Constituency: Electoral geographic divisions
- ElectionCandidate: Join table for many-to-many relationships
- ElectionResult: Aggregated election outcomes
- User: Authentication and account management
- Flag: Flagged/reported content management

### 3. Query Optimization with DataLoader

Implements the DataLoader pattern to prevent N+1 query problems. Each GraphQL request creates fresh loaders per request for cache isolation:

```typescript
// Batch function resolves multiple IDs in a single query
async function batchCandidates(ids: readonly number[]): Promise<(Candidate | null)[]> {
    const [rows] = await db.execute<Candidate[]>(
        `SELECT * FROM candidates WHERE id IN (${ids.map(() => '?').join(',')})`,
        [...ids]
    );
    return ids.map((id) => map.get(id) ?? null);
}

// DataLoaders automatically batch and cache within request scope
export function createLoaders() {
    return {
        candidateLoader: new DataLoader(batchCandidates),
        partyLoader: new DataLoader(batchParties),
        electionCandidateLoader: new DataLoader(batchElectionCandidates),
        constituencyLoader: new DataLoader(batchConstituencies),
    };
}
```

This ensures GraphQL queries with nested relationships fetch data efficiently in a single database round-trip.

### 4. JWT-Based Authentication

Two-token authentication system for secure, stateless authentication:

```typescript
// Authentication Flow:
// 1. Login/Signup returns access_token + refresh_token
// 2. Access tokens: short-lived (36 weeks), used for API requests
// 3. Refresh tokens: long-lived (7 days), used to obtain new access tokens

export interface TokenData {
  id: number;
  is_admin: boolean;
  email?: string;
  name?: string;
}

// Mutations
type Mutation {
  signup(input: SignupInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
}

type AuthPayload {
  access_token: String!
  refresh_token: String!
  user: User!
}
```

**Authorization Enforcement**:

```typescript
// Optional middleware - sets req.user if valid token provided
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.substring(7);
    if (token) req.user = decodeAuthToken(token);
    next();
};

// GraphQL context enforces access control
export function requireAuth(context: GraphQLContext): TokenData {
    if (!context.user) {
        throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED', statusCode: 401 },
        });
    }
    return context.user;
}
```

## Database Architecture

**Connection Management**:

- MySQL connection pool with 50 connections
- Connection idle timeout: 60 seconds
- Keep-alive enabled for reliability
- Health checks on application startup

**Schema Design**:

Key entities and relationships:

| Table               | Relationships                                      | Purpose                                         |
| ------------------- | -------------------------------------------------- | ----------------------------------------------- |
| candidates          | Many-to-One: party, constituency                   | Electoral candidate details, profession, assets |
| voters              | Many-to-One: constituency                          | Voter registration and demographics             |
| elections           | One-to-Many: election_candidates, election_results | Election metadata and scheduling                |
| parties             | One-to-Many: candidates                            | Political party data                            |
| constituencies      | One-to-Many: candidates, voters                    | Electoral geographic divisions                  |
| election_candidates | Many-to-One: candidates, elections                 | Join table with performance metrics             |
| election_results    | Many-to-One: elections                             | Aggregated election outcomes                    |
| users               | Role-based access (admin flag)                     | User accounts and authentication                |

**JSON Storage Strategy**:

Complex, semi-structured data uses MySQL JSON columns:

```sql
CREATE TABLE candidates (
  education_history JSON,     -- Array of education records
  source_of_income JSON,      -- Employment/income sources
  contracts JSON,              -- Financial contracts
  social_profiles JSON,        -- Social media handles
  ...
);
```

## Middleware Architecture

### Rate Limiting

- 1000 requests per 15-minute window per IP
- Protects against abuse and DDoS attacks
- Configurable limits in production environments

### Authentication Flow

- Optional JWT verification on GraphQL endpoint
- Supports both authenticated and public queries
- Context injection of user data to resolvers

### Error Handling

- Centralized error response format
- Standardized error codes (5-digit system):
    - 1xxxx: Common errors
    - 2xxxx: Authentication & Authorization
    - 3xxxx: Candidate service
    - 4xxxx: Admin service
    - 5xxxx: Voter/Election service
- Request/response logging for debugging
- Production-safe error messages

### CORS Configuration

- Configurable origin validation
- Credentials (cookies) support enabled
- Used for cross-origin browser requests

## Resolver Implementation

Resolvers follow a consistent pattern combining type safety and error handling:

```typescript
export const candidateResolvers = {
    // Scalar implementations
    JSON: GraphQLJSON,
    DateTime: DateTimeResolver,

    Query: {
        candidate: async (
            _: any,
            { id }: { id: number },
            context: GraphQLContext
        ): Promise<Candidate | null> => {
            const result = await candidateRepository.getById(id);

            if (result.isErr()) {
                throw new GraphQLError('Candidate not found', {
                    extensions: { code: '30001' },
                });
            }

            return result.value;
        },
    },

    Mutation: {
        // Authorization-required mutations
        updateCandidate: async (
            _: any,
            { input }: { input: UpdateCandidateInput },
            context: GraphQLContext
        ) => {
            const user = requireAdmin(context); // Enforces admin access
            // ... mutation logic
        },
    },
};
```

## GraphQL Schema Structure

**Root Types**:

```graphql
type Query {
    # Single resource queries
    candidate(id: Int!): Candidate
    voter(id: Int!): Voter
    party(id: Int!): Party

    # Collection queries
    candidates: [Candidate!]!
    voters: [Voter!]!
    parties: [Party!]!

    # Current user query
    me: User
}

type Mutation {
    # Authentication
    signup(input: SignupInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    # Admin-only operations (requireAdmin)
    createCandidate(input: CreateCandidateInput!): Candidate!
    updateCandidate(id: Int!, input: UpdateCandidateInput!): Candidate!
    deleteCandidate(id: Int!): Boolean!
}
```

## Performance Optimizations

### 1. Connection Pooling

- Reuses MySQL connections across requests
- Eliminates connection overhead for each query

### 2. DataLoader Batching

- Collects field resolution requests within a single execution cycle
- Issues single batch query instead of N individual queries
- Automatic caching within request scope

### 3. Request Pagination (Future)

- Commented cursor-based pagination implementation for large datasets
- Prevents memory exhaustion from large result sets

### 4. Query Introspection Control

- Can be disabled in production to reduce surface area

## Testing Strategy

**Integration Testing with TestContainers**:

```typescript
// Spins up isolated MySQL container for each test
beforeAll(async () => {
    container = await new GenericContainer('mysql:latest')
        .withExposedPorts(3306)
        .withEnvironment({
            /* credentials */
        })
        .start();

    mockPool = mysql.createPool({
        /* config */
    });
    await setupDatabase();
});

describe('CandidateRepository', () => {
    it('getById returns Result with candidate on success', async () => {
        const result = await candidateRepository.getById(1);
        expect(result.isOk()).toBe(true);
        expect(result.value.id).toBe(1);
    });

    it('getById returns Result.err on non-existent id', async () => {
        const result = await candidateRepository.getById(999);
        expect(result.isErr()).toBe(true);
        expect(result.error).toBe(ERRORS.CANDIDATE_NOT_FOUND);
    });
});
```

**Coverage Requirements**:

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Project Structure

```
src/
├── index.ts                    # Apollo Server bootstrap and middleware setup
├── config/
│   └── env.ts                  # Environment variable validation and export
├── dataconfig/
│   └── db.ts                   # MySQL connection pool and health check
├── graphql/
│   ├── context.ts              # GraphQL context type and access control helpers
│   ├── loaders/
│   │   ├── graphql.loader.ts   # Schema and resolver loading/merging
│   │   └── dataloader.ts       # Batch loading for N+1 prevention
│   ├── resolvers/              # Query/Mutation implementations
│   │   ├── candidate.resolver.ts
│   │   ├── voter.resolver.ts
│   │   ├── auth.resolver.ts
│   │   ├── party.resolver.ts
│   │   ├── election.resolver.ts
│   │   ├── constituency.resolver.ts
│   │   └── ...
│   └── schema/                 # GraphQL type definitions
│       ├── auth.schema.gql
│       ├── candidate.schema.gql
│       ├── voter.schema.gql
│       └── ...
├── middleware/
│   ├── auth.middleware.ts       # JWT verification and optional auth
│   ├── error.middleware.ts      # Error response formatting and 404 handler
│   └── ratelimit.middleware.ts  # Express rate limiter configuration
├── models/                     # TypeScript interfaces and table schemas
│   ├── candidate.model.ts
│   ├── voter.model.ts
│   └── ...
├── repositories/               # Data access layer with Result pattern
│   ├── candidate.repository.ts
│   ├── candidate.repository.test.ts
│   └── ...
├── utils/
│   ├── jwt.ts                   # Token creation and verification
│   ├── error.ts                 # RequestError class and error definitions
│   ├── response.ts              # Response formatting utilities
│   ├── logger.ts                # Structured logging
│   └── toGraphQLError.ts        # Error conversion utilities
└── tests/
    ├── setup.ts                 # Jest test environment setup
    └── integration/             # Integration test suites
```

## Setup and Development

### Prerequisites

- Node.js 22+
- MySQL 8+
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/parjanya-rajput/axocom_backend.git
cd axocom_backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with database credentials, JWT secret, CORS origin

# Start development server
npm run dev
```

### Docker Compose Setup

Complete development environment with database initialization:

```bash
docker-compose up --build
```

**Services**:

- `mysql`: MySQL 8 database on port 3307
- `app`: Node.js backend on port 3000

GraphQL endpoint: `http://localhost:3000/graphql`

Health check: `http://localhost:3000/health`

### Available Scripts

```bash
npm run dev                # Start with hot reload (tsx watch)
npm run build              # Compile TypeScript to JavaScript
npm start                  # Run compiled JavaScript
npm test                   # Run Jest test suite
npm run lint               # Run ESLint on src directory
```

## Deployment

### Azure VM Deployment with PM2

The application is deployed on Azure via a PM2 process manager instance, ensuring high availability and automatic process recovery.

**Deployment Infrastructure**:

- **Platform**: Microsoft Azure Virtual Machine
- **Process Manager**: PM2 (Node.js process manager)
- **Runtime**: Node.js 22 LTS
- **Environment**: Production

**PM2 Configuration and Setup**:

PM2 provides process management, monitoring, and automatic restart capabilities:

```bash
# Install PM2 globally
npm install -g pm2

# Build the application
npm run build

# Start application with PM2
pm2 start dist/index.js --name "axocom-backend" --instances max --exec-mode cluster

# Configure PM2 startup script to auto-restart on system reboot
pm2 startup
pm2 save

# View running processes
pm2 list

# Monitor in real-time
pm2 monit

# View logs
pm2 logs axocom-backend

# Restart application
pm2 restart axocom-backend

# Remove and stop process
pm2 delete axocom-backend
```

**Azure Deployment Steps**:

1. **Provision Azure Virtual Machine**:
    - Create Ubuntu 22.04 VM in Azure
    - Configure network security groups to allow ports 3000 (GraphQL) and 22 (SSH)
    - Attach Azure MySQL Database instance

2. **SSH into VM and Setup**:

    ```bash
    ssh azureuser@your-vm-ip

    # Install Node.js 22
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Install PM2
    sudo npm install -g pm2

    # Clone repository
    git clone https://github.com/parjanya-rajput/axocom_backend.git
    cd axocom_backend

    # Install dependencies
    npm install
    ```

3. **Configure Environment**:

    ```bash
    # Create .env file with Azure-specific configuration
    cat > .env << EOF
    PORT=3000
    NODE_ENV=production
    DB_HOST=your-mysql-server.mysql.database.azure.com
    DB_USER=username@your-mysql-server
    DB_PASSWORD=your-secure-password
    DB_NAME=axocom
    JWT_SECRET=your-production-jwt-secret
    CORS_ORIGIN=https://your-frontend-domain.com
    EOF
    ```

4. **Build and Start with PM2**:

    ```bash
    npm run build
    pm2 start ecosystem.config.js
    pm2 startup
    pm2 save
    ```

5. **Setup Reverse Proxy (Nginx)**:

    ```bash
    # Install Nginx
    sudo apt-get install -y nginx

    # Configure for GraphQL API
    sudo tee /etc/nginx/sites-available/axocom-backend > /dev/null <<EOF
    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_cache_bypass $http_upgrade;
        }
    }
    EOF

    # Enable site
    sudo ln -s /etc/nginx/sites-available/axocom-backend /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

6. **SSL Certificate (Let's Encrypt)**:
    ```bash
    sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

**PM2 Monitoring and Management**:

- **Health Monitoring**: PM2 automatically restarts crashed processes
- **Cluster Mode**: Utilizes all CPU cores for high availability
- **Memory Limits**: Automatic restart if memory exceeds 500MB
- **Log Aggregation**: Centralized logs in `logs/` directory
- **Auto-Startup**: Process automatically restarts on VM reboot

**Updating Application on Azure**:

```bash
# SSH into VM
ssh azureuser@your-vm-ip

# Pull latest code
cd axocom_backend
git pull origin main

# Install any new dependencies
npm install

# Rebuild TypeScript
npm run build

# Restart PM2 process
pm2 restart axocom-backend

# Verify deployment
pm2 status
```

**Azure-Specific Considerations**:

- **Database Connection**: Use Azure MySQL Server endpoint with SSL requirement
- **Networking**: Configure NGINX rules to allow only necessary ports
- **Scaling**: Clone VM and load balance with Azure Load Balancer for horizontal scaling

## API Endpoints

- **GraphQL Endpoint**: `/graphql` (POST)
    - Introspectable schema for exploration
    - Mutations require valid JWT token
    - Queries support both authenticated and public access

- **Health Check**: `/health` (GET)
    - Returns `{ status: 'OK', timestamp: '...' }`
    - Used for load balancer health monitoring

- **Root**: `/` (GET)
    - Returns API status

## Configuration

Environment variables required:

```bash
# Server
PORT=3000
NODE_ENV=development|production
SERVER_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_USER=user
DB_PASSWORD=password
DB_NAME=axocom
DB_PORT=3306

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=36W

# CORS
CORS_ORIGIN=http://localhost:5173

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
FROM_EMAIL=noreply@example.com

# Azure Storage (optional)
AZURE_STORAGE_CONNECTION_STRING=...
CONTAINER_NAME=images
```

## Security Considerations

1. **Authentication**: JWT tokens with bcrypt password hashing
2. **Authorization**: Role-based access control (admin flag in token)
3. **Rate Limiting**: 1000 requests per 15-minute window
4. **Input Validation**: GraphQL schema validation and type checking
5. **Error Handling**: Production-safe error messages without stack traces
6. **CORS**: Configurable origin validation
7. **Connection Security**: Connection pooling with timeout protection

## Error Response Format

All errors follow a standardized format:

```json
{
    "success": false,
    "error": {
        "code": 20001,
        "message": "No authentication token provided"
    }
}
```

Error codes follow the 5-digit convention with domain-specific ranges for easy debugging and monitoring.

## Performance Metrics

- **Query Batching**: 10-100x reduction in database queries for related data
- **Connection Pooling**: Connection reuse across requests
- **Rate Limiting**: Protection against abuse (1000 req/15 min)
- **Payload Limits**: 10MB request body/URL form data limits

## Future Enhancements

- Query depth limiting to prevent expensive GraphQL queries
- Cursor-based pagination for large result sets
- Separate refresh token secret for added security
- GraphQL federation for microservices architecture
- Distributed caching layer (Redis)
- Advanced monitoring and metrics collection

## License

ISC

## Repository

[GitHub](https://github.com/parjanya-rajput/axocom_backend)
