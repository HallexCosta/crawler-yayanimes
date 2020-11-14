import path from 'path'

export const base_url = 'https://yayanimes.net'
export const launch = {
  headless: false,
  executablePath: path.join('/', 'mnt', 'c', 'chrome-win', 'chrome.exe'),
  // executablePath: path.join('/', 'mnt', 'c', 'Users', 'halle', 'AppData', 'Local', 'Programs', 'Opera', 'launcher.exe'),
  devtools: true,
  args:['--no-sandbox'],
  defaultViewport: { width: 1600, height: 800 }
}