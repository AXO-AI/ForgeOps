#!/bin/bash
echo "Starting ForgeOps..."
echo ""

# Start backend
cd "$(dirname "$0")/backend"
if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi
echo "Starting backend on http://localhost:3001"
node src/index.js &
BACKEND_PID=$!

# Start frontend
cd "$(dirname "$0")/frontend"
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi
echo "Starting frontend on http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "ForgeOps is running:"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
