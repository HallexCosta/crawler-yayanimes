import path from 'path'

export const base_url = 'https://yayanimes.net'
export const launch = {
  headless: true,
  executablePath: path.join('/', 'mnt', 'c', 'chrome-win', 'chrome.exe'),
  devtools: false,
  defaultViewport: { width: 1600, height: 800 }
}