#!/bin/bash
cd /home/kavia/workspace/code-generation/quirkytunegenie-64286-74656fe0/quirkytunegenie_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

