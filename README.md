# OpenAI API Lab

A comprehensive tool for testing and debugging OpenAI-compatible APIs with a modern dark-themed interface.

## Features

- 🌙 **Dark Theme**: Beautiful dark interface optimized for developers
- 🔧 **API Configuration**: Easy setup for multiple API endpoints
- 💬 **Interactive Chat**: Real-time conversation with AI models
- 📊 **Performance Testing**: Benchmark and compare model performance
- 📈 **Usage Statistics**: Track token usage and costs
- 📁 **File Support**: Upload and process various file formats
- 💾 **Data Management**: Import/export configurations and chat history

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design with custom dark theme
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Code Quality**: ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd openai-api-lab
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
src/
├── components/          # React components
│   ├── common/         # Shared components
│   ├── config/         # API configuration components
│   ├── chat/           # Chat interface components
│   ├── testing/        # Performance testing components
│   └── stats/          # Statistics components
├── services/           # Business logic
│   ├── api/           # API clients
│   ├── storage/       # Data persistence
│   └── utils/         # Utility functions
├── stores/            # Zustand state management
├── types/             # TypeScript definitions
├── hooks/             # Custom React hooks
├── workers/           # Web Workers
└── App.tsx            # Main application component
```

## Development

This project uses:

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Ant Design** for UI components
- **CSS Custom Properties** for theming

### Code Style

The project follows these conventions:
- Use TypeScript for all new files
- Follow the ESLint configuration
- Use Prettier for consistent formatting
- Prefer functional components with hooks
- Use absolute imports with path aliases (@, @components, etc.)

## Deployment

### Static Hosting (Recommended)

Build the project and deploy the `dist` folder to any static hosting service:

```bash
npm run build
```

### Docker Deployment

```bash
# Build the Docker image
docker build -t openai-api-lab .

# Run the container
docker run -d -p 80:80 --name openai-api-lab openai-api-lab
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.