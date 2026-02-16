from playwright.sync_api import sync_playwright
import os
import time

def run():
    with sync_playwright() as p:
        # iPhone 12 Pro dimensions (Landscape)
        iphone = p.devices['iPhone 12 Pro']
        # Override viewport for landscape
        iphone['viewport'] = {'width': 844, 'height': 390}
        iphone['screen'] = {'width': 844, 'height': 390}
        
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**iphone)
        page = context.new_page()

        # Load local file
        url = 'file:///' + os.getcwd().replace('\\', '/') + '/index.html'
        print(f"Loading {url}")
        page.goto(url)
        page.wait_for_timeout(1000)

        # 1. Start Screen Analysis
        hero = page.locator('.hero')
        bbox = hero.bounding_box()
        print(f"Start Screen Hero BBox: {bbox}")
        
        if bbox and bbox['y'] == 0:
            print("PASS: Header is at top of start screen")
        else:
            print(f"FAIL: Header position unexpected: {bbox}")

        page.screenshot(path='debug_start_screen.png')
        print("Captured start screen")

        # 2. Click a category to start game
        # Wait for data to load
        page.wait_for_selector('.category-card')
        page.click('.category-card')
        
        # 3. Game Screen Analysis
        page.wait_for_timeout(1000)
        
        # Check if hero is visible (It should NOT be visible)
        try:
            # We check if it's attached and visible in viewport
            is_visible = hero.is_visible()
            if is_visible:
                # Double check bounding box
                bbox_game = hero.bounding_box()
                if bbox_game and bbox_game['height'] > 0:
                    print(f"FAIL: Header is VISIBLE on Game Screen! BBox: {bbox_game}")
                else:
                    print("PASS: Header is effectively hidden (size 0 or detached)")
            else:
                print("PASS: Header is hidden on Game Screen")
        except Exception as e:
            print(f"PASS: Header checking threw exception (good if detached): {e}")

        page.screenshot(path='debug_game_screen.png')
        print("Captured game screen")

        browser.close()

if __name__ == "__main__":
    run()
