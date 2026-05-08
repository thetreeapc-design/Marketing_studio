#!/usr/bin/env python3
"""
열매나무 카드뉴스 렌더러
Usage: python renderer/render.py --input slides.json --output ./output
       python renderer/render.py --input '{"slides":[...], "topic":"사과 보관법"}' --output ./output
"""
import asyncio
import json
import sys
import os
import argparse
from pathlib import Path
from jinja2 import Template

TEMPLATE_PATH = Path(__file__).parent / "template.html"

# Unsplash Source (키 불필요)
UNSPLASH_KEYWORDS = {
    "사과": "apple,fruit,red",
    "딸기": "strawberry,fruit,fresh",
    "샤인머스캣": "grape,green,fruit",
    "포도": "grape,fruit,vineyard",
    "보관": "refrigerator,fresh,storage",
    "레시피": "cooking,food,recipe",
    "default": "food,fruit,fresh,korean"
}

def get_bg_url(topic: str) -> str:
    for kw, param in UNSPLASH_KEYWORDS.items():
        if kw in topic:
            return f"https://source.unsplash.com/1080x1350/?{param}"
    return f"https://source.unsplash.com/1080x1350/?{UNSPLASH_KEYWORDS['default']}"

async def render_slide(page, html_content: str, output_path: str):
    await page.set_content(html_content, wait_until="networkidle")
    await page.set_viewport_size({"width": 1080, "height": 1350})
    await page.screenshot(path=output_path, type="png")

async def render_all(slides_data: dict, output_dir: str):
    from playwright.async_api import async_playwright

    template_src = TEMPLATE_PATH.read_text(encoding="utf-8")
    template = Template(template_src)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    slides = slides_data.get("slides", [])
    topic = slides_data.get("topic", "과일")

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        for i, slide in enumerate(slides):
            order = slide.get("order", i + 1)
            heading = slide.get("heading", "")
            body = slide.get("body", "")
            cta = slide.get("cta", "")

            # 슬라이드 타입 결정
            slide_type = "cover" if order == 1 else "content"
            if order == len(slides) and cta:
                body = cta  # 마지막 슬라이드는 CTA

            # 배경 이미지 - 슬라이드별로 다른 키워드
            slide_topic = f"{topic} {heading}"
            bg_url = get_bg_url(slide_topic)

            html = template.render(
                slide_type=slide_type,
                badge="TIPS & TRICKS",
                heading=heading,
                body=body,
                bg_url=bg_url,
            )

            out_file = str(output_path / f"slide_{order:02d}.png")
            await render_slide(page, html, out_file)
            results.append(out_file)
            print(f"slide_{order:02d}.png 생성 완료", file=sys.stderr)

        await browser.close()

    return results

def main():
    parser = argparse.ArgumentParser(description="열매나무 카드뉴스 렌더러")
    parser.add_argument("--input", required=True, help="JSON 파일 경로 또는 JSON 문자열")
    parser.add_argument("--output", required=True, help="출력 디렉토리 경로")
    args = parser.parse_args()

    # JSON 파싱
    try:
        if os.path.isfile(args.input):
            data = json.loads(Path(args.input).read_text(encoding="utf-8"))
        else:
            data = json.loads(args.input)
    except json.JSONDecodeError as e:
        print(f"JSON 파싱 오류: {e}", file=sys.stderr)
        sys.exit(1)

    results = asyncio.run(render_all(data, args.output))
    # 결과 JSON 출력 (stdout)
    print(json.dumps({"files": results, "count": len(results)}))

if __name__ == "__main__":
    main()
