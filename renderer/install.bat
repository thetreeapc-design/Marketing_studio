@echo off
echo 카드뉴스 렌더러 설치 중...
pip install -r renderer/requirements.txt
python -m playwright install chromium
echo 설치 완료!
pause
