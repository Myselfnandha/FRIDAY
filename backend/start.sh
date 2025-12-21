#!/bin/bash

# Start the health check/token server in diameter background
python server.py &

# Start the main Friday Agent
python agent.py start
