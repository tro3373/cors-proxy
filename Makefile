.PHONY: help install dev build deploy clean test lint format check status

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Development
install: ## Install dependencies
	npm install

dev: ## Start development server
	vercel dev

build: ## Build the project (no build step needed for this project)
	@echo "No build step required for this project"

# Deployment
deploy: ## Deploy to Vercel
	vercel --prod

deploy-preview: ## Deploy preview to Vercel
	vercel

# Testing and Quality
test: ## Run tests (placeholder for future tests)
	@echo "No tests defined yet"

lint: ## Run linter (placeholder for future linting)
	@echo "No linter configured yet"

format: ## Format code (placeholder for future formatting)
	@echo "No formatter configured yet"

check: lint test ## Run all checks

# Utility commands
clean: ## Clean build artifacts and dependencies
	rm -rf node_modules/
	rm -rf .vercel/
	rm -f npm-debug.log*
	rm -f yarn-debug.log*
	rm -f yarn-error.log*

status: ## Show git and deployment status
	@echo "=== Git Status ==="
	git status --short
	@echo ""
	@echo "=== Vercel Status ==="
	vercel ls 2>/dev/null || echo "Not logged in to Vercel or no deployments found"

# Local testing
test-local: ## Test the proxy locally with a sample request
	@echo "Starting local test..."
	@echo "Make sure 'make dev' is running in another terminal"
	@echo "Testing with httpbin.org..."
	curl -s "http://localhost:3000/api/proxy?url=https://httpbin.org/json" | head -20

# Setup commands
setup: install ## Initial project setup
	@echo "Setting up CORS Proxy project..."
	@echo "1. Install Vercel CLI if not installed:"
	@echo "   npm install -g vercel"
	@echo ""
	@echo "2. Login to Vercel:"
	@echo "   vercel login"
	@echo ""
	@echo "3. Start development:"
	@echo "   make dev"
	@echo ""
	@echo "4. Deploy to production:"
	@echo "   make deploy"

# Git helpers
commit: ## Add all files and commit with message (usage: make commit MESSAGE="your message")
ifndef MESSAGE
	@echo "Error: MESSAGE is required. Usage: make commit MESSAGE=\"your commit message\""
	@exit 1
endif
	git add .
	git commit -m "$(MESSAGE)"

push: ## Push to remote repository
	git push origin main

# Quick deployment workflow
ship: check ## Run checks and deploy to production
	@echo "Running pre-deployment checks..."
	make check
	@echo "Deploying to production..."
	make deploy
	@echo "Deployment complete!"

# Environment info
info: ## Show environment information
	@echo "=== Environment Information ==="
	@echo "Node version: $$(node --version 2>/dev/null || echo 'Not installed')"
	@echo "NPM version: $$(npm --version 2>/dev/null || echo 'Not installed')"
	@echo "Vercel CLI version: $$(vercel --version 2>/dev/null || echo 'Not installed')"
	@echo "Git version: $$(git --version 2>/dev/null || echo 'Not installed')"
	@echo ""
	@echo "=== Project Information ==="
	@echo "Project directory: $$(pwd)"
	@echo "Package.json exists: $$(test -f package.json && echo 'Yes' || echo 'No')"
	@echo "Vercel.json exists: $$(test -f vercel.json && echo 'Yes' || echo 'No')"
	@echo "API endpoint exists: $$(test -f api/proxy.js && echo 'Yes' || echo 'No')"

# Logs
logs: ## Show Vercel deployment logs
	vercel logs