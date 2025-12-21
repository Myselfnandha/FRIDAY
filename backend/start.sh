#!/bin/bash

# Start the health check/token server in diameter background
python server.py &

# Start the main Friday Agent
# Start the main Friday Agent with single worker (dev mode implies simplified runner)
python agent.py dev
