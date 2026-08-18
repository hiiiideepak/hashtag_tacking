#!/bin/bash

# Test Script for Hashtag Tracking Service API

set -e

BASE_URL=${1:-"http://localhost:3000"}
HASHTAG=${2:-"matcha"}

echo "=========================================="
echo "Hashtag Tracking Service - API Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing against: ${BASE_URL}${NC}"
echo ""

# Test 1: Health Check
echo -e "${BLUE}1. Testing Health Check${NC}"
curl -s "${BASE_URL}/health" | jq .
echo ""

# Test 2: Get All Media (Paginated)
echo -e "${BLUE}2. Testing Get All Media (Paginated)${NC}"
echo "   Fetching page 1 with limit 5..."
curl -s "${BASE_URL}/hashtags?page=1&limit=5" | jq .
echo ""

# Test 3: Trigger Top Media Sync
echo -e "${BLUE}3. Testing Top Media Sync Trigger${NC}"
echo "   Enqueueing top media sync for hashtag: ${HASHTAG}"
curl -s -X POST "${BASE_URL}/sync/top" \
  -H "Content-Type: application/json" \
  -d "{\"hashtag\": \"${HASHTAG}\"}" | jq .
echo ""

# Test 4: Check Health Again (to see queue length)
echo -e "${BLUE}4. Checking Health (Queue Status)${NC}"
curl -s "${BASE_URL}/health" | jq .
echo ""

# Test 5: Wait and Get Media Again
echo -e "${BLUE}5. Waiting 5 seconds for sync to process...${NC}"
sleep 5
echo -e "${BLUE}   Fetching media again...${NC}"
curl -s "${BASE_URL}/hashtags?page=1&limit=10" | jq .
echo ""

echo -e "${GREEN}=========================================="
echo "API Tests Completed"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "- Check the server logs for sync progress"
echo "- Query database: psql hashtag_tracking"
echo "- Verify media storage: ls -la ./storage/media/"
