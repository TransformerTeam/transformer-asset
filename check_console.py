
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)
driver.get('http://localhost:8888/oil_report.html?serial=3905095')

import time
time.sleep(2)

print('Console logs:')
for entry in driver.get_log('browser'):
    print(entry)

driver.quit()
