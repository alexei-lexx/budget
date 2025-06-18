# Backend

GraphQL API server for the Personal Finance Tracker application.

## Development Setup

### Prerequisites

- Node.js 22+
- Docker and Docker Compose
- npm

### Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up development database:

```bash
npm run db:setup    # Starts DynamoDB Local and creates tables
```

3. Start the development server:

```bash
npm run dev         # Starts server on http://localhost:4000
```

## Database (Development)

Uses DynamoDB Local running in Docker with a named volume for data persistence.

### Database commands:

```bash
npm run db:start    # Start DynamoDB Local + Admin UI
npm run db:stop     # Stop database services
npm run db:setup    # Start database and create tables
```

### Database access:

- **DynamoDB Local**: http://localhost:8000
- **Admin UI**: http://localhost:8001

## Available Scripts

### Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production deployment
- `npm run compile` - Compile TypeScript

### Code Quality

- `npm run lint` - Run ESLint checks
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run prettier` - Check code formatting
- `npm run prettier:fix` - Fix code formatting

### Database

- `npm run db:start` - Start DynamoDB Local + Admin UI
- `npm run db:stop` - Stop database services
- `npm run db:setup` - Start database and create tables

## Architecture

- **Apollo Server** - GraphQL server
- **TypeScript** - Type-safe JavaScript
- **DynamoDB** - NoSQL database (Local for dev, AWS for prod)
- **AWS Lambda** - Serverless deployment target
