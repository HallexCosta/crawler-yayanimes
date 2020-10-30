import puppeteer, { Page } from 'puppeteer'

import * as config from '../puppeteer.config'
import { Utils } from './utils'

import { createServer, host, port } from './proxy'
 
type Episodie = {
  title: string
  thumbnail: string
  quality_streaming: string
}

type Anime = Omit<AnimeTextData, 'episodies'> & {
  episodies: (Episodie & Streaming)[]
}

type AnimeTextData = {
  name: string
  image_url: string
  genre: string
  status: string
  studio: string
  sinopse: string
  release_data: number
  rating: number
  episodies: Episodie[]
}

type Streaming = {
  url: string
}

type PackageLevelScope = {
  log: string
}

const PackageLevelScope: PackageLevelScope = {} as PackageLevelScope

async function gettingAnimeTextData(page: Page): Promise<AnimeTextData> {
  return await page.evaluate(async function () {
    const verifyNotValidAnime = () => {  
      const pageNotFound = (document.querySelector<HTMLHeadingElement>('h3')?.innerText)
      const episodies = [...document.querySelectorAll('.contentBox ul li > div.box-episodio3')]

      //Page not found
      if (pageNotFound === 'PAGINA NÃO ENCONTRADA') {
        console.log(`Error Message: ${pageNotFound}`);
        return
      }

      // Episodies found
      if (!(episodies.length > 0)) {
        console.log('Episodies Amount: ', episodies.length)
        return
      }
    }

    verifyNotValidAnime()

    const title = document.querySelector('span.color-change') as HTMLSpanElement
    const image = document.querySelector('#capaAnime > img') as HTMLImageElement
    const about = document.querySelectorAll<HTMLTableRowElement>('table > tbody > tr')
    const sinopse = document.querySelectorAll('.single div')
    const rating = document.querySelector('#rmp-rating')
    const episodies = [...document.querySelectorAll('.contentBox ul li > div.box-episodio3')]

    const animeTextData = {
      name: title.innerHTML.trim(),
      image_url: image.src.trim(),
      studio: about[0].children[1].innerHTML.trim(),
      genre: about[1].children[1].innerHTML.trim(),
      status: about[2].children[1].innerHTML.trim(),
      release_data: Number(about[3].children[1].innerHTML.trim()),
      rating: Number(rating?.innerHTML.trim() as string),
      sinopse: sinopse[13].innerHTML.trim(),
      episodies: episodies.map<Episodie>(episodie => ({
        title: episodie.children[0].children[0].innerHTML.trim(),
        thumbnail: episodie.children[0].children[1].children[0].attributes[0].nodeValue as string,
        quality_streaming: episodie.children[0].children[1].children[1].textContent as string
      }))
    }

    console.log(`${animeTextData.name} - Detail`, animeTextData)

    return animeTextData
  })
}

async function gettingStreamings(page: Page, anime: { name: string, data: AnimeTextData }): Promise<string[]> {
  const streamings: string[] = []

  for (let streamingURLCount = 0; streamingURLCount < anime.data.episodies.length; streamingURLCount++) {
    console.log(`> Episodie - ${streamingURLCount+1}`)

    await page.goto(`${config.base_url}/${anime.name}-episodio-${String(streamingURLCount+1)}`, {
      timeout: 0,
      waitUntil: 'load'
    })
    
    // Getting Animes with Streamings URL
    const streaming: string = await page.evaluate(async function() {
      const streamingURL = document.querySelector('video') as HTMLVideoElement

      const streaming = streamingURL.src

      return streaming
    })

    streamings.push(streaming)
  }

  return streamings
}

async function gettingAnime(page: Page, animesNames: string[]): Promise<Anime[]> {
  const animes: Anime[] = []

  for (let index = 0; index < animesNames.length; index++) {
    await page.goto(`${config.base_url}/${animesNames[index]}`, {
      timeout: 0,
      waitUntil: 'networkidle2'
    })

    // Getting Anime Text Data
    const animeTextData: AnimeTextData = await gettingAnimeTextData(page)


    // Getting Streamings URL
    console.log('> Getting Streamings URL')
    const streamings: string[] = await gettingStreamings(page, {
      name: animesNames[index],
      data: animeTextData
    })    
    
    console.log('Streaming: ', streamings)

    const anime: Anime = {
      ...animeTextData,
      episodies: animeTextData.episodies.map(({ title, thumbnail, quality_streaming }: Episodie, index) => ({
        title,
        thumbnail,
        quality_streaming,
        url: streamings[0],
      }))
    }

    if (anime) {
      console.log('', '', '', `> ${index+1}) ${animesNames[index]} - Getting Successfully`)
      PackageLevelScope.log += `    > ${index+1}) ${animesNames[index]} - Getting Successfully\n`
      animes.push(anime)
    } else {
      PackageLevelScope.log += `    > ${index+1}) ${animesNames[index]} - Incomplete Episodies or Not Found\n`
      console.log('', '', '', `> ${index+1}) ${animesNames[index]} - Incomplete Episodies or Not Found`)
    }
  }

  return animes
}

function normalize(animesNames: string[]) {
  return animesNames.map(animeName => animeName.trim().toLowerCase())
}

async function gettingAnimesRouteParam(page: Page): Promise<string[]> {
  await page.goto(`${config.base_url}/lista-de-animes`, {
    timeout: 0,
    waitUntil: 'networkidle2'
  })

  return await page.evaluate(function() {
    const animesNamesAnchor: HTMLAnchorElement[] = [
      ...document
        .querySelectorAll<HTMLAnchorElement>('.aba ul > li > a')
    ]

    const animesURL = animesNamesAnchor.map(animeName => animeName.href)
    const animesParams = animesURL.map(animeURL => animeURL.split('/')[3])

    return animesParams
  })
}

(async function () {
  try { 
    // const wsChromiumEndpoinURL = 'ws://192.168.2.101:9222/devtools/browser/cacc3ec8-e2f7-4407-b2b7-ebe48534577d'

    const customWSEndpoint = await createServer((await (puppeteer
      .launch({
        args: [
          `--remote-debugging-port=9222`,
          `--no-sandbox`,
          `--disable-setuid-sandbox`,
          `--ignore-certificate-errors`,
          '--disable-gpu'
        ]
      }))).wsEndpoint(), host, port)

    const browser = await puppeteer.connect({
      browserWSEndpoint: customWSEndpoint
    })

    const page = await browser.newPage()

    //Getting Animes Routes
    console.log()
    console.log('> Getting Animes Routes')
    const animesRouteParam = await gettingAnimesRouteParam(page)

    // Getting Animes Data
    console.log('> Getting Animes Data')
    const animes: Anime[] = await gettingAnime(page, normalize(['charlotte', 'darling-in-the-franxx']))
    console.log()
    console.log('Animes', animes)
    console.log()

    Utils.createJSONFile({
      filename: 'database',
      data: animes
    })

    Utils.createLogFile({
      filename: 'console',
      contentText: PackageLevelScope.log
    })

    console.log()
    console.log('> Finish Crawler Script!')

    // await page.close()
    // await browser.close()
  } catch(e) {
    console.log(e)
  } 
})()

console.log('> Running App')