#!/bin/bash
# Setup environment variables and virtual environments
# Usage: ./scripts/tools/setup-env.sh [dev|staging|prod]

set -e

ENV=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔧 Setting up environment for: $ENV"

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env.$ENV" ]; then
    echo "❌ Error: .env.$ENV file not found"
    echo "Available environments: dev, staging, prod"
    exit 1
fi

# Copy environment file
cp "$PROJECT_ROOT/.env.$ENV" "$PROJECT_ROOT/.env"
echo "✅ Environment file copied: .env.$ENV → .env"

# Setup Python virtual environment if it doesn't exist
if [ ! -d "$PROJECT_ROOT/.venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv "$PROJECT_ROOT/.venv"
    source "$PROJECT_ROOT/.venv/bin/activate"
    pip install --upgrade pip
    echo "✅ Python virtual environment created"
else
    echo "✅ Python virtual environment already exists"
fi

# Setup Node dependencies
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "📦 Installing Node dependencies..."
    cd "$PROJECT_ROOT"
    npm install
    echo "✅ Node dependencies installed"
fi

# Setup Flutter dependencies if mobile app exists
if [ -d "$PROJECT_ROOT/apps/mobile_app" ]; then
    echo "📱 Installing Flutter dependencies..."
    cd "$PROJECT_ROOT/apps/mobile_app"
    flutter pub get
    echo "✅ Flutter dependencies installed"
fi

# Setup Admin Web dependencies
if [ -d "$PROJECT_ROOT/apps/admin_web" ]; then
    echo "🌐 Installing Admin Web dependencies..."
    cd "$PROJECT_ROOT/apps/admin_web"
    npm install
    echo "✅ Admin Web dependencies installed"
fi

echo ""
echo "✨ Environment setup complete!"
echo "📝 Next steps:"
echo "   - Activate Python env: source .venv/bin/activate"
echo "   - Start dev servers: npm run dev (from respective app directories)"