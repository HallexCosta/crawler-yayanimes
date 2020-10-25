import path from 'path'

export const base_url = 'https://yayanimes.net'
export const launch = {
  headless: false,
  executablePath: path.join('/', 'mnt', 'c', 'chrome-win', 'chrome.exe'),
  devtools: true,
  defaultViewport: { width: 1600, height: 800 }
}