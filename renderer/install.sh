#!/bin/bash
pip install -r renderer/requirements.txt
python -m playwright install chromium
echo "설치 완료"
