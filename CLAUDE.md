# CLAUDE.md - AI Assistant Guidelines

## Build Commands
- Install: `npm install`
- Build: `npm run build`
- Lint: `npm run lint`
- Test (all): `npm test`
- Test (single): `npm test -- -t "test name"`
- TypeCheck: `npm run typecheck`

## Code Style Guidelines
- **Formatting**: Follow clean, consistent indentation and spacing
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/components
- **Imports**: Group imports (external libraries first, then internal modules)
- **Types**: Use TypeScript and explicit type annotations for function parameters/returns
- **Error Handling**: Use try/catch for async operations, include descriptive error messages
- **Documentation**: Add JSDoc comments for exported functions and complex logic
- **Testing**: Write unit tests for all new functionality

## Project Structure
This codebase implements an AI-powered CLI tool for software engineering tasks as specified in Specifications.md.

## Remember
Always maintain clean code, follow existing patterns when making changes, and ensure all tests pass before committing.